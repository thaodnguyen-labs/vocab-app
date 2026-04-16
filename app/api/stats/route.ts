import { createServerClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = createServerClient()

  const [vocabRes, learnedRes, playlistRes, recentRes] = await Promise.all([
    supabase.from('vocab').select('*', { count: 'exact', head: true }),
    supabase.from('vocab').select('*', { count: 'exact', head: true }).eq('status', 'YES'),
    supabase.from('playlists').select('*', { count: 'exact', head: true }),
    supabase
      .from('vocab')
      .select('id, en, vn, status')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  return Response.json({
    stats: {
      total: vocabRes.count || 0,
      learned: learnedRes.count || 0,
      playlists: playlistRes.count || 0,
    },
    recent: recentRes.data || [],
  })
}
