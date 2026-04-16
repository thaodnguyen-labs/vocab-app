'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import VocabGrid from '@/components/VocabGrid'

interface Vocab {
  id: number
  en: string
  vn: string
  source: string
  note: string
  status: string
  used: number
  created_at: string
}

export default function VocabPage() {
  const [vocabList, setVocabList] = useState<Vocab[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')

  const loadVocab = async (searchTerm: string = '') => {
    setLoading(true)
    const url = searchTerm
      ? `/api/vocab?search=${encodeURIComponent(searchTerm)}&limit=50`
      : '/api/vocab?limit=50'
    const res = await fetch(url)
    const { data } = await res.json()
    setVocabList(data || [])
    setLoading(false)
  }

  useEffect(() => {
    const timer = setTimeout(() => loadVocab(search), search ? 300 : 0)
    return () => clearTimeout(timer)
  }, [search])

  const handleSave = async (
    rows: { en: string; vn: string; source: string; note: string }[]
  ) => {
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
      loadVocab(search)
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

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-foreground">Vocab Manager</h1>
        <Link
          href="/import"
          className="text-xs text-muted hover:text-foreground underline"
        >
          Import file
        </Link>
      </div>
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
          <h2 className="text-lg font-semibold text-foreground">Saved Vocab</h2>
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-sm px-3 py-1.5 border border-border rounded-lg w-48 focus:outline-none focus:border-foreground bg-near-white text-foreground"
          />
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
          <p className="text-sm text-muted">No vocab yet. Add some above.</p>
        ) : (
          <div className="space-y-2">
            {vocabList.map((v) => (
              <div key={v.id} className="bg-card border border-border rounded-lg p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground">{v.en}</p>
                    <p className="text-sm text-muted">{v.vn}</p>
                    {v.source && (
                      <p className="text-xs text-muted mt-1">Source: {v.source}</p>
                    )}
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
