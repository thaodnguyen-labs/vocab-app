'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Stats {
  total: number
  learned: number
  newCount: number
  totalPractice: number
  usedGte7: number
  usedGte5: number
  usedGte3: number
  playlists: number
}

interface YearWeekData {
  total: number
  learned: number
}

interface LevelData {
  total: number
  learned: number
}

interface RecentVocab {
  id: number
  en: string
  vn: string
  status: string
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [byYearWeek, setByYearWeek] = useState<Record<string, YearWeekData>>({})
  const [byLevel, setByLevel] = useState<Record<number, LevelData>>({})
  const [recent, setRecent] = useState<RecentVocab[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/stats')
      .then((r) => r.json())
      .then((d) => {
        if (d.stats) setStats(d.stats)
        if (d.byYearWeek) setByYearWeek(d.byYearWeek)
        if (d.byLevel) setByLevel(d.byLevel)
        if (d.recent) setRecent(d.recent)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading || !stats) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-1 text-foreground">Vocab Practice</h1>
        <p className="text-sm text-muted mb-6">Loading dashboard...</p>
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse">
              <div className="h-6 bg-row-alt rounded w-12 mb-2" />
              <div className="h-3 bg-row-alt rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const progress = stats.total > 0 ? Math.round((stats.learned / stats.total) * 100) : 0

  // Sort year-week keys
  const yearWeekKeys = Object.keys(byYearWeek).sort((a, b) => {
    const [ay, aw] = a.split('-').map(Number)
    const [by, bw] = b.split('-').map(Number)
    return ay === by ? bw - aw : by - ay
  })

  const levelKeys = Object.keys(byLevel)
    .map(Number)
    .sort((a, b) => a - b)

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1 text-foreground">Vocab Practice</h1>
      <p className="text-sm text-muted mb-6">English vocabulary dashboard</p>

      {/* Primary metrics (H column = Status) */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          <p className="text-xs text-muted mt-1">Total vocab</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{stats.learned}</p>
          <p className="text-xs text-muted mt-1">Learned</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{stats.newCount}</p>
          <p className="text-xs text-muted mt-1">New</p>
        </div>
      </div>

      {/* Practice metrics (I column = Used) */}
      <div className="bg-card border border-border rounded-xl p-4 mb-3">
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <p className="text-xs text-muted uppercase tracking-wide">Total practice count</p>
            <p className="text-3xl font-bold text-foreground">{stats.totalPractice}</p>
          </div>
          <p className="text-xs text-muted">
            ≈ {stats.total > 0 ? (stats.totalPractice / stats.total).toFixed(1) : '0'}× per word
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-row-alt border border-border rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-foreground">{stats.usedGte3}</p>
            <p className="text-xs text-muted">Used ≥ 3</p>
          </div>
          <div className="bg-row-alt border border-border rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-foreground">{stats.usedGte5}</p>
            <p className="text-xs text-muted">Used ≥ 5</p>
          </div>
          <div className="bg-row-alt border border-border rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-foreground">{stats.usedGte7}</p>
            <p className="text-xs text-muted">Used ≥ 7</p>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-card border border-border rounded-xl p-4 mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="font-medium text-foreground">Mastery progress</span>
          <span className="text-muted">{progress}%</span>
        </div>
        <div className="h-2 bg-row-alt rounded-full overflow-hidden">
          <div
            className="h-full bg-foreground rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* By level (J column) */}
      {levelKeys.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold mb-2 text-foreground">By level</h2>
          <div className="flex gap-2">
            {levelKeys.map((lvl) => {
              const data = byLevel[lvl]
              const pct = data.total > 0 ? Math.round((data.learned / data.total) * 100) : 0
              return (
                <Link
                  key={lvl}
                  href={`/vocab?level=${lvl}`}
                  className="flex-1 bg-card border border-border rounded-lg p-3 hover:border-foreground transition"
                >
                  <p className="text-xs text-muted">Level {lvl}</p>
                  <p className="text-lg font-bold text-foreground">{data.total}</p>
                  <p className="text-xs text-muted">
                    {data.learned} learned · {pct}%
                  </p>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* By year/week */}
      {yearWeekKeys.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold mb-2 text-foreground">By year · week</h2>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-row-alt border-b border-border">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wide">
                      Year · Week
                    </th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wide">
                      Total
                    </th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wide">
                      Learned
                    </th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wide">
                      %
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {yearWeekKeys.map((key) => {
                    const [year, week] = key.split('-').map(Number)
                    const data = byYearWeek[key]
                    const pct = data.total > 0 ? Math.round((data.learned / data.total) * 100) : 0
                    return (
                      <tr key={key} className="border-t border-border">
                        <td className="px-3 py-2 text-foreground">
                          <Link
                            href={`/vocab?year=${year}&week=${week}`}
                            className="hover:underline"
                          >
                            {year} · W{week}
                          </Link>
                        </td>
                        <td className="text-right px-3 py-2 text-foreground">{data.total}</td>
                        <td className="text-right px-3 py-2 text-muted">{data.learned}</td>
                        <td className="text-right px-3 py-2 text-muted">{pct}%</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Quick actions */}
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
          <p className="text-xs text-muted mt-0.5">Create & learn · {stats.playlists}</p>
        </Link>
        <Link
          href="/player"
          className="bg-card border border-border rounded-xl p-4 hover:border-foreground transition"
        >
          <p className="font-semibold text-sm text-foreground">Player</p>
          <p className="text-xs text-muted mt-0.5">Listen & loop</p>
        </Link>
      </div>

      {recent.length > 0 && (
        <div>
          <h2 className="font-semibold text-sm mb-2 text-foreground">Recently Added</h2>
          <div className="space-y-2">
            {recent.map((v) => (
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
