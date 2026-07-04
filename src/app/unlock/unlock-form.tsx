'use client'

import { FormEvent, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { LockKeyhole } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function getSafeNextPath(nextPath: string | null) {
  if (!nextPath || !nextPath.startsWith('/') || nextPath.startsWith('//')) {
    return '/'
  }

  return nextPath
}

export function UnlockForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = useMemo(() => getSafeNextPath(searchParams.get('next')), [searchParams])
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/home-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        setError(data?.error || '密码错误')
        return
      }

      router.replace(nextPath)
      router.refresh()
    } catch {
      setError('验证失败，请稍后重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
      <div className="flex items-center gap-2 text-lg font-semibold">
        <LockKeyhole className="h-5 w-5" />
        <span>访问验证</span>
      </div>
      <Input
        autoFocus
        type="password"
        autoComplete="current-password"
        placeholder="请输入访问密码"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? '验证中...' : '进入'}
      </Button>
    </form>
  )
}
