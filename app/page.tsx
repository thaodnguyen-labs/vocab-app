'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase-client'
import Link from 'next/link'

interface Stats {
  total: number
  learned: number
  playlists: number
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({ total: 0, learned: 0, playlists: 0 })
  const [recentVocab, setRecentVocab] = useState<
    { id: number; en: string; vn: string; status: string }[]
  >([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const [vocabRes, learnedRes, playlistRes, recentRes] = await Promise.all([
        supabase.from('vocab').select('*', { count: 'exact', head: true }),
        supabase.from('vocab').select('*', { count: 'exact', head: true }).eq('status', 'YES'),
        supabase.from('playlists').select('*', { count: 'exact', head: true }),
        supabase
          .from('vocab')
          .select('id, en, vn, status')
          .order('created_at', { ascending: false })
          .limit(5),
      ])

      setStats({
        total: vocabRes.count || 0,
        learned: learnedRes.count || 0,
        playlists: playlistRes.count || 0,
      })
      setRecentVocab(recentRes.data || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted">Loading...</p>
      </div>
    )
  }

  const progress = stats.total > 0 ? Math.round((stats.learned / stats.total) * 100) : 0

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Vocab Practice</h1>
      <p className="text-sm text-muted mb-6">Your English vocabulary dashboard</p>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-primary">{stats.total}</p>
          <p className="text-xs text-muted">Total Vocab</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-success">{stats.learned}</p>
          <p className="text-xs text-muted">Learned</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-accent">{stats.playlists}</p>
          <p className="text-xs text-muted">Playlists</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-card border border-border rounded-xl p-4 mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="font-medium">Progress</span>
          <span className="text-muted">{progress}%</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-success rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Link
          href="/vocab"
          className="bg-card border border-border rounded-xl p-4 hover:border-primary transition group"
        >
          <p className="font-semibold text-sm group-hover:text-primary">+ Add Vocab</p>
          <p className="text-xs text-muted">Add new sentences</p>
        </Link>
        <Link
          href="/import"
          className="bg-card border border-border rounded-xl p-4 hover:border-primary transition group"
        >
          <p className="font-semibold text-sm group-hover:text-primary">^ Import</p>
          <p className="text-xs text-muted">From Excel/Sheets</p>
        </Link>
        <Link
          href="/playlists"
          className="bg-card border border-border rounded-xl p-4 hover:border-primary transition group"
        >
          <p className="font-semibold text-sm group-hover:text-primary"># Playlists</p>
          <p className="text-xs text-muted">Manage playlists</p>
        </Link>
        <Link
          href="/player"
          className="bg-card border border-border rounded-xl p-4 hover:border-primary transition group"
        >
          <p className="font-semibold text-sm group-hover:text-primary">&gt; Player</p>
          <p className="text-xs text-muted">Listen & learn</p>
        </Link>
      </div>

      {/* Recent vocab */}
      {recentVocab.length > 0 && (
        <div>
          <h2 className="font-semibold text-sm mb-2">Recently Added</h2>
          <div className="space-y-2">
            {recentVocab.map((v) => (
              <div key={v.id} className="bg-card border border-border rounded-lg p-3 flex items-start gap-2">
                <span
                  className={`shrink-0 w-2 h-2 rounded-full mt-1.5 ${
                    v.status === 'YES' ? 'bg-success' : 'bg-gray-300'
                  }`}
                />
                <div>
                  <p className="text-sm font-medium">{v.en}</p>
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
