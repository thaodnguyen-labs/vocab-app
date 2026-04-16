'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase-client'

interface Vocab {
  id: number
  en: string
  vn: string
}

interface Playlist {
  id: number
  name: string
  audio_url: string | null
  cue_points: unknown[] | null
  created_at: string
  playlist_items: { position: number; vocab: Vocab }[]
}

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
    const { data } = await supabase
      .from('vocab')
      .select('id, en, vn')
      .order('created_at', { ascending: false })
      .limit(100)
    setVocabList(data || [])
  }

  const toggleVocab = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectRandom = (count: number) => {
    const shuffled = [...vocabList].sort(() => Math.random() - 0.5)
    setSelectedIds(new Set(shuffled.slice(0, count).map((v) => v.id)))
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

  const deletePlaylist = async (id: number) => {
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
          <h1 className="text-2xl font-bold mb-1">Playlists</h1>
          <p className="text-sm text-muted">Create playlists and generate audio</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-light transition"
        >
          {showCreate ? 'Cancel' : '+ New Playlist'}
        </button>
      </div>

      {message && (
        <p
          className={`text-sm mb-4 ${
            message.startsWith('Error') ? 'text-danger' : 'text-success'
          }`}
        >
          {message}
        </p>
      )}

      {/* Create playlist form */}
      {showCreate && (
        <div className="bg-card border border-border rounded-xl p-4 mb-6">
          <h3 className="font-semibold mb-3">Create New Playlist</h3>

          <input
            type="text"
            placeholder="Playlist name (e.g. 'Week 15 Review')"
            value={playlistName}
            onChange={(e) => setPlaylistName(e.target.value)}
            className="w-full text-sm px-3 py-2 border border-border rounded-lg mb-3"
          />

          <div className="flex gap-2 mb-3">
            <button
              onClick={() => selectRandom(10)}
              className="text-xs px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 transition"
            >
              Random 10
            </button>
            <button
              onClick={() => selectRandom(15)}
              className="text-xs px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 transition"
            >
              Random 15
            </button>
            <button
              onClick={() => selectRandom(20)}
              className="text-xs px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 transition"
            >
              Random 20
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 transition"
            >
              Clear
            </button>
          </div>

          <p className="text-xs text-muted mb-2">{selectedIds.size} selected</p>

          <div className="max-h-60 overflow-y-auto border border-border rounded-lg">
            {vocabList.map((v) => (
              <button
                key={v.id}
                onClick={() => toggleVocab(v.id)}
                className={`w-full text-left px-3 py-2 text-sm border-b border-border last:border-0 transition ${
                  selectedIds.has(v.id) ? 'bg-primary/10 text-primary' : 'hover:bg-gray-50'
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
            className="mt-3 w-full py-2 bg-primary text-white rounded-lg font-medium disabled:opacity-50 hover:bg-primary-light transition"
          >
            {creating ? 'Creating...' : 'Create Playlist'}
          </button>
        </div>
      )}

      {/* Existing playlists */}
      {loading ? (
        <p className="text-sm text-muted">Loading...</p>
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
                <h3 className="font-semibold">{p.name}</h3>
                <div className="flex items-center gap-2">
                  {p.audio_url ? (
                    <a
                      href="/player"
                      className="text-xs px-3 py-1 bg-success/10 text-success rounded-lg hover:bg-success/20 transition"
                    >
                      Play
                    </a>
                  ) : (
                    <button
                      onClick={() => generateAudio(p)}
                      disabled={generating === p.id}
                      className="text-xs px-3 py-1 bg-accent/10 text-accent rounded-lg hover:bg-accent/20 disabled:opacity-50 transition"
                    >
                      {generating === p.id ? 'Generating...' : 'Generate Audio'}
                    </button>
                  )}
                  <button
                    onClick={() => deletePlaylist(p.id)}
                    className="text-xs text-gray-400 hover:text-danger"
                  >
                    del
                  </button>
                </div>
              </div>
              <p className="text-xs text-muted">
                {p.playlist_items?.length || 0} sentences
                {p.audio_url && ' | Audio ready'}
              </p>
              {p.playlist_items?.slice(0, 3).map((item, i) => (
                <p key={i} className="text-xs text-muted mt-1 truncate">
                  {i + 1}. {item.vocab.en}
                </p>
              ))}
              {(p.playlist_items?.length || 0) > 3 && (
                <p className="text-xs text-muted mt-1">
                  ...and {p.playlist_items.length - 3} more
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
