import { EdgeTTS } from 'edge-tts-universal'
import pLimit from 'p-limit'

const VOICE = 'en-US-EricNeural'
const SILENCE_DURATION_MS = 1200

function generateSilence(durationMs: number): Buffer {
  const frameSize = 104
  const framesNeeded = Math.ceil(durationMs / 26)
  const silentFrame = Buffer.alloc(frameSize, 0)
  silentFrame[0] = 0xFF
  silentFrame[1] = 0xF3
  silentFrame[2] = 0x14
  silentFrame[3] = 0xC0
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
  const limit = pLimit(3)

  const audioBuffers = await Promise.all(
    sentences.map((s, i) =>
      limit(async () => {
        const buffer = await generateSingleAudio(s.en)
        return { index: i, buffer }
      })
    )
  )

  audioBuffers.sort((a, b) => a.index - b.index)

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
    const estimatedDuration = buffer.length / 6000
    currentTime += estimatedDuration

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
