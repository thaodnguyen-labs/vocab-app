'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  BookMarked,
  CheckCircle2,
  Sparkles,
  Flame,
  ListMusic,
  Play,
  Target,
} from 'lucide-react'
import Mascot from '@/components/Mascot'

interface SheetRow {
  en: string
  status?: string
  used?: number
}

interface SheetSummary {
  used3?: number
  used5?: number
  used7?: number
}

const TIPS = [
  'Learn 10 today!',
  'Nice to see you!',
  'Ready to practice?',
  'Every word counts.',
]

export default function Dashboard() {
  const [rows, setRows] = useState<SheetRow[]>([])
  const [summary, setSummary] = useState<SheetSummary>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [playlistCount, setPlaylistCount] = useState(0)
  const [tip, setTip] = useState(TIPS[0])

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setTip(TIPS[Math.floor(Date.now() / 3600000) % TIPS.length])
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  useEffect(() => {
    Promise.all([
      fetch('/api/sheet').then((r) => r.json()),
      fetch('/api/playlists').then((r) => r.json()),
    ])
      .then(([sheetRes, playlistsRes]) => {
        if (sheetRes.error) setError(sheetRes.error)
        else {
          setRows(sheetRes.data || [])
          setSummary(sheetRes.summary || {})
        }
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

  return (
    <div>
      <div className="flex items-start gap-3 mb-6">
        <Mascot state="waving" size="md" message={tip} />
      </div>
      <h1 className="text-2xl font-bold mb-1 text-foreground flex items-center gap-2">
        <Sparkles className="text-brand-purple" size={22} />
        Vocab Practice
      </h1>
      <p className="text-sm text-muted mb-6">
        Google Sheet is the source of truth. Pick random N and listen.
      </p>

      {error && (
        <div className="bg-tint-rose border-2 border-brand-rose rounded-xl p-3 mb-4 text-sm text-brand-rose-dark font-medium">
          {error}{' '}
          <Link href="/settings" className="underline">
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
            <StatCard
              Icon={BookMarked}
              value={total}
              label="Total"
              tint="var(--tint-blue)"
              accent="var(--brand-blue-dark)"
            />
            <StatCard
              Icon={CheckCircle2}
              value={learned}
              label="Learned"
              tint="var(--tint-green)"
              accent="var(--brand-green-dark)"
            />
            <StatCard
              Icon={Sparkles}
              value={newCount}
              label="New"
              tint="var(--tint-amber)"
              accent="var(--brand-amber-dark)"
            />
          </div>

          <div className="bg-tint-purple border-2 border-brand-purple/30 rounded-2xl p-4 mb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-purple flex items-center justify-center shrink-0">
                  <Flame size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-xs text-brand-purple-dark font-bold uppercase tracking-wide">
                    Total practice
                  </p>
                  <p className="text-3xl font-bold text-foreground leading-tight">
                    {totalPractice}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted font-medium">
                ≈ {total > 0 ? (totalPractice / total).toFixed(1) : '0'}× per word
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <StatCard
              Icon={Target}
              value={Number(summary.used3) || 0}
              label="Used 3+"
              tint="var(--tint-rose)"
              accent="var(--brand-rose-dark)"
            />
            <StatCard
              Icon={Target}
              value={Number(summary.used5) || 0}
              label="Used 5+"
              tint="var(--tint-purple)"
              accent="var(--brand-purple-dark)"
            />
            <StatCard
              Icon={Target}
              value={Number(summary.used7) || 0}
              label="Used 7+"
              tint="var(--tint-green)"
              accent="var(--brand-green-dark)"
            />
          </div>
        </>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/playlists"
          className="bg-tint-blue border-2 border-brand-blue/40 rounded-2xl p-4 hover:brightness-105 active:translate-y-[2px] transition"
        >
          <ListMusic className="text-brand-blue-dark mb-2" size={22} />
          <p className="font-bold text-sm text-foreground">Playlists</p>
          <p className="text-xs text-muted mt-0.5">Pick & listen · {playlistCount}</p>
        </Link>
        <Link
          href="/player"
          className="bg-tint-amber border-2 border-brand-amber/50 rounded-2xl p-4 hover:brightness-105 active:translate-y-[2px] transition"
        >
          <Play className="text-brand-amber-dark mb-2" size={22} fill="currentColor" />
          <p className="font-bold text-sm text-foreground">Player</p>
          <p className="text-xs text-muted mt-0.5">Listen & confirm</p>
        </Link>
      </div>
    </div>
  )
}

function StatCard({
  Icon,
  value,
  label,
  tint,
  accent,
}: {
  Icon: typeof BookMarked
  value: number
  label: string
  tint: string
  accent: string
}) {
  return (
    <div
      className="rounded-2xl p-3 border-2"
      style={{ backgroundColor: tint, borderColor: `${accent}33` }}
    >
      <Icon size={18} style={{ color: accent }} />
      <p className="text-2xl font-bold mt-1" style={{ color: accent }}>
        {value}
      </p>
      <p className="text-[11px] text-muted font-semibold uppercase tracking-wide mt-0.5">
        {label}
      </p>
    </div>
  )
}
