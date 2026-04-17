'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Eye,
  EyeOff,
  Check,
  Minus,
  Plus,
  Gauge,
} from 'lucide-react'

export interface CuePoint {
  index: number
  startTime: number
  en: string
  vn: string
}

interface PlaylistItem {
  en: string
  vn: string
}

interface AudioPlayerProps {
  audioUrl: string
  cuePoints: CuePoint[]
  title: string
  playlistId?: number
  items?: PlaylistItem[]
}

const MIN_SPEED = 0.7
const MAX_SPEED = 1.25
const SPEED_STEP = 0.05
const DEFAULT_SPEED = 0.9

export default function AudioPlayer({
  audioUrl,
  cuePoints,
  title,
  playlistId,
  items,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentCueIndex, setCurrentCueIndex] = useState(0)
  const [loop, setLoop] = useState(true)
  const [showVN, setShowVN] = useState(true)
  const [speed, setSpeed] = useState(DEFAULT_SPEED)
  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [confirmMsg, setConfirmMsg] = useState('')

  const confirmKey = playlistId ? `confirmed-${playlistId}` : null

  useEffect(() => {
    if (!confirmKey) return
    if (typeof window !== 'undefined' && localStorage.getItem(confirmKey)) {
      setConfirmed(true)
    }
  }, [confirmKey])

  const confirmLearned = async () => {
    if (!items || items.length === 0 || !playlistId) return
    setConfirming(true)
    setConfirmMsg('')
    try {
      const res = await fetch('/api/sheet/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enList: items.map((i) => i.en) }),
      })
      const json = await res.json()
      if (json.error) {
        setConfirmMsg(`Error: ${json.error}`)
      } else {
        setConfirmed(true)
        if (confirmKey) localStorage.setItem(confirmKey, new Date().toISOString())
        setConfirmMsg(`Updated ${json.updated} rows in your Sheet`)
      }
    } catch (e) {
      setConfirmMsg(`Error: ${String(e)}`)
    } finally {
      setConfirming(false)
    }
  }

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed
  }, [speed])

  useEffect(() => {
    if (!('mediaSession' in navigator)) return

    navigator.mediaSession.metadata = new MediaMetadata({
      title: cuePoints[currentCueIndex]?.en || title,
      artist: 'Vocab Practice',
      album: title,
    })

    navigator.mediaSession.setActionHandler('play', () => audioRef.current?.play())
    navigator.mediaSession.setActionHandler('pause', () => audioRef.current?.pause())
    navigator.mediaSession.setActionHandler('nexttrack', () => skipTo(currentCueIndex + 1))
    navigator.mediaSession.setActionHandler('previoustrack', () =>
      skipTo(Math.max(0, currentCueIndex - 1))
    )
    navigator.mediaSession.setActionHandler('seekbackward', () => {
      if (audioRef.current)
        audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 5)
    })
    navigator.mediaSession.setActionHandler('seekforward', () => {
      if (audioRef.current)
        audioRef.current.currentTime = Math.min(
          audioRef.current.duration,
          audioRef.current.currentTime + 5
        )
    })
  }, [currentCueIndex, title, cuePoints])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => {
      const t = audio.currentTime
      setCurrentTime(t)
      let idx = 0
      for (let i = cuePoints.length - 1; i >= 0; i--) {
        if (t >= cuePoints[i].startTime) {
          idx = i
          break
        }
      }
      setCurrentCueIndex(idx)
    }

    const handleLoadedMetadata = () => setDuration(audio.duration)
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => {
      if (loop) {
        audio.currentTime = 0
        audio.play()
      } else {
        setIsPlaying(false)
      }
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [loop, cuePoints])

  const skipTo = useCallback(
    (index: number) => {
      const audio = audioRef.current
      if (!audio || !cuePoints[index]) return
      const targetIdx = index >= cuePoints.length ? 0 : index < 0 ? cuePoints.length - 1 : index
      audio.currentTime = cuePoints[targetIdx].startTime
      setCurrentCueIndex(targetIdx)
      if (!isPlaying) audio.play()
    },
    [cuePoints, isPlaying]
  )

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) audio.pause()
    else audio.play()
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = parseFloat(e.target.value)
  }

  const adjustSpeed = (delta: number) => {
    setSpeed((s) => {
      const next = Math.round((s + delta) * 100) / 100
      if (next < MIN_SPEED) return MIN_SPEED
      if (next > MAX_SPEED) return MAX_SPEED
      return next
    })
  }

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60)
    const s = Math.floor(t % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const currentCue = cuePoints[currentCueIndex]

  return (
    <div className="bg-card rounded-2xl shadow-sm p-6 max-w-lg mx-auto border-2 border-tint-amber">
      <audio ref={audioRef} src={audioUrl} preload="auto" />

      <h2 className="text-base font-bold text-center mb-1 text-foreground flex items-center justify-center gap-2">
        <Play size={16} className="text-brand-amber-dark" fill="currentColor" />
        {title}
      </h2>
      <p className="text-xs text-muted text-center mb-6 font-medium">
        {cuePoints.length} sentences {loop ? '· looping' : ''}
      </p>

      <div className="bg-tint-amber rounded-xl p-5 mb-6 min-h-[120px] flex flex-col justify-center border-2 border-brand-amber/30">
        <p className="text-xs text-brand-amber-dark font-bold mb-1">
          {currentCueIndex + 1} / {cuePoints.length}
        </p>
        <p className="text-lg font-medium leading-relaxed mb-2 text-foreground">
          {currentCue?.en || '...'}
        </p>
        {showVN && <p className="text-sm text-muted leading-relaxed">{currentCue?.vn || ''}</p>}
      </div>

      <div className="mb-4">
        <input
          type="range"
          className="audio-progress"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
        />
        <div className="flex justify-between text-xs text-muted mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-6 mb-5">
        <button
          onClick={() => skipTo(currentCueIndex - 1)}
          className="w-10 h-10 rounded-full bg-row-alt hover:bg-border flex items-center justify-center transition text-foreground"
          title="Previous sentence"
        >
          <SkipBack size={18} fill="currentColor" />
        </button>
        <button
          onClick={togglePlay}
          className="w-16 h-16 rounded-full bg-brand-green text-white border-b-4 border-brand-green-dark flex items-center justify-center hover:brightness-105 active:border-b-2 active:translate-y-[2px] transition"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause size={26} fill="currentColor" />
          ) : (
            <Play size={26} fill="currentColor" className="ml-0.5" />
          )}
        </button>
        <button
          onClick={() => skipTo(currentCueIndex + 1)}
          className="w-10 h-10 rounded-full bg-row-alt hover:bg-border flex items-center justify-center transition text-foreground"
          title="Next sentence"
        >
          <SkipForward size={18} fill="currentColor" />
        </button>
      </div>

      {/* Speed control with +/- buttons */}
      <div className="flex items-center justify-center gap-1 mb-4 bg-row-alt rounded-full p-1 w-fit mx-auto">
        <button
          onClick={() => adjustSpeed(-SPEED_STEP)}
          disabled={speed <= MIN_SPEED}
          className="w-8 h-8 rounded-full bg-card hover:bg-border disabled:opacity-30 flex items-center justify-center transition text-foreground"
          title="Slower"
        >
          <Minus size={14} />
        </button>
        <button
          onClick={() => setSpeed(DEFAULT_SPEED)}
          className="text-xs font-mono font-bold text-foreground px-3 min-w-[70px] text-center hover:text-brand-amber-dark transition inline-flex items-center justify-center gap-1"
          title="Click to reset to 0.9x"
        >
          <Gauge size={12} />
          {speed.toFixed(2)}x
        </button>
        <button
          onClick={() => adjustSpeed(SPEED_STEP)}
          disabled={speed >= MAX_SPEED}
          className="w-8 h-8 rounded-full bg-card hover:bg-border disabled:opacity-30 flex items-center justify-center transition text-foreground"
          title="Faster"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Toggle buttons */}
      <div className="flex justify-center gap-2">
        <button
          onClick={() => setLoop(!loop)}
          className={`text-xs px-3 py-1.5 rounded-full transition font-bold border-2 inline-flex items-center gap-1.5 ${
            loop
              ? 'bg-brand-blue text-white border-brand-blue-dark'
              : 'bg-card text-muted border-border'
          }`}
        >
          <Repeat size={12} />
          Loop {loop ? 'on' : 'off'}
        </button>
        <button
          onClick={() => setShowVN(!showVN)}
          className={`text-xs px-3 py-1.5 rounded-full transition font-bold border-2 inline-flex items-center gap-1.5 ${
            showVN
              ? 'bg-brand-purple text-white border-brand-purple-dark'
              : 'bg-card text-muted border-border'
          }`}
        >
          {showVN ? <Eye size={12} /> : <EyeOff size={12} />}
          VN {showVN ? 'on' : 'off'}
        </button>
      </div>

      {playlistId && items && items.length > 0 && (
        <div className="mt-5 border-t border-border pt-5">
          <button
            onClick={confirmLearned}
            disabled={confirming || confirmed}
            className={`w-full py-3 rounded-xl font-bold transition inline-flex items-center justify-center gap-2 ${
              confirmed
                ? 'bg-tint-green text-brand-green-dark border-2 border-brand-green/30 cursor-not-allowed'
                : 'bg-brand-green text-white border-b-4 border-brand-green-dark hover:brightness-105 active:border-b-2 active:translate-y-[2px] disabled:opacity-60'
            }`}
          >
            <Check size={16} />
            {confirming
              ? 'Pushing to Sheet...'
              : confirmed
              ? 'Confirmed — used +1 in Sheet'
              : `Confirm learned (+1 used for ${items.length})`}
          </button>
          {confirmMsg && (
            <p
              className={`text-xs mt-2 text-center ${
                confirmMsg.startsWith('Error') ? 'text-danger' : 'text-muted'
              }`}
            >
              {confirmMsg}
            </p>
          )}
        </div>
      )}

      <div className="mt-6 max-h-60 overflow-y-auto border-t border-border pt-4">
        {cuePoints.map((cue, i) => (
          <button
            key={i}
            onClick={() => skipTo(i)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition mb-1 ${
              i === currentCueIndex
                ? 'bg-row-alt text-foreground font-medium'
                : 'hover:bg-row-alt text-foreground'
            }`}
          >
            <span className="text-xs text-muted mr-2">{i + 1}.</span>
            {cue.en}
          </button>
        ))}
      </div>
    </div>
  )
}
