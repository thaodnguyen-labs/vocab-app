import { createServerClient } from '@/lib/supabase-server'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = createServerClient()
  const body = await request.json().catch(() => ({}))
  const action: 'append' | 'replace' = body.action === 'replace' ? 'replace' : 'append'

  // Get script URL
  const { data: settingsData } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'sheets_script_url')
    .single()

  const scriptUrl = settingsData?.value
  if (!scriptUrl) {
    return Response.json(
      { error: 'Google Sheets script URL not configured.' },
      { status: 400 }
    )
  }

  // Get all vocab
  const { data: vocab, error } = await supabase
    .from('vocab')
    .select('week, en, vn, source, note, status, used')
    .order('created_at', { ascending: true })

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const rows = (vocab || []).map((v, i) => ({
    week: v.week,
    no: i + 1,
    en: v.en,
    vn: v.vn,
    source: v.source || '',
    note: v.note || '',
    status: v.status || 'NO',
    used: v.used || 0,
  }))

  try {
    const res = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, rows }),
      redirect: 'follow',
    })
    const json = await res.json()
    if (json.error) return Response.json({ error: json.error }, { status: 500 })
    return Response.json({ ...json, count: rows.length })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
