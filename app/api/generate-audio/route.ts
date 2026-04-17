import { createServerClient } from '@/lib/supabase-server'
import { generatePlaylistAudio } from '@/lib/edge-tts'
import { NextRequest } from 'next/server'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  const supabase = createServerClient()
  const { playlistId, sentences } = await request.json()

  if (!playlistId || !Array.isArray(sentences) || sentences.length === 0) {
    return Response.json({ error: 'playlistId and sentences are required' }, { status: 400 })
  }

  try {
    const { audioBuffer, cuePoints } = await generatePlaylistAudio(sentences)
    const filename = `playlist-${playlistId}-${Date.now()}.mp3`

    const { error: uploadError } = await supabase.storage
      .from('audio')
      .upload(filename, audioBuffer, { contentType: 'audio/mpeg' })

    if (uploadError) return Response.json({ error: uploadError.message }, { status: 500 })

    const { data: urlData } = supabase.storage.from('audio').getPublicUrl(filename)

    await supabase
      .from('playlists')
      .update({ audio_url: urlData.publicUrl, cue_points: cuePoints })
      .eq('id', playlistId)

    return Response.json({ audioUrl: urlData.publicUrl, cuePoints })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
