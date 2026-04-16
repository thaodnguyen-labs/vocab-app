import { EdgeTTS } from 'edge-tts-universal'
import pLimit from 'p-limit'

const VOICE = 'en-US-EmmaMultilingualNeural'
const SILENCE_DURATION_MS = 1200

function generateSilence(durationMs: number): Buffer {
  // Generate a silent MP3 frame (~26ms per frame at 24kHz mono)
  // A minimal valid MP3 frame header for silence
  const frameSize = 104 // bytes per frame for 48kbps 24kHz mono
  const framesNeeded = Math.ceil(durationMs / 26)
  const silentFrame = Buffer.alloc(frameSize, 0)
  // MP3 sync header for 48kbps, 24kHz, mono
  silentFrame[0] = 0xFF
  silentFrame[1] = 0xF3 // MPEG2, Layer3
  silentFrame[2] = 0x14 // 48kbps, 24000Hz
  silentFrame[3] = 0xC0 // Mono, no padding
  const frames = Array(framesNeeded).fill(silentFrame)
  return Buffer.concat(frames)
}

export interface CuePoint {
  index: number
  startTime: number
  en: string
  vn: string
}

export async function generateSingleAudio(text: string): Promise<Buffer> {
  const tts = new EdgeTTS(text, VOICE, {
    rate: '-10%',
    volume: '+0%',
    pitch: '+0Hz',
  })
  const result = await tts.synthesize()
  return Buffer.from(await result.audio.arrayBuffer())
}

export async function generatePlaylistAudio(
  sentences: { en: string; vn: string }[]
): Promise<{ audioBuffer: Buffer; cuePoints: CuePoint[] }> {
  const limit = pLimit(3) // 3 concurrent TTS requests

  // Generate audio for each sentence in parallel (respecting concurrency limit)
  const audioBuffers = await Promise.all(
    sentences.map((s, i) =>
      limit(async () => {
        const buffer = await generateSingleAudio(s.en)
        return { index: i, buffer }
      })
    )
  )

  // Sort by index (parallel execution may complete out of order)
  audioBuffers.sort((a, b) => a.index - b.index)

  // Build combined audio with silence gaps and track cue points
  const parts: Buffer[] = []
  const cuePoints: CuePoint[] = []
  let currentTime = 0
  const silence = generateSilence(SILENCE_DURATION_MS)

  for (const { index, buffer } of audioBuffers) {
    cuePoints.push({
      index,
      startTime: currentTime,
      en: sentences[index].en,
      vn: sentences[index].vn,
    })

    parts.push(buffer)
    // Estimate duration: MP3 at 48kbps = 6000 bytes/sec
    const estimatedDuration = buffer.length / 6000
    currentTime += estimatedDuration

    // Add silence between sentences (not after the last one)
    if (index < sentences.length - 1) {
      parts.push(silence)
      currentTime += SILENCE_DURATION_MS / 1000
    }
  }

  return {
    audioBuffer: Buffer.concat(parts),
    cuePoints,
  }
}
