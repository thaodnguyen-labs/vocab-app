import { createServerClient } from '@/lib/supabase-server'
import { NextRequest } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('playlists')
    .select('id, name, audio_url, cue_points, items, created_at')
    .eq('id', parseInt(id))
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ data })
}
