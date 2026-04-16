import { createServerClient } from '@/lib/supabase-server'
import { generatePlaylistAudio, generateSingleAudio } from '@/lib/edge-tts'
import { NextRequest } from 'next/server'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  const supabase = createServerClient()
  const body = await request.json()

  // Mode 1: Generate audio for a single vocab item
  if (body.vocabId && body.text) {
    try {
      const audioBuffer = await generateSingleAudio(body.text)
      const filename = `vocab-${body.vocabId}-${Date.now()}.mp3`

      const { error: uploadError } = await supabase.storage
        .from('audio')
        .upload(filename, audioBuffer, { contentType: 'audio/mpeg' })

      if (uploadError) return Response.json({ error: uploadError.message }, { status: 500 })

      const { data: urlData } = supabase.storage
        .from('audio')
        .getPublicUrl(filename)

      // Update vocab with audio URL
      await supabase
        .from('vocab')
        .update({ audio_url: urlData.publicUrl })
        .eq('id', body.vocabId)

      return Response.json({ audioUrl: urlData.publicUrl })
    } catch (e) {
      return Response.json({ error: String(e) }, { status: 500 })
    }
  }

  // Mode 2: Generate combined playlist audio
  if (body.playlistId && body.sentences) {
    try {
      const { audioBuffer, cuePoints } = await generatePlaylistAudio(body.sentences)
      const filename = `playlist-${body.playlistId}-${Date.now()}.mp3`

      const { error: uploadError } = await supabase.storage
        .from('audio')
        .upload(filename, audioBuffer, { contentType: 'audio/mpeg' })

      if (uploadError) return Response.json({ error: uploadError.message }, { status: 500 })

      const { data: urlData } = supabase.storage
        .from('audio')
        .getPublicUrl(filename)

      // Update playlist with audio URL and cue points
      await supabase
        .from('playlists')
        .update({
          audio_url: urlData.publicUrl,
          cue_points: cuePoints,
        })
        .eq('id', body.playlistId)

      return Response.json({
        audioUrl: urlData.publicUrl,
        cuePoints,
      })
    } catch (e) {
      return Response.json({ error: String(e) }, { status: 500 })
    }
  }

  return Response.json({ error: 'Invalid request body' }, { status: 400 })
}
