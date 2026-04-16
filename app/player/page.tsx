'use client'

import { useState, useEffect } from 'react'
import AudioPlayer, { type CuePoint } from '@/components/AudioPlayer'
import { supabase } from '@/lib/supabase-client'

interface Playlist {
  id: number
  name: string
  audio_url: string | null
  cue_points: CuePoint[] | null
}

export default function PlayerPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [selected, setSelected] = useState<Playlist | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('playlists')
        .select('id, name, audio_url, cue_points')
        .not('audio_url', 'is', null)
        .order('created_at', { ascending: false })

      setPlaylists(data || [])
      if (data && data.length > 0) setSelected(data[0])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted">Loading playlists...</p>
      </div>
    )
  }

  if (playlists.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <p className="text-4xl mb-4">~</p>
        <h2 className="text-lg font-semibold mb-2">No playlists with audio yet</h2>
        <p className="text-sm text-muted mb-4">
          Create a playlist and generate audio first.
        </p>
        <a
          href="/playlists"
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary-light transition"
        >
          Go to Playlists
        </a>
      </div>
    )
  }

  return (
    <div>
      {/* Playlist selector */}
      {playlists.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {playlists.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelected(p)}
              className={`text-sm px-3 py-1.5 rounded-lg transition ${
                selected?.id === p.id
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {/* Audio player */}
      {selected && selected.audio_url && selected.cue_points && (
        <AudioPlayer
          key={selected.id}
          audioUrl={selected.audio_url}
          cuePoints={selected.cue_points}
          title={selected.name}
        />
      )}
    </div>
  )
}
