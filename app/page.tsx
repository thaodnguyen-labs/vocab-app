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
      <p className="text-sm text-muted mb-6">Your English vocabulary dashboard</p>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-primary-dark">{loading ? '-' : stats.total}</p>
          <p className="text-xs text-muted">Total Vocab</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-primary-dark">{loading ? '-' : stats.learned}</p>
          <p className="text-xs text-muted">Learned</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-primary-dark">
            {loading ? '-' : stats.playlists}
          </p>
          <p className="text-xs text-muted">Playlists</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-card border border-border rounded-xl p-4 mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="font-medium text-foreground">Progress</span>
          <span className="text-muted">{progress}%</span>
        </div>
        <div className="h-3 bg-row-alt rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary-dark rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Link
          href="/vocab"
          className="bg-card border border-border rounded-xl p-4 hover:border-primary-dark transition group"
        >
          <p className="font-semibold text-sm group-hover:text-primary-dark text-foreground">
            + Add Vocab
          </p>
          <p className="text-xs text-muted">Add new sentences</p>
        </Link>
        <Link
          href="/import"
          className="bg-card border border-border rounded-xl p-4 hover:border-primary-dark transition group"
        >
          <p className="font-semibold text-sm group-hover:text-primary-dark text-foreground">
            ^ Import
          </p>
          <p className="text-xs text-muted">From Excel/Sheets</p>
        </Link>
        <Link
          href="/playlists"
          className="bg-card border border-border rounded-xl p-4 hover:border-primary-dark transition group"
        >
          <p className="font-semibold text-sm group-hover:text-primary-dark text-foreground">
            # Playlists
          </p>
          <p className="text-xs text-muted">Manage & learn</p>
        </Link>
        <Link
          href="/player"
          className="bg-card border border-border rounded-xl p-4 hover:border-primary-dark transition group"
        >
          <p className="font-semibold text-sm group-hover:text-primary-dark text-foreground">
            &gt; Player
          </p>
          <p className="text-xs text-muted">Listen & loop</p>
        </Link>
      </div>

      {/* Recent vocab */}
      {!loading && recentVocab.length > 0 && (
        <div>
          <h2 className="font-semibold text-sm mb-2 text-foreground">Recently Added</h2>
          <div className="space-y-2">
            {recentVocab.map((v) => (
              <div
                key={v.id}
                className="bg-card border border-border rounded-lg p-3 flex items-start gap-2"
              >
                <span
                  className={`shrink-0 w-2 h-2 rounded-full mt-1.5 ${
                    v.status === 'YES' ? 'bg-primary-dark' : 'bg-border'
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
