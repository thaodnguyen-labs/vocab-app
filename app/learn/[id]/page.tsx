'use client'

import { useState, useEffect, useRef, use } from 'react'
import Link from 'next/link'
import {
  ChevronLeft,
  ChevronRight,
  Volume2,
  Languages,
  StickyNote,
  BookOpen,
  PartyPopper,
} from 'lucide-react'
import Mascot from '@/components/Mascot'
import Button from '@/components/ui/Button'

interface PlaylistItem {
  en: string
  vn: string
  note?: string
}

interface PlaylistData {
  id: number
  name: string
  audio_url: string | null
  cue_points: { startTime: number }[] | null
  items: PlaylistItem[] | null
}

export default function LearnPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  const [playlist, setPlaylist] = useState<PlaylistData | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [finished, setFinished] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    fetch(`/api/playlists/${id}`)
      .then((r) => r.json())
      .then(({ data }) => {
        setPlaylist(data)
        setLoading(false)
      })
  }, [id])

  const items = playlist?.items || []
  const current = items[currentIdx]

  const playCurrentAudio = () => {
    const audio = audioRef.current
    if (!audio || !playlist?.audio_url || !playlist?.cue_points) return

    const cue = playlist.cue_points[currentIdx]
    if (!cue) return

    audio.currentTime = cue.startTime
    audio.play()

    const nextCue = playlist.cue_points[currentIdx + 1]
    if (nextCue) {
      const stopTime = nextCue.startTime
      const checkStop = () => {
        if (audio.currentTime >= stopTime) {
          audio.pause()
          audio.removeEventListener('timeupdate', checkStop)
        }
      }
      audio.addEventListener('timeupdate', checkStop)
    }
  }

  const next = () => {
    if (currentIdx >= items.length - 1) {
      setFinished(true)
      return
    }
    setCurrentIdx((i) => i + 1)
  }

  const prev = () => {
    setCurrentIdx((i) => (i - 1 + items.length) % items.length)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted">Loading...</p>
      </div>
    )
  }

  if (!playlist || items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted">Playlist not found or empty</p>
        <Link href="/playlists" className="text-foreground underline text-sm mt-2 inline-block">
          Back to playlists
        </Link>
      </div>
    )
  }

  if (finished) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Mascot state="happy" size="lg" />
        <PartyPopper className="text-brand-amber mt-4" size={28} />
        <h2 className="text-2xl font-bold mt-2 text-foreground">Finished!</h2>
        <p className="text-sm text-muted mt-1 mb-6">
          You went through all {items.length} sentences.
        </p>
        <div className="flex gap-2 w-full max-w-xs">
          <Button
            variant="secondary"
            fullWidth
            onClick={() => {
              setFinished(false)
              setCurrentIdx(0)
            }}
          >
            Restart
          </Button>
          <Link href="/playlists" className="flex-1">
            <Button variant="primary" fullWidth>
              Back to lists
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      {playlist.audio_url && <audio ref={audioRef} src={playlist.audio_url} preload="auto" />}

      <div className="flex items-center justify-between mb-4">
        <div>
          <Link
            href="/playlists"
            className="text-xs text-muted hover:text-foreground inline-flex items-center gap-1"
          >
            <ChevronLeft size={14} />
            All playlists
          </Link>
          <h1 className="text-xl font-bold mt-1 text-foreground flex items-center gap-2">
            <BookOpen size={20} className="text-brand-rose" />
            {playlist.name}
          </h1>
        </div>
        <span className="text-sm text-muted font-medium">
          {currentIdx + 1} / {items.length}
        </span>
      </div>

      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        {items.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentIdx(i)}
            className={`shrink-0 w-6 h-1.5 rounded-full transition ${
              i === currentIdx
                ? 'bg-brand-rose'
                : i < currentIdx
                  ? 'bg-brand-green'
                  : 'bg-border'
            }`}
          />
        ))}
      </div>

      <div className="bg-card border-2 border-tint-rose rounded-2xl p-5 mb-4 shadow-sm">
        <div className="mb-4">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-brand-blue-dark bg-tint-blue px-2 py-1 rounded-full uppercase tracking-wide mb-2">
            <Languages size={12} />
            English
          </span>
          <p className="text-lg leading-relaxed text-foreground font-medium mt-1">
            {current.en}
          </p>
        </div>

        <div className="mb-4 border-t border-border pt-4">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-brand-rose-dark bg-tint-rose px-2 py-1 rounded-full uppercase tracking-wide mb-2">
            <Languages size={12} />
            Vietnamese
          </span>
          <p className="text-lg leading-relaxed text-foreground mt-1">{current.vn}</p>
        </div>

        {current.note?.trim() && (
          <div className="mb-4 border-t border-border pt-4">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-brand-amber-dark bg-tint-amber px-2 py-1 rounded-full uppercase tracking-wide mb-2">
              <StickyNote size={12} />
              Note
            </span>
            <p className="text-sm leading-relaxed text-muted italic mt-1">{current.note}</p>
          </div>
        )}

        {playlist.audio_url && (
          <Button variant="accent" fullWidth onClick={playCurrentAudio} className="mt-2">
            <Volume2 size={16} />
            Play audio
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        <Button variant="secondary" fullWidth onClick={prev}>
          <ChevronLeft size={16} />
          Prev
        </Button>
        <Button variant="primary" fullWidth onClick={next}>
          {currentIdx >= items.length - 1 ? 'Finish' : 'Next'}
          <ChevronRight size={16} />
        </Button>
      </div>

      <div className="mt-8">
        <h3 className="text-sm font-semibold mb-2 text-foreground">All sentences</h3>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => setCurrentIdx(i)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                i === currentIdx
                  ? 'bg-tint-rose text-foreground font-medium border border-brand-rose'
                  : 'bg-card border border-border hover:bg-row-alt'
              }`}
            >
              <span className="text-xs text-muted mr-2">{i + 1}.</span>
              <span className="text-foreground">{item.en}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
