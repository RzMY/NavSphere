import { Metadata } from 'next/types'
import { Suspense } from 'react'
import { UnlockForm } from './unlock-form'

export const metadata: Metadata = {
  title: '访问验证',
}

export default function UnlockPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <Suspense fallback={null}>
        <UnlockForm />
      </Suspense>
    </main>
  )
}
