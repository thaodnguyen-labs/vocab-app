'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ListMusic } from 'lucide-react'
import AudioPlayer, { type CuePoint } from '@/components/AudioPlayer'
import Mascot from '@/components/Mascot'

interface PlaylistItem {
  en: string
  vn: string
}

interface Playlist {
  id: number
  name: string
  audio_url: string | null
  cue_points: CuePoint[] | null
  items: PlaylistItem[] | null
}

function PlayerPageInner() {
  const searchParams = useSearchParams()
  const preferId = searchParams.get('id')

  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [selected, setSelected] = useState<Playlist | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/playlists')
      const { data } = await res.json()
      const withAudio: Playlist[] = (data || []).filter((p: Playlist) => p.audio_url)
      setPlaylists(withAudio)

      if (withAudio.length > 0) {
        const found = preferId
          ? withAudio.find((p) => p.id === parseInt(preferId))
          : null
        setSelected(found || withAudio[0])
      }
      setLoading(false)
    }
    load()
  }, [preferId])

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
        <Mascot state="waving" size="lg" />
        <h2 className="text-lg font-bold mt-4 mb-2 text-foreground">
          No playlists with audio yet
        </h2>
        <p className="text-sm text-muted mb-4">
          Pick a size on the Playlists page first.
        </p>
        <Link
          href="/playlists"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-brand-blue text-white border-b-4 border-brand-blue-dark rounded-xl text-sm font-bold hover:brightness-105 active:border-b-2 active:translate-y-[2px] transition"
        >
          <ListMusic size={16} />
          Go to Playlists
        </Link>
      </div>
    )
  }

  return (
    <div>
      {playlists.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {playlists.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelected(p)}
              className={`text-sm px-3 py-1.5 rounded-lg transition font-bold ${
                selected?.id === p.id
                  ? 'bg-brand-amber text-foreground border-b-4 border-brand-amber-dark'
                  : 'bg-card text-muted border-2 border-border hover:border-foreground'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {selected && selected.audio_url && selected.cue_points && (
        <AudioPlayer
          key={selected.id}
          playlistId={selected.id}
          audioUrl={selected.audio_url}
          cuePoints={selected.cue_points}
          items={selected.items || []}
          title={selected.name}
        />
      )}
    </div>
  )
}

export default function PlayerPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading...</p>}>
      <PlayerPageInner />
    </Suspense>
  )
}
