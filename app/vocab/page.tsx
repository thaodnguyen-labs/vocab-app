'use client'

import { useState, useEffect } from 'react'
import VocabGrid from '@/components/VocabGrid'
import { supabase } from '@/lib/supabase-client'

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

  const loadVocab = async () => {
    setLoading(true)
    let query = supabase
      .from('vocab')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (search) {
      query = query.or(`en.ilike.%${search}%,vn.ilike.%${search}%`)
    }

    const { data } = await query
    setVocabList(data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadVocab()
  }, [search])

  const handleSave = async (rows: { en: string; vn: string; source: string; note: string }[]) => {
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
      setMessage(`Saved ${result.data.length} vocab items!`)
      loadVocab()
    }
  }

  const toggleStatus = async (vocab: Vocab) => {
    const newStatus = vocab.status === 'YES' ? 'NO' : 'YES'
    await supabase.from('vocab').update({ status: newStatus }).eq('id', vocab.id)
    setVocabList((prev) =>
      prev.map((v) => (v.id === vocab.id ? { ...v, status: newStatus } : v))
    )
  }

  const deleteVocab = async (id: number) => {
    await supabase.from('vocab').delete().eq('id', id)
    setVocabList((prev) => prev.filter((v) => v.id !== id))
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Vocab Manager</h1>
      <p className="text-sm text-muted mb-6">Add new vocabulary or manage existing entries</p>

      {/* Add new vocab section */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Add New Vocab</h2>
        <VocabGrid onSave={handleSave} saving={saving} />
        {message && (
          <p
            className={`mt-2 text-sm ${message.startsWith('Error') ? 'text-danger' : 'text-success'}`}
          >
            {message}
          </p>
        )}
      </div>

      {/* Existing vocab list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Saved Vocab ({vocabList.length})</h2>
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-sm px-3 py-1.5 border border-border rounded-lg w-48"
          />
        </div>

        {loading ? (
          <p className="text-sm text-muted">Loading...</p>
        ) : vocabList.length === 0 ? (
          <p className="text-sm text-muted">No vocab yet. Add some above!</p>
        ) : (
          <div className="space-y-2">
            {vocabList.map((v) => (
              <div key={v.id} className="bg-card border border-border rounded-lg p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{v.en}</p>
                    <p className="text-sm text-muted">{v.vn}</p>
                    {v.source && <p className="text-xs text-muted mt-1">Source: {v.source}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleStatus(v)}
                      className={`text-xs px-2 py-0.5 rounded ${
                        v.status === 'YES'
                          ? 'bg-success/10 text-success'
                          : 'bg-gray-100 text-muted'
                      }`}
                    >
                      {v.status === 'YES' ? 'Learned' : 'New'}
                    </button>
                    <button
                      onClick={() => deleteVocab(v.id)}
                      className="text-xs text-gray-400 hover:text-danger"
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
