'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import VocabGrid from '@/components/VocabGrid'

interface Vocab {
  id: number
  en: string
  vn: string
  source: string
  note: string
  status: string
  used: number
  year: number | null
  week: number | null
  level: number | null
  created_at: string
}

type SortKey = 'created_at' | 'used' | 'week' | 'status' | 'year'
type Order = 'asc' | 'desc'

function VocabPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [vocabList, setVocabList] = useState<Vocab[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')

  // Filters from URL params
  const status = searchParams.get('status') || ''
  const year = searchParams.get('year') || ''
  const week = searchParams.get('week') || ''
  const level = searchParams.get('level') || ''
  const minUsed = searchParams.get('minUsed') || ''
  const sort = (searchParams.get('sort') || 'created_at') as SortKey
  const order = (searchParams.get('order') || 'desc') as Order

  const updateFilter = (key: string, value: string) => {
    const sp = new URLSearchParams(searchParams.toString())
    if (value) sp.set(key, value)
    else sp.delete(key)
    router.push(`/vocab?${sp.toString()}`, { scroll: false })
  }

  const clearFilters = () => router.push('/vocab', { scroll: false })

  const loadVocab = async () => {
    setLoading(true)
    const sp = new URLSearchParams()
    sp.set('limit', '100')
    sp.set('sort', sort)
    sp.set('order', order)
    if (search) sp.set('search', search)
    if (status) sp.set('status', status)
    if (year) sp.set('year', year)
    if (week) sp.set('week', week)
    if (level) sp.set('level', level)
    if (minUsed) sp.set('minUsed', minUsed)

    const res = await fetch(`/api/vocab?${sp.toString()}`)
    const { data } = await res.json()
    setVocabList(data || [])
    setLoading(false)
  }

  useEffect(() => {
    const timer = setTimeout(loadVocab, search ? 300 : 0)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, year, week, level, minUsed, sort, order])

  const handleSave = async (rows: Partial<Vocab>[]) => {
    setSaving(true)
    setMessage('')

    const res = await fetch('/api/vocab', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rows),
    })
    const result = await res.json()
    setSaving(false)

    if (result.error) {
      setMessage(`Error: ${result.error}`)
    } else {
      setMessage(`Saved ${result.data.length} vocab items`)
      loadVocab()
    }
  }

  const toggleStatus = async (vocab: Vocab) => {
    const newStatus = vocab.status === 'YES' ? 'NO' : 'YES'
    await fetch('/api/vocab', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: vocab.id, status: newStatus }),
    })
    setVocabList((prev) =>
      prev.map((v) => (v.id === vocab.id ? { ...v, status: newStatus } : v))
    )
  }

  const deleteVocab = async (id: number) => {
    if (!confirm('Delete this vocab?')) return
    await fetch('/api/vocab', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setVocabList((prev) => prev.filter((v) => v.id !== id))
  }

  const activeFiltersCount =
    (status ? 1 : 0) + (year ? 1 : 0) + (week ? 1 : 0) + (level ? 1 : 0) + (minUsed ? 1 : 0)

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1 text-foreground">Vocab Manager</h1>
      <p className="text-sm text-muted mb-6">Add new vocabulary or manage existing entries</p>

      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-3 text-foreground">Add New Vocab</h2>
        <VocabGrid onSave={handleSave} saving={saving} />
        {message && (
          <p
            className={`mt-2 text-sm ${
              message.startsWith('Error') ? 'text-danger' : 'text-foreground font-medium'
            }`}
          >
            {message}
          </p>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground">
            Saved Vocab {vocabList.length > 0 && <span className="text-muted font-normal text-sm">· {vocabList.length}</span>}
          </h2>
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-sm px-3 py-1.5 border border-border rounded-lg w-48 focus:outline-none focus:border-foreground bg-near-white text-foreground"
          />
        </div>

        {/* Filter and sort bar */}
        <div className="bg-card border border-border rounded-lg p-3 mb-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted uppercase tracking-wide font-medium">Filter:</span>

            <select
              value={status}
              onChange={(e) => updateFilter('status', e.target.value)}
              className="px-2 py-1 border border-border rounded bg-near-white text-foreground"
            >
              <option value="">All status</option>
              <option value="YES">Learned</option>
              <option value="NO">New</option>
            </select>

            <input
              type="number"
              placeholder="Year"
              value={year}
              onChange={(e) => updateFilter('year', e.target.value)}
              className="px-2 py-1 border border-border rounded bg-near-white w-20 text-foreground"
            />

            <input
              type="number"
              placeholder="Week"
              value={week}
              onChange={(e) => updateFilter('week', e.target.value)}
              className="px-2 py-1 border border-border rounded bg-near-white w-20 text-foreground"
            />

            <select
              value={level}
              onChange={(e) => updateFilter('level', e.target.value)}
              className="px-2 py-1 border border-border rounded bg-near-white text-foreground"
            >
              <option value="">All levels</option>
              <option value="1">L1</option>
              <option value="2">L2</option>
            </select>

            <select
              value={minUsed}
              onChange={(e) => updateFilter('minUsed', e.target.value)}
              className="px-2 py-1 border border-border rounded bg-near-white text-foreground"
            >
              <option value="">Any used</option>
              <option value="1">Used ≥ 1</option>
              <option value="3">Used ≥ 3</option>
              <option value="5">Used ≥ 5</option>
              <option value="7">Used ≥ 7</option>
            </select>

            {activeFiltersCount > 0 && (
              <button
                onClick={clearFilters}
                className="px-2 py-1 text-muted hover:text-foreground underline"
              >
                Clear ({activeFiltersCount})
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted uppercase tracking-wide font-medium">Sort:</span>
            <select
              value={sort}
              onChange={(e) => updateFilter('sort', e.target.value)}
              className="px-2 py-1 border border-border rounded bg-near-white text-foreground"
            >
              <option value="created_at">Date added</option>
              <option value="used">Used count</option>
              <option value="week">Week</option>
              <option value="year">Year</option>
              <option value="status">Status</option>
            </select>
            <button
              onClick={() => updateFilter('order', order === 'desc' ? 'asc' : 'desc')}
              className="px-2 py-1 border border-border rounded bg-near-white text-foreground font-mono"
              title="Toggle sort direction"
            >
              {order === 'desc' ? '↓ desc' : '↑ asc'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-lg p-3 animate-pulse">
                <div className="h-4 bg-row-alt rounded w-3/4 mb-2" />
                <div className="h-3 bg-row-alt rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : vocabList.length === 0 ? (
          <p className="text-sm text-muted text-center py-8">
            No vocab matches your filters.
          </p>
        ) : (
          <div className="space-y-2">
            {vocabList.map((v) => (
              <div key={v.id} className="bg-card border border-border rounded-lg p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground">{v.en}</p>
                    <p className="text-sm text-muted">{v.vn}</p>
                    <div className="flex gap-3 mt-1 text-xs text-muted">
                      {v.year && v.week && <span>Y{v.year}·W{v.week}</span>}
                      {v.level && <span>L{v.level}</span>}
                      {(v.used ?? 0) > 0 && <span>Used {v.used}</span>}
                      {v.source && <span className="truncate max-w-[200px]">{v.source}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleStatus(v)}
                      className={`text-xs px-2 py-0.5 rounded font-medium border ${
                        v.status === 'YES'
                          ? 'bg-foreground text-background border-foreground'
                          : 'bg-card text-muted border-border'
                      }`}
                    >
                      {v.status === 'YES' ? 'Learned' : 'New'}
                    </button>
                    <button
                      onClick={() => deleteVocab(v.id)}
                      className="text-xs text-muted hover:text-danger"
                    >
                      del
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function VocabPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading...</p>}>
      <VocabPageInner />
    </Suspense>
  )
}
