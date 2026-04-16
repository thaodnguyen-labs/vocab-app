'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Stats {
  total: number
  learned: number
  playlists: number
}

interface RecentVocab {
  id: number
  en: string
  vn: string
  status: string
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({ total: 0, learned: 0, playlists: 0 })
  const [recentVocab, setRecentVocab] = useState<RecentVocab[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/stats')
      .then((r) => r.json())
      .then((d) => {
        if (d.stats) setStats(d.stats)
        if (d.recent) setRecentVocab(d.recent)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const progress = stats.total > 0 ? Math.round((stats.learned / stats.total) * 100) : 0

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1 text-foreground">Vocab Practice</h1>
      <p className="text-sm text-muted mb-6">English vocabulary dashboard</p>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{loading ? '—' : stats.total}</p>
          <p className="text-xs text-muted mt-1">Total</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{loading ? '—' : stats.learned}</p>
          <p className="text-xs text-muted mt-1">Learned</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">
            {loading ? '—' : stats.playlists}
          </p>
          <p className="text-xs text-muted mt-1">Playlists</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="font-medium text-foreground">Progress</span>
          <span className="text-muted">{progress}%</span>
        </div>
        <div className="h-2 bg-row-alt rounded-full overflow-hidden">
          <div
            className="h-full bg-foreground rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <Link
          href="/vocab"
          className="bg-card border border-border rounded-xl p-4 hover:border-foreground transition"
        >
          <p className="font-semibold text-sm text-foreground">Add Vocab</p>
          <p className="text-xs text-muted mt-0.5">Add new sentences</p>
        </Link>
        <Link
          href="/sync"
          className="bg-card border border-border rounded-xl p-4 hover:border-foreground transition"
        >
          <p className="font-semibold text-sm text-foreground">Sync</p>
          <p className="text-xs text-muted mt-0.5">Google Sheets sync</p>
        </Link>
        <Link
          href="/playlists"
          className="bg-card border border-border rounded-xl p-4 hover:border-foreground transition"
        >
          <p className="font-semibold text-sm text-foreground">Playlists</p>
          <p className="text-xs text-muted mt-0.5">Create & learn</p>
        </Link>
        <Link
          href="/player"
          className="bg-card border border-border rounded-xl p-4 hover:border-foreground transition"
        >
          <p className="font-semibold text-sm text-foreground">Player</p>
          <p className="text-xs text-muted mt-0.5">Listen & loop</p>
        </Link>
      </div>

      {!loading && recentVocab.length > 0 && (
        <div>
          <h2 className="font-semibold text-sm mb-2 text-foreground">Recently Added</h2>
          <div className="space-y-2">
            {recentVocab.map((v) => (
              <div
                key={v.id}
                className="bg-card border border-border rounded-lg p-3 flex items-start gap-3"
              >
                <span
                  className={`shrink-0 w-1.5 h-1.5 rounded-full mt-2 ${
                    v.status === 'YES' ? 'bg-foreground' : 'bg-border'
                  }`}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{v.en}</p>
                  <p className="text-xs text-muted">{v.vn}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
