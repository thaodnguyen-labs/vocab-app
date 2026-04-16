import { createServerClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = createServerClient()

  // Get all vocab with just the fields we need for calculation
  const { data: allVocab, error } = await supabase
    .from('vocab')
    .select('id, en, vn, status, used, year, week, level, created_at')

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const rows = allVocab || []
  const total = rows.length
  const learned = rows.filter((v) => v.status === 'YES').length
  const newCount = total - learned
  const totalPractice = rows.reduce((sum, v) => sum + (v.used || 0), 0)

  // Used-count thresholds (like 7️⃣ 5️⃣ 3️⃣)
  const usedGte7 = rows.filter((v) => (v.used || 0) >= 7).length
  const usedGte5 = rows.filter((v) => (v.used || 0) >= 5).length
  const usedGte3 = rows.filter((v) => (v.used || 0) >= 3).length

  // Playlist count
  const { count: playlistCount } = await supabase
    .from('playlists')
    .select('*', { count: 'exact', head: true })

  // Breakdown by year -> weeks (how many rows per week)
  const byYearWeek: Record<string, { total: number; learned: number }> = {}
  for (const v of rows) {
    if (!v.year || !v.week) continue
    const key = `${v.year}-${v.week}`
    if (!byYearWeek[key]) byYearWeek[key] = { total: 0, learned: 0 }
    byYearWeek[key].total++
    if (v.status === 'YES') byYearWeek[key].learned++
  }

  // Breakdown by level (column J)
  const byLevel: Record<number, { total: number; learned: number }> = {}
  for (const v of rows) {
    const lvl = v.level || 1
    if (!byLevel[lvl]) byLevel[lvl] = { total: 0, learned: 0 }
    byLevel[lvl].total++
    if (v.status === 'YES') byLevel[lvl].learned++
  }

  // Recent 5
  const recent = [...rows]
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    .slice(0, 5)
    .map((v) => ({ id: v.id, en: v.en, vn: v.vn, status: v.status }))

  return Response.json({
    stats: {
      total,
      learned,
      newCount,
      totalPractice,
      usedGte7,
      usedGte5,
      usedGte3,
      playlists: playlistCount || 0,
    },
    byYearWeek,
    byLevel,
    recent,
  })
}
