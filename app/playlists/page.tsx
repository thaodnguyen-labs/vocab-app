'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'

interface Vocab {
  id: number
  en: string
  vn: string
  status: string
  used: number
  year: number | null
  week: number | null
  level: number | null
}

interface Playlist {
  id: number
  name: string
  audio_url: string | null
  cue_points: unknown[] | null
  created_at: string
  playlist_items: { position: number; vocab: Vocab }[]
}

const PRESET_SIZES = [10, 15, 20, 30, 50, 70, 100]

export default function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [vocabList, setVocabList] = useState<Vocab[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [playlistName, setPlaylistName] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [generating, setGenerating] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  // Filters for vocab picker
  const [filterStatus, setFilterStatus] = useState<'' | 'YES' | 'NO'>('NO') // default: new
  const [filterYear, setFilterYear] = useState('')
  const [filterWeek, setFilterWeek] = useState('')
  const [filterLevel, setFilterLevel] = useState('')
  const [filterMinUsed, setFilterMinUsed] = useState('')
  const [filterMaxUsed, setFilterMaxUsed] = useState('')

  useEffect(() => {
    loadPlaylists()
    loadVocab()
  }, [])

  const loadPlaylists = async () => {
    const res = await fetch('/api/playlists')
    const { data } = await res.json()
    setPlaylists(data || [])
    setLoading(false)
  }

  const loadVocab = async () => {
    const res = await fetch('/api/vocab?minimal=1&limit=1000')
    const { data } = await res.json()
    setVocabList(data || [])
  }

  const filteredVocab = useMemo(() => {
    return vocabList.filter((v) => {
      if (filterStatus && v.status !== filterStatus) return false
      if (filterYear && v.year !== parseInt(filterYear)) return false
      if (filterWeek && v.week !== parseInt(filterWeek)) return false
      if (filterLevel && v.level !== parseInt(filterLevel)) return false
      if (filterMinUsed && (v.used || 0) < parseInt(filterMinUsed)) return false
      if (filterMaxUsed && (v.used || 0) > parseInt(filterMaxUsed)) return false
      return true
    })
  }, [vocabList, filterStatus, filterYear, filterWeek, filterLevel, filterMinUsed, filterMaxUsed])

  const toggleVocab = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectRandom = (count: number) => {
    const shuffled = [...filteredVocab].sort(() => Math.random() - 0.5)
    const picked = shuffled.slice(0, Math.min(count, shuffled.length))
    setSelectedIds(new Set(picked.map((v) => v.id)))
    if (!playlistName) {
      const now = new Date()
      const dateStr = `${now.getMonth() + 1}/${now.getDate()}`
      const suffix =
        filterStatus === 'NO' ? 'new' : filterStatus === 'YES' ? 'review' : 'mixed'
      setPlaylistName(`${count} ${suffix} · ${dateStr}`)
    }
  }

  const createPlaylist = async () => {
    if (!playlistName.trim() || selectedIds.size === 0) return
    setCreating(true)
    setMessage('')

    const res = await fetch('/api/playlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: playlistName,
        vocabIds: Array.from(selectedIds),
      }),
    })
    const result = await res.json()

    if (result.error) {
      setMessage(`Error: ${result.error}`)
    } else {
      setMessage(`Playlist "${playlistName}" created`)
      setPlaylistName('')
      setSelectedIds(new Set())
      setShowCreate(false)
      loadPlaylists()
    }
    setCreating(false)
  }

  const generateAudio = async (playlist: Playlist, isRegenerate = false) => {
    if (isRegenerate) {
      if (
        !confirm(
          `Regenerate audio for "${playlist.name}"? This will overwrite the current audio file.`
        )
      )
        return
    }
    setGenerating(playlist.id)
    setMessage('')

    const sentences = playlist.playlist_items.map((item) => ({
      en: item.vocab.en,
      vn: item.vocab.vn,
    }))

    const res = await fetch('/api/generate-audio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playlistId: playlist.id,
        sentences,
      }),
    })

    const result = await res.json()
    setGenerating(null)

    if (result.error) {
      setMessage(`Error generating audio: ${result.error}`)
    } else {
      setMessage(isRegenerate ? 'Audio regenerated' : 'Audio generated')
      loadPlaylists()
    }
  }

  const deletePlaylist = async (id: number, name: string) => {
    if (!confirm(`Delete playlist "${name}"? This cannot be undone.`)) return
    await fetch('/api/playlists', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    loadPlaylists()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1 text-foreground">Playlists</h1>
          <p className="text-sm text-muted">Create, learn, and listen</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-foreground text-background rounded-lg text-sm font-medium hover:opacity-80 transition"
        >
          {showCreate ? 'Cancel' : '+ New'}
        </button>
      </div>

      {message && (
        <p
          className={`text-sm mb-4 ${
            message.startsWith('Error') ? 'text-danger' : 'text-foreground font-medium'
          }`}
        >
          {message}
        </p>
      )}

      {showCreate && (
        <div className="bg-card border border-border rounded-xl p-4 mb-6">
          <h3 className="font-semibold mb-3 text-foreground">Create New Playlist</h3>

          <input
            type="text"
            placeholder="Playlist name (e.g. 'Week 15 Review')"
            value={playlistName}
            onChange={(e) => setPlaylistName(e.target.value)}
            className="w-full text-sm px-3 py-2 border border-border rounded-lg mb-3 bg-near-white focus:outline-none focus:border-foreground text-foreground"
          />

          {/* Filters */}
          <div className="bg-row-alt border border-border rounded-lg p-3 mb-3 space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted uppercase tracking-wide font-medium">Filter:</span>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as '' | 'YES' | 'NO')}
                className="px-2 py-1 border border-border rounded bg-near-white text-foreground"
              >
                <option value="">All status</option>
                <option value="NO">New (H=NO)</option>
                <option value="YES">Learned (H=YES)</option>
              </select>

              <input
                type="number"
                placeholder="Year"
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="px-2 py-1 border border-border rounded bg-near-white w-20 text-foreground"
              />

              <input
                type="number"
                placeholder="Week"
                value={filterWeek}
                onChange={(e) => setFilterWeek(e.target.value)}
                className="px-2 py-1 border border-border rounded bg-near-white w-20 text-foreground"
              />

              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                className="px-2 py-1 border border-border rounded bg-near-white text-foreground"
              >
                <option value="">All levels</option>
                <option value="1">L1</option>
                <option value="2">L2</option>
              </select>

              <input
                type="number"
                placeholder="Min used"
                value={filterMinUsed}
                onChange={(e) => setFilterMinUsed(e.target.value)}
                className="px-2 py-1 border border-border rounded bg-near-white w-20 text-foreground"
              />

              <input
                type="number"
                placeholder="Max used"
                value={filterMaxUsed}
                onChange={(e) => setFilterMaxUsed(e.target.value)}
                className="px-2 py-1 border border-border rounded bg-near-white w-20 text-foreground"
              />
            </div>
            <p className="text-xs text-muted">
              Matching pool: {filteredVocab.length} / {vocabList.length}
            </p>
          </div>

          <p className="text-xs text-muted mb-1">Pick random from filtered pool:</p>
          <div className="flex gap-2 flex-wrap mb-3">
            {PRESET_SIZES.map((n) => (
              <button
                key={n}
                onClick={() => selectRandom(n)}
                disabled={n > filteredVocab.length}
                className="text-sm px-3 py-1.5 bg-row-alt text-foreground border border-border rounded-lg hover:bg-border disabled:opacity-30 disabled:cursor-not-allowed transition font-medium"
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-sm px-3 py-1.5 text-muted rounded-lg hover:bg-row-alt transition"
            >
              Clear
            </button>
          </div>

          <p className="text-xs text-muted mb-2">{selectedIds.size} selected</p>

          <div className="max-h-60 overflow-y-auto border border-border rounded-lg bg-near-white">
            {filteredVocab.map((v) => (
              <button
                key={v.id}
                onClick={() => toggleVocab(v.id)}
                className={`w-full text-left px-3 py-2 text-sm border-b border-border last:border-0 transition ${
                  selectedIds.has(v.id)
                    ? 'bg-row-alt text-foreground font-medium'
                    : 'hover:bg-row-alt text-foreground'
                }`}
              >
                <span>{v.en}</span>
                <span className="text-muted ml-2">— {v.vn}</span>
              </button>
            ))}
          </div>

          <button
            onClick={createPlaylist}
            disabled={creating || !playlistName.trim() || selectedIds.size === 0}
            className="mt-3 w-full py-2 bg-foreground text-background rounded-lg font-medium disabled:opacity-50 hover:opacity-80 transition"
          >
            {creating ? 'Creating...' : 'Create Playlist'}
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-row-alt rounded w-1/2 mb-2" />
              <div className="h-3 bg-row-alt rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : playlists.length === 0 ? (
        <div className="text-center py-12 text-muted text-sm">
          No playlists yet. Create one above.
        </div>
      ) : (
        <div className="space-y-3">
          {playlists.map((p) => (
            <div key={p.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-foreground">{p.name}</h3>
                <button
                  onClick={() => deletePlaylist(p.id, p.name)}
                  className="text-xs px-2 py-1 text-danger hover:bg-row-alt rounded transition"
                >
                  Delete
                </button>
              </div>
              <p className="text-xs text-muted mb-3">
                {p.playlist_items?.length || 0} sentences
                {p.audio_url && ' · audio ready'}
              </p>

              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/learn/${p.id}`}
                  className="text-xs px-3 py-1.5 bg-foreground text-background rounded-lg hover:opacity-80 font-medium transition"
                >
                  Learn
                </Link>
                {p.audio_url ? (
                  <>
                    <Link
                      href={`/player?id=${p.id}`}
                      className="text-xs px-3 py-1.5 bg-row-alt text-foreground border border-border rounded-lg hover:bg-border font-medium transition"
                    >
                      Play Audio
                    </Link>
                    <button
                      onClick={() => generateAudio(p, true)}
                      disabled={generating === p.id}
                      className="text-xs px-3 py-1.5 text-muted hover:text-foreground rounded-lg disabled:opacity-50 font-medium transition"
                    >
                      {generating === p.id ? 'Regenerating...' : 'Regenerate'}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => generateAudio(p)}
                    disabled={generating === p.id}
                    className="text-xs px-3 py-1.5 bg-row-alt text-foreground border border-border rounded-lg hover:bg-border disabled:opacity-50 font-medium transition"
                  >
                    {generating === p.id ? 'Generating...' : 'Generate Audio'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
