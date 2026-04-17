import { createServerClient } from '@/lib/supabase-server'
import { NextRequest } from 'next/server'

export async function GET() {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('playlists')
    .select('id, name, audio_url, cue_points, items, created_at')
    .order('created_at', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ data: data || [] })
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient()
  const { name, items } = await request.json()

  if (!name || !Array.isArray(items) || items.length === 0) {
    return Response.json({ error: 'name and non-empty items are required' }, { status: 400 })
  }

  const { data: playlist, error } = await supabase
    .from('playlists')
    .insert({ name, items })
    .select('id, name, audio_url, cue_points, items, created_at')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ data: playlist })
}

export async function DELETE(request: NextRequest) {
  const supabase = createServerClient()
  const { id } = await request.json()

  const { error } = await supabase.from('playlists').delete().eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
