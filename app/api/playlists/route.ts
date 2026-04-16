import { createServerClient } from '@/lib/supabase-server'
import { NextRequest } from 'next/server'

export async function GET() {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('playlists')
    .select(`
      *,
      playlist_items (
        position,
        vocab:vocab_id (id, en, vn)
      )
    `)
    .order('created_at', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Sort items by position
  const sorted = data?.map((p) => ({
    ...p,
    playlist_items: p.playlist_items?.sort(
      (a: { position: number }, b: { position: number }) => a.position - b.position
    ),
  }))

  return Response.json({ data: sorted })
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient()
  const { name, vocabIds } = await request.json()

  // Create playlist
  const { data: playlist, error: playlistError } = await supabase
    .from('playlists')
    .insert({ name })
    .select()
    .single()

  if (playlistError) return Response.json({ error: playlistError.message }, { status: 500 })

  // Add items
  const items = (vocabIds as number[]).map((vocabId, i) => ({
    playlist_id: playlist.id,
    vocab_id: vocabId,
    position: i,
  }))

  const { error: itemsError } = await supabase
    .from('playlist_items')
    .insert(items)

  if (itemsError) return Response.json({ error: itemsError.message }, { status: 500 })

  return Response.json({ data: playlist })
}

export async function DELETE(request: NextRequest) {
  const supabase = createServerClient()
  const { id } = await request.json()

  const { error } = await supabase.from('playlists').delete().eq('id', id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
