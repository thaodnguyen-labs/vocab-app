'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Vocab {
  id: number
  en: string
  vn: string
  status: string
  used: number
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
  const [filter, setFilter] = useState<'all' | 'new' | 'learned'>('all')

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
    const res = await fetch('/api/vocab?minimal=1&limit=500')
    const { data } = await res.json()
    setVocabList(data || [])
  }

  const filteredVocab = vocabList.filter((v) => {
    if (filter === 'new') return v.status !== 'YES'
    if (filter === 'learned') return v.status === 'YES'
    return true
  })

  const toggleVocab = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectRandom = (count: number) => {
    const pool = filter === 'all' ? vocabList : filteredVocab
    const shuffled = [...pool].sort(() => Math.random() - 0.5)
    const picked = shuffled.slice(0, Math.min(count, shuffled.length))
    setSelectedIds(new Set(picked.map((v) => v.id)))
    if (!playlistName) {
      const now = new Date()
      const dateStr = `${now.getMonth() + 1}/${now.getDate()}`
      setPlaylistName(`${count} sentences · ${dateStr}`)
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
      setMessage(`Playlist "${playlistName}" created!`)
      setPlaylistName('')
      setSelectedIds(new Set())
      setShowCreate(false)
      loadPlaylists()
    }
    setCreating(false)
  }

  const generateAudio = async (playlist: Playlist) => {
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
      setMessage('Audio generated! Go to Player to listen.')
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
          <p className="text-sm text-muted">Create playlists, learn & listen</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-primary-dark text-white rounded-lg text-sm font-medium hover:bg-primary transition"
        >
          {showCreate ? 'Cancel' : '+ New'}
        </button>
      </div>

      {message && (
        <p
          className={`text-sm mb-4 ${
            message.startsWith('Error') ? 'text-danger' : 'text-primary-dark font-medium'
          }`}
        >
          {message}
        </p>
      )}

      {/* Create playlist form */}
      {showCreate && (
        <div className="bg-card border border-border rounded-xl p-4 mb-6">
          <h3 className="font-semibold mb-3 text-foreground">Create New Playlist</h3>

          <input
            type="text"
            placeholder="Playlist name (e.g. 'Week 15 Review')"
            value={playlistName}
            onChange={(e) => setPlaylistName(e.target.value)}
            className="w-full text-sm px-3 py-2 border border-border rounded-lg mb-3 bg-near-white focus:outline-none focus:border-primary-dark text-foreground"
          />

          {/* Filter buttons */}
          <div className="flex gap-2 mb-3">
            {(['all', 'new', 'learned'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs px-3 py-1 rounded-full transition font-medium ${
                  filter === f
                    ? 'bg-primary-dark text-white'
                    : 'bg-row-alt text-muted hover:bg-border'
                }`}
              >
                {f === 'all'
                  ? `All (${vocabList.length})`
                  : f === 'new'
                  ? `New (${vocabList.filter((v) => v.status !== 'YES').length})`
                  : `Learned (${vocabList.filter((v) => v.status === 'YES').length})`}
              </button>
            ))}
          </div>

          {/* Preset size buttons */}
          <p className="text-xs text-muted mb-1">Quick pick random from {filter}:</p>
          <div className="flex gap-2 flex-wrap mb-3">
            {PRESET_SIZES.map((n) => (
              <button
                key={n}
                onClick={() => selectRandom(n)}
                disabled={n > filteredVocab.length}
                className="text-sm px-3 py-1.5 bg-accent text-foreground rounded-lg hover:bg-primary disabled:opacity-30 disabled:cursor-not-allowed transition font-medium"
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-sm px-3 py-1.5 bg-row-alt text-muted rounded-lg hover:bg-border transition"
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
                    ? 'bg-accent text-foreground'
                    : 'hover:bg-row-alt text-foreground'
                }`}
              >
                <span className="font-medium">{v.en}</span>
                <span className="text-muted ml-2">- {v.vn}</span>
              </button>
            ))}
          </div>

          <button
            onClick={createPlaylist}
            disabled={creating || !playlistName.trim() || selectedIds.size === 0}
            className="mt-3 w-full py-2 bg-primary-dark text-white rounded-lg font-medium disabled:opacity-50 hover:bg-primary transition"
          >
            {creating ? 'Creating...' : 'Create Playlist'}
          </button>
        </div>
      )}

      {/* Existing playlists */}
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
        <div className="text-center py-12 text-muted">
          <p className="text-4xl mb-2">#</p>
          <p>No playlists yet. Create one above!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {playlists.map((p) => (
            <div key={p.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-foreground">{p.name}</h3>
                <button
                  onClick={() => deletePlaylist(p.id, p.name)}
                  className="text-xs px-2 py-1 text-danger hover:bg-danger/10 rounded transition"
                  title="Delete playlist"
                >
                  Delete
                </button>
              </div>
              <p className="text-xs text-muted mb-3">
                {p.playlist_items?.length || 0} sentences
                {p.audio_url && ' · Audio ready'}
              </p>

              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/learn/${p.id}`}
                  className="text-xs px-3 py-1.5 bg-primary text-foreground rounded-lg hover:bg-accent font-medium transition"
                >
                  Learn
                </Link>
                {p.audio_url ? (
                  <Link
                    href={`/player?id=${p.id}`}
                    className="text-xs px-3 py-1.5 bg-primary-dark text-white rounded-lg hover:bg-primary font-medium transition"
                  >
                    Play Audio
                  </Link>
                ) : (
                  <button
                    onClick={() => generateAudio(p)}
                    disabled={generating === p.id}
                    className="text-xs px-3 py-1.5 bg-accent text-foreground rounded-lg hover:bg-primary disabled:opacity-50 font-medium transition"
                  >
                    {generating === p.id ? 'Generating...' : 'Generate Audio'}
                  </button>
                )}
              </div>

              {p.playlist_items?.slice(0, 2).map((item, i) => (
                <p key={i} className="text-xs text-muted mt-2 truncate">
                  {i + 1}. {item.vocab.en}
                </p>
              ))}
              {(p.playlist_items?.length || 0) > 2 && (
                <p className="text-xs text-muted mt-1">
                  ...and {p.playlist_items.length - 2} more
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
