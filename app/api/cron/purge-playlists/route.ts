import { createServerClient } from '@/lib/supabase-server'
import { NextRequest } from 'next/server'

export const maxDuration = 60

// Deletes every playlist row and every object in the `audio` bucket.
// Called by Vercel Cron daily at 19:00 UTC (02:00 ICT / Vietnam time).
// Vercel Cron sends `Authorization: Bearer $CRON_SECRET`.
export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET
  if (!expected) {
    return Response.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }
  const got = request.headers.get('authorization')
  if (got !== `Bearer ${expected}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()

  const { data: files, error: listErr } = await supabase.storage.from('audio').list('', {
    limit: 1000,
  })
  if (listErr) {
    return Response.json({ error: `list audio: ${listErr.message}` }, { status: 500 })
  }

  const names = (files || []).map((f) => f.name)
  if (names.length > 0) {
    const { error: rmErr } = await supabase.storage.from('audio').remove(names)
    if (rmErr) {
      return Response.json({ error: `remove audio: ${rmErr.message}` }, { status: 500 })
    }
  }

  const { error: delErr, count } = await supabase
    .from('playlists')
    .delete({ count: 'exact' })
    .gte('id', 0)
  if (delErr) {
    return Response.json({ error: `delete playlists: ${delErr.message}` }, { status: 500 })
  }

  return Response.json({
    ok: true,
    playlists_deleted: count ?? 0,
    audio_files_deleted: names.length,
    ran_at: new Date().toISOString(),
  })
}
