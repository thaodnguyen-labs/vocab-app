'use client'

import { useState } from 'react'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      window.location.href = '/'
    } else {
      setError('Wrong password')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="bg-card rounded-2xl shadow-lg p-8 max-w-sm w-full border border-border">
        <h1 className="text-2xl font-bold text-center mb-1 text-foreground">Vocab Practice</h1>
        <p className="text-sm text-muted text-center mb-6">Enter password to continue</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:border-primary-dark text-foreground bg-near-white"
          />

          {error && <p className="text-sm text-danger text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-3 bg-primary-dark text-white rounded-lg font-medium hover:bg-primary disabled:opacity-50 transition"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-xs text-muted text-center mt-6">
          You will be remembered on this device for 1 year
        </p>
      </div>
    </div>
  )
}
