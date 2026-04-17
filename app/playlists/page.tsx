'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Play,
  BookOpen,
  RotateCw,
  Trash2,
  Shuffle,
  Sparkles,
} from 'lucide-react'
import Mascot from '@/components/Mascot'

interface SheetRow {
  en: string
  vn: string
  note?: string
  status?: string
  used?: number
}

interface PlaylistItem {
  en: string
  vn: string
  note?: string
}

interface Playlist {
  id: number
  name: string
  audio_url: string | null
  cue_points: unknown[] | null
  items: PlaylistItem[] | null
  created_at: string
}

const PRESET_SIZES = [10, 15, 20, 30, 50, 70, 100]

export default function PlaylistsPage() {
  const router = useRouter()
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [rows, setRows] = useState<SheetRow[]>([])
  const [loading, setLoading] = useState(true)
  const [picking, setPicking] = useState<number | null>(null)
  const [generating, setGenerating] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const [sheetError, setSheetError] = useState('')

  const loadPlaylists = async () => {
    const res = await fetch('/api/playlists')
    const { data } = await res.json()
    setPlaylists(data || [])
    setLoading(false)
  }

  const loadSheet = async () => {
    setSheetError('')
    const res = await fetch('/api/sheet')
    const json = await res.json()
    if (json.error) {
      setSheetError(json.error)
      setRows([])
      return
    }
    setRows(json.data || [])
  }

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    void loadPlaylists()
    void loadSheet()
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  // VBA rule: filter column H (status) == "NO"
  const newRows = rows.filter(
    (r) => r.en?.trim() && String(r.status || '').trim().toUpperCase() === 'NO'
  )

  const pickAndCreate = async (n: number) => {
    if (newRows.length < n) {
      setMessage(`Only ${newRows.length} rows available with status=NO`)
      return
    }
    setPicking(n)
    setMessage('')

    // Shuffle and take N unique
    const shuffled = [...newRows].sort(() => Math.random() - 0.5)
    const picked = shuffled.slice(0, n).map((r) => ({
      en: r.en.trim(),
      vn: r.vn || '',
      note: r.note || '',
    }))

    const now = new Date()
    const dd = String(now.getDate()).padStart(2, '0')
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const name = `${dd}/${mm}`

    const createRes = await fetch('/api/playlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, items: picked }),
    })
    const created = await createRes.json()

    if (created.error) {
      setMessage(`Error: ${created.error}`)
      setPicking(null)
      return
    }

    const playlist: Playlist = created.data
    setPicking(null)
    setGenerating(playlist.id)
    setMessage(`Generating audio for "${name}"...`)

    const audioRes = await fetch('/api/generate-audio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playlistId: playlist.id, sentences: picked }),
    })
    const audio = await audioRes.json()
    setGenerating(null)

    if (audio.error) {
      setMessage(`Error generating audio: ${audio.error}`)
      loadPlaylists()
      return
    }

    router.push(`/player?id=${playlist.id}`)
  }

  const regenerateAudio = async (p: Playlist) => {
    if (!confirm(`Regenerate audio for "${p.name}"?`)) return
    if (!p.items || p.items.length === 0) {
      setMessage('Playlist has no items')
      return
    }
    setGenerating(p.id)
    setMessage('')
    const res = await fetch('/api/generate-audio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playlistId: p.id, sentences: p.items }),
    })
    const result = await res.json()
    setGenerating(null)
    if (result.error) setMessage(`Error: ${result.error}`)
    else {
      setMessage('Audio regenerated')
      loadPlaylists()
    }
  }

  const deletePlaylist = async (id: number, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return
    await fetch('/api/playlists', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    loadPlaylists()
  }

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')

  const startEdit = (p: Playlist) => {
    setEditingId(p.id)
    setEditingName(p.name)
  }

  const saveEdit = async () => {
    if (editingId === null) return
    const name = editingName.trim()
    if (!name) {
      setEditingId(null)
      return
    }
    await fetch(`/api/playlists/${editingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    setEditingId(null)
    loadPlaylists()
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Mascot state="idle" size="sm" />
        <div>
          <h1 className="text-2xl font-bold mb-1 text-foreground flex items-center gap-2">
            <Sparkles className="text-brand-blue" size={22} />
            Playlists
          </h1>
          <p className="text-sm text-muted">
            Pick random vocab (status=NO) from your Sheet
          </p>
        </div>
      </div>

      {sheetError && (
        <div className="bg-card border border-danger rounded-xl p-3 mb-4 text-sm text-danger">
          {sheetError}{' '}
          <Link href="/settings" className="underline">
            Set source URL
          </Link>
        </div>
      )}

      {message && (
        <p
          className={`text-sm mb-4 ${
            message.startsWith('Error') ? 'text-danger' : 'text-foreground font-medium'
          }`}
        >
          {message}
        </p>
      )}

      <div className="bg-tint-blue border-2 border-brand-blue/30 rounded-2xl p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-brand-blue-dark flex items-center gap-1.5">
            <Shuffle size={16} />
            Pick random
          </p>
          <p className="text-xs text-muted font-medium">
            {newRows.length} available
            {rows.length > 0 && ` · ${rows.length} total`}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {PRESET_SIZES.map((n) => {
            const disabled = n > newRows.length || picking !== null || generating !== null
            const busy = picking === n || (generating !== null && picking === null)
            return (
              <button
                key={n}
                onClick={() => pickAndCreate(n)}
                disabled={disabled}
                className="text-base px-4 py-2 bg-white text-brand-blue-dark border-b-4 border-brand-blue/40 rounded-lg hover:brightness-105 active:border-b-2 active:translate-y-[2px] disabled:opacity-30 disabled:cursor-not-allowed transition font-bold min-w-[52px]"
              >
                {busy ? '...' : n}
              </button>
            )
          })}
        </div>
        {(picking !== null || generating !== null) && (
          <div className="flex items-center gap-2 mt-3">
            <Mascot state="waving" size="sm" />
            <p className="text-xs text-muted font-medium">
              {picking !== null
                ? 'Creating playlist...'
                : 'Generating audio (can take ~30s)...'}
            </p>
          </div>
        )}
      </div>

      <h2 className="text-sm font-semibold mb-2 text-foreground">Saved playlists</h2>

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
        <div className="flex flex-col items-center py-8">
          <Mascot state="waving" size="lg" message="Pick a size to start!" />
        </div>
      ) : (
        <div className="space-y-3">
          {playlists.map((p) => (
            <div key={p.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-1 gap-2">
                {editingId === p.id ? (
                  <input
                    autoFocus
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={saveEdit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit()
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    className="flex-1 font-semibold text-foreground bg-near-white border border-border rounded px-2 py-1 focus:outline-none focus:border-foreground"
                  />
                ) : (
                  <button
                    onClick={() => startEdit(p)}
                    className="font-semibold text-foreground text-left flex-1 hover:underline"
                    title="Click to rename"
                  >
                    {p.name}
                  </button>
                )}
                <button
                  onClick={() => deletePlaylist(p.id, p.name)}
                  aria-label="Delete playlist"
                  className="p-1.5 text-danger hover:bg-tint-rose rounded-lg transition shrink-0"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <p className="text-xs text-muted mb-3">
                {p.items?.length || 0} sentences
                {p.audio_url && ' · audio ready'}
              </p>

              <div className="flex flex-wrap gap-2 items-center">
                {p.audio_url ? (
                  <>
                    <Link
                      href={`/player?id=${p.id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-brand-green text-white border-b-4 border-brand-green-dark rounded-lg hover:brightness-105 active:border-b-2 active:translate-y-[2px] transition"
                    >
                      <Play size={14} fill="currentColor" />
                      Play
                    </Link>
                    <Link
                      href={`/learn/${p.id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-brand-rose text-white border-b-4 border-brand-rose-dark rounded-lg hover:brightness-105 active:border-b-2 active:translate-y-[2px] transition"
                    >
                      <BookOpen size={14} />
                      Learn
                    </Link>
                    <button
                      onClick={() => regenerateAudio(p)}
                      disabled={generating === p.id}
                      aria-label="Regenerate audio"
                      className="inline-flex items-center gap-1.5 text-xs px-2 py-1.5 text-muted hover:text-foreground rounded-lg disabled:opacity-50 font-medium transition"
                    >
                      <RotateCw size={14} className={generating === p.id ? 'animate-spin' : ''} />
                      {generating === p.id ? 'Regenerating...' : 'Regenerate'}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => regenerateAudio(p)}
                    disabled={generating === p.id}
                    className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-brand-amber text-foreground border-b-4 border-brand-amber-dark rounded-lg hover:brightness-105 active:border-b-2 active:translate-y-[2px] disabled:opacity-50 transition"
                  >
                    <Sparkles size={14} />
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
