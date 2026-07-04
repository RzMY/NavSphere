import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { commitFile, getFileContent } from '@/lib/github'
import type { ResourceMetadata } from '@/types/resource-metadata'
import { uploadAssetToBlob } from '@/lib/blob-storage'

export const runtime = 'edge'

const MAX_ASSET_SIZE_BYTES = 3 * 1024 * 1024

export async function GET() {
    try {
        const data = normalizeResourceMetadata(
            await getFileContent('src/navsphere/content/resource-metadata.json')
        )
        return NextResponse.json(data)
    } catch (error) {
        console.error('Failed to fetch resource metadata:', error)
        return NextResponse.json({ error: 'Failed to fetch resource metadata' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.accessToken) {
            return new Response('Unauthorized', { status: 401 });
        }

        const { image, folder = 'assets', prefix = 'img' } = await request.json(); // Get the Base64 image, folder and prefix
        const { base64Data, extension, contentType } = parseBase64Image(image);
        const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)); // Convert Base64 to binary

        if (binaryData.byteLength > MAX_ASSET_SIZE_BYTES) {
            return NextResponse.json(
                { error: 'Image size must be 3MB or less' },
                { status: 413 }
            );
        }

        // Upload binary asset to Vercel Blob and keep the returned Blob URL in metadata.
        const uploadResult = await uploadAssetToBlob(binaryData, {
            folder,
            prefix,
            extension,
            contentType,
        });
        const imageUrl = uploadResult.url;
        const assetHash = uploadResult.etag || uploadResult.pathname;

        // Handle metadata
        const metadata = normalizeResourceMetadata(
            await getFileContent('src/navsphere/content/resource-metadata.json')
        );
        metadata.metadata.unshift({
            commit: assetHash,
            hash: assetHash,
            path: imageUrl
        });
        metadata.generated = new Date().toISOString();

        await commitFile(
            'src/navsphere/content/resource-metadata.json',
            JSON.stringify(metadata, null, 2),
            'Update resource metadata',
            session.user.accessToken
        );

        return NextResponse.json({ success: true, imageUrl });
    } catch (error) {
        console.error('Failed to save resource metadata:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to save resource metadata' },
            { status: 500 }
        );
    }
}

function parseBase64Image(image: string): { base64Data: string; extension: string; contentType: string } {
    const match = image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);

    if (!match) {
        throw new Error('Invalid image data');
    }

    const contentType = match[1];
    const base64Data = match[2];
    const subtype = contentType.split('/')[1].toLowerCase();
    const extension = getImageExtension(subtype);

    return { base64Data, extension, contentType };
}

function getImageExtension(subtype: string) {
    switch (subtype) {
        case 'jpeg':
            return 'jpg';
        case 'svg+xml':
            return 'svg';
        case 'x-icon':
        case 'vnd.microsoft.icon':
            return 'ico';
        default:
            return subtype;
    }
}

function normalizeResourceMetadata(data: unknown): ResourceMetadata {
    const fallback: ResourceMetadata = {
        commit: '',
        generated: new Date().toISOString(),
        metadata: [],
    };

    if (!data || typeof data !== 'object') {
        return fallback;
    }

    const value = data as Partial<ResourceMetadata>;

    if (!Array.isArray(value.metadata)) {
        return fallback;
    }

    return {
        commit: typeof value.commit === 'string' ? value.commit : '',
        generated: typeof value.generated === 'string' ? value.generated : fallback.generated,
        metadata: value.metadata.filter(item =>
            item &&
            typeof item.commit === 'string' &&
            typeof item.hash === 'string' &&
            typeof item.path === 'string'
        ),
    };
}

export async function DELETE(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.accessToken) {
            return new Response('Unauthorized', { status: 401 });
        }

        const { resourceHashes } = await request.json();

        if (!Array.isArray(resourceHashes) || resourceHashes.length === 0) {
            return NextResponse.json({ error: 'Invalid resource hashes' }, { status: 400 });
        }

        // 获取当前的资源元数据
        const metadata = normalizeResourceMetadata(
            await getFileContent('src/navsphere/content/resource-metadata.json')
        );

        // 过滤掉要删除的资源
        const originalCount = metadata.metadata.length;
        metadata.metadata = metadata.metadata.filter(item => !resourceHashes.includes(item.hash));
        const deletedCount = originalCount - metadata.metadata.length;
        metadata.generated = new Date().toISOString();

        // 更新资源元数据文件
        await commitFile(
            'src/navsphere/content/resource-metadata.json',
            JSON.stringify(metadata, null, 2),
            `Delete ${deletedCount} resource(s)`,
            session.user.accessToken
        );

        // Only remove metadata references; uploaded Blob objects are not deleted here.

        return NextResponse.json({
            success: true,
            deletedCount,
            message: `成功删除 ${deletedCount} 个资源`
        });
    } catch (error) {
        console.error('Failed to delete resources:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to delete resources' },
            { status: 500 }
        );
    }
}
