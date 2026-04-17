'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface SheetRow {
  en: string
  status?: string
  used?: number
}

export default function Dashboard() {
  const [rows, setRows] = useState<SheetRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [playlistCount, setPlaylistCount] = useState(0)

  useEffect(() => {
    Promise.all([
      fetch('/api/sheet').then((r) => r.json()),
      fetch('/api/playlists').then((r) => r.json()),
    ])
      .then(([sheetRes, playlistsRes]) => {
        if (sheetRes.error) setError(sheetRes.error)
        else setRows(sheetRes.data || [])
        setPlaylistCount((playlistsRes.data || []).length)
        setLoading(false)
      })
      .catch((e) => {
        setError(String(e))
        setLoading(false)
      })
  }, [])

  const valid = rows.filter((r) => r.en?.trim())
  const total = valid.length
  const learned = valid.filter(
    (r) => String(r.status || '').trim().toUpperCase() === 'YES'
  ).length
  const newCount = valid.filter(
    (r) => String(r.status || '').trim().toUpperCase() === 'NO'
  ).length
  const totalPractice = valid.reduce((sum, r) => sum + (Number(r.used) || 0), 0)
  const progress = total > 0 ? Math.round((learned / total) * 100) : 0

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1 text-foreground">Vocab Practice</h1>
      <p className="text-sm text-muted mb-6">
        Google Sheet is the source of truth. Pick random N and listen.
      </p>

      {error && (
        <div className="bg-card border border-danger rounded-xl p-3 mb-4 text-sm text-danger">
          {error}{' '}
          <Link href="/playlists" className="underline">
            Set script URL
          </Link>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse">
              <div className="h-6 bg-row-alt rounded w-12 mb-2" />
              <div className="h-3 bg-row-alt rounded w-16" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="bg-card border border-border rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{total}</p>
              <p className="text-xs text-muted mt-1">Total vocab</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{learned}</p>
              <p className="text-xs text-muted mt-1">Learned</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{newCount}</p>
              <p className="text-xs text-muted mt-1">New (H=NO)</p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 mb-3">
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-xs text-muted uppercase tracking-wide">Total practice</p>
                <p className="text-3xl font-bold text-foreground">{totalPractice}</p>
              </div>
              <p className="text-xs text-muted">
                ≈ {total > 0 ? (totalPractice / total).toFixed(1) : '0'}× per word
              </p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium text-foreground">Mastery</span>
              <span className="text-muted">{progress}%</span>
            </div>
            <div className="h-2 bg-row-alt rounded-full overflow-hidden">
              <div
                className="h-full bg-foreground rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/playlists"
          className="bg-card border border-border rounded-xl p-4 hover:border-foreground transition"
        >
          <p className="font-semibold text-sm text-foreground">Playlists</p>
          <p className="text-xs text-muted mt-0.5">Pick & listen · {playlistCount}</p>
        </Link>
        <Link
          href="/player"
          className="bg-card border border-border rounded-xl p-4 hover:border-foreground transition"
        >
          <p className="font-semibold text-sm text-foreground">Player</p>
          <p className="text-xs text-muted mt-0.5">Listen & confirm</p>
        </Link>
      </div>
    </div>
  )
}
