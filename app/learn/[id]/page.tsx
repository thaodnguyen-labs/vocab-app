'use client'

import { useState, useEffect, useRef, use } from 'react'
import Link from 'next/link'

interface Vocab {
  id: number
  en: string
  vn: string
  note: string | null
  source: string | null
  used: number
  status: string
}

interface PlaylistData {
  id: number
  name: string
  audio_url: string | null
  cue_points: { startTime: number }[] | null
  playlist_items: { position: number; vocab: Vocab }[]
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
  const [revealed, setRevealed] = useState(false)
  const [showNote, setShowNote] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    fetch(`/api/playlists/${id}`)
      .then((r) => r.json())
      .then(({ data }) => {
        setPlaylist(data)
        setLoading(false)
      })
  }, [id])

  const items = playlist?.playlist_items || []
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

  const markPracticed = async () => {
    if (!current) return
    const newUsed = (current.vocab.used || 0) + 1
    await fetch('/api/vocab', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: current.vocab.id, used: newUsed }),
    })
    setPlaylist((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        playlist_items: prev.playlist_items.map((item, i) =>
          i === currentIdx
            ? { ...item, vocab: { ...item.vocab, used: newUsed } }
            : item
        ),
      }
    })
  }

  const toggleLearned = async () => {
    if (!current) return
    const newStatus = current.vocab.status === 'YES' ? 'NO' : 'YES'
    await fetch('/api/vocab', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: current.vocab.id, status: newStatus }),
    })
    setPlaylist((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        playlist_items: prev.playlist_items.map((item, i) =>
          i === currentIdx
            ? { ...item, vocab: { ...item.vocab, status: newStatus } }
            : item
        ),
      }
    })
  }

  const next = () => {
    setRevealed(false)
    setShowNote(false)
    setCurrentIdx((i) => (i + 1) % items.length)
  }

  const prev = () => {
    setRevealed(false)
    setShowNote(false)
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

  return (
    <div>
      {playlist.audio_url && <audio ref={audioRef} src={playlist.audio_url} preload="auto" />}

      <div className="flex items-center justify-between mb-4">
        <div>
          <Link href="/playlists" className="text-xs text-muted hover:text-foreground">
            &larr; All playlists
          </Link>
          <h1 className="text-xl font-bold mt-1 text-foreground">{playlist.name}</h1>
        </div>
        <span className="text-sm text-muted font-medium">
          {currentIdx + 1} / {items.length}
        </span>
      </div>

      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        {items.map((item, i) => (
          <button
            key={i}
            onClick={() => {
              setCurrentIdx(i)
              setRevealed(false)
              setShowNote(false)
            }}
            className={`shrink-0 w-6 h-1.5 rounded-full transition ${
              i === currentIdx
                ? 'bg-foreground'
                : item.vocab.status === 'YES'
                ? 'bg-muted'
                : 'bg-border'
            }`}
            title={`${i + 1}. ${item.vocab.en}`}
          />
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 mb-4 shadow-sm">
        <div className="mb-4">
          <p className="text-xs text-muted uppercase tracking-wide mb-2">Vietnamese</p>
          <p className="text-xl leading-relaxed text-foreground font-medium">
            {current.vocab.vn}
          </p>
        </div>

        {revealed ? (
          <div className="border-t border-border pt-4">
            <p className="text-xs text-muted uppercase tracking-wide mb-2">English</p>
            <p className="text-xl leading-relaxed text-foreground mb-3">{current.vocab.en}</p>

            {current.vocab.source && (
              <p className="text-xs text-muted">Source: {current.vocab.source}</p>
            )}

            {current.vocab.note && (
              <div className="mt-3">
                <button
                  onClick={() => setShowNote(!showNote)}
                  className="text-xs text-foreground font-medium hover:underline"
                >
                  {showNote ? 'Hide note' : 'Show note'}
                </button>
                {showNote && (
                  <div className="mt-2 p-3 bg-row-alt rounded-lg text-sm text-foreground whitespace-pre-wrap">
                    {current.vocab.note}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => {
              setRevealed(true)
              if (playlist.audio_url) playCurrentAudio()
            }}
            className="w-full border-2 border-dashed border-border rounded-xl py-8 text-muted hover:border-foreground hover:text-foreground transition font-medium"
          >
            Tap to reveal English
          </button>
        )}
      </div>

      {revealed && (
        <div className="flex gap-2 mb-4">
          {playlist.audio_url && (
            <button
              onClick={playCurrentAudio}
              className="flex-1 py-2.5 bg-row-alt border border-border text-foreground rounded-lg font-medium hover:bg-border transition"
            >
              Play audio
            </button>
          )}
          <button
            onClick={markPracticed}
            className="flex-1 py-2.5 bg-row-alt border border-border text-foreground rounded-lg font-medium hover:bg-border transition"
          >
            Practiced ({current.vocab.used || 0})
          </button>
          <button
            onClick={toggleLearned}
            className={`flex-1 py-2.5 rounded-lg font-medium transition border ${
              current.vocab.status === 'YES'
                ? 'bg-foreground text-background border-foreground hover:opacity-80'
                : 'bg-card text-foreground border-border hover:border-foreground'
            }`}
          >
            {current.vocab.status === 'YES' ? 'Learned' : 'Mark learned'}
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={prev}
          className="flex-1 py-3 border border-border rounded-lg font-medium text-foreground hover:bg-row-alt transition"
        >
          &lt; Prev
        </button>
        <button
          onClick={next}
          className="flex-1 py-3 bg-foreground text-background rounded-lg font-medium hover:opacity-80 transition"
        >
          Next &gt;
        </button>
      </div>

      <div className="mt-8">
        <h3 className="text-sm font-semibold mb-2 text-foreground">All sentences</h3>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => {
                setCurrentIdx(i)
                setRevealed(false)
                setShowNote(false)
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                i === currentIdx
                  ? 'bg-row-alt text-foreground font-medium border border-border'
                  : 'bg-card border border-border hover:bg-row-alt'
              }`}
            >
              <span className="text-xs text-muted mr-2">{i + 1}.</span>
              <span className="text-foreground">{item.vocab.vn}</span>
              {item.vocab.status === 'YES' && (
                <span className="ml-2 text-xs text-foreground font-bold">·</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
