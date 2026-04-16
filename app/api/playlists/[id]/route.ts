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
    .select(`
      *,
      playlist_items (
        position,
        vocab:vocab_id (id, en, vn, note, source, used, status)
      )
    `)
    .eq('id', parseInt(id))
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Sort items by position
  if (data?.playlist_items) {
    data.playlist_items.sort(
      (a: { position: number }, b: { position: number }) => a.position - b.position
    )
  }

  return Response.json({ data })
}
