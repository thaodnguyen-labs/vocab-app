'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

export interface CuePoint {
  index: number
  startTime: number
  en: string
  vn: string
}

interface AudioPlayerProps {
  audioUrl: string
  cuePoints: CuePoint[]
  title: string
}

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 1.75, 2]

export default function AudioPlayer({ audioUrl, cuePoints, title }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentCueIndex, setCurrentCueIndex] = useState(0)
  const [loop, setLoop] = useState(true)
  const [showVN, setShowVN] = useState(true)
  const [speed, setSpeed] = useState(1)

  // Apply speed change
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed
  }, [speed])

  // Set up Media Session API for lock screen controls
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

  const cycleSpeed = () => {
    const currentIdx = SPEED_OPTIONS.indexOf(speed)
    const nextIdx = (currentIdx + 1) % SPEED_OPTIONS.length
    setSpeed(SPEED_OPTIONS[nextIdx])
  }

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60)
    const s = Math.floor(t % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const currentCue = cuePoints[currentCueIndex]

  return (
    <div className="bg-card rounded-2xl shadow-lg p-6 max-w-lg mx-auto border border-border">
      <audio ref={audioRef} src={audioUrl} preload="auto" />

      <h2 className="text-lg font-bold text-center mb-1 text-foreground">{title}</h2>
      <p className="text-xs text-muted text-center mb-6">
        {cuePoints.length} sentences {loop ? '· looping' : ''}
      </p>

      <div className="bg-row-alt rounded-xl p-5 mb-6 min-h-[120px] flex flex-col justify-center border border-border">
        <p className="text-xs text-muted mb-1">
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

      <div className="flex items-center justify-center gap-6 mb-4">
        <button
          onClick={() => skipTo(currentCueIndex - 1)}
          className="w-10 h-10 rounded-full bg-border hover:bg-accent flex items-center justify-center text-sm font-semibold transition"
          title="Previous sentence"
        >
          &lt;&lt;
        </button>
        <button
          onClick={togglePlay}
          className="w-14 h-14 rounded-full bg-primary-dark text-white flex items-center justify-center text-2xl hover:bg-primary transition shadow-md font-bold"
        >
          {isPlaying ? '||' : '>'}
        </button>
        <button
          onClick={() => skipTo(currentCueIndex + 1)}
          className="w-10 h-10 rounded-full bg-border hover:bg-accent flex items-center justify-center text-sm font-semibold transition"
          title="Next sentence"
        >
          &gt;&gt;
        </button>
      </div>

      <div className="flex justify-center gap-2 flex-wrap">
        <button
          onClick={cycleSpeed}
          className="text-xs px-3 py-1.5 rounded-full bg-primary text-foreground font-medium transition hover:bg-accent"
          title="Playback speed"
        >
          {speed}x
        </button>
        <button
          onClick={() => setLoop(!loop)}
          className={`text-xs px-3 py-1.5 rounded-full transition font-medium ${
            loop ? 'bg-primary-dark text-white' : 'bg-border text-muted'
          }`}
        >
          Loop {loop ? 'ON' : 'OFF'}
        </button>
        <button
          onClick={() => setShowVN(!showVN)}
          className={`text-xs px-3 py-1.5 rounded-full transition font-medium ${
            showVN ? 'bg-accent text-foreground' : 'bg-border text-muted'
          }`}
        >
          VN {showVN ? 'ON' : 'OFF'}
        </button>
      </div>

      <div className="mt-6 max-h-60 overflow-y-auto border-t border-border pt-4">
        {cuePoints.map((cue, i) => (
          <button
            key={i}
            onClick={() => skipTo(i)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition mb-1 ${
              i === currentCueIndex
                ? 'bg-accent text-foreground font-medium'
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
