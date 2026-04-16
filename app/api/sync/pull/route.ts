import { createServerClient } from '@/lib/supabase-server'

interface SheetRow {
  week?: number | null
  no?: number | null
  en: string
  vn: string
  source?: string
  note?: string
  status?: string
  used?: number
}

export async function POST() {
  const supabase = createServerClient()

  // Get sheet script URL from settings
  const { data: settingsData } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'sheets_script_url')
    .single()

  const scriptUrl = settingsData?.value
  if (!scriptUrl) {
    return Response.json(
      { error: 'Google Sheets script URL not configured. Go to Sync page to set it up.' },
      { status: 400 }
    )
  }

  // Fetch from Google Apps Script
  try {
    const res = await fetch(scriptUrl, { method: 'GET' })
    const json = await res.json()

    if (json.error) return Response.json({ error: json.error }, { status: 500 })

    const rows: SheetRow[] = json.data || []
    if (rows.length === 0) return Response.json({ added: 0, updated: 0, total: 0 })

    // Get existing vocab to match by EN text (dedup)
    const { data: existing } = await supabase.from('vocab').select('id, en, vn, status, used')
    const existingMap = new Map(
      (existing || []).map((v) => [v.en.trim().toLowerCase(), v])
    )

    let added = 0
    let updated = 0
    const toAdd: SheetRow[] = []

    for (const row of rows) {
      if (!row.en?.trim()) continue
      const key = row.en.trim().toLowerCase()
      const match = existingMap.get(key)

      if (match) {
        // Update if status/used changed
        if (match.status !== row.status || match.used !== row.used) {
          await supabase
            .from('vocab')
            .update({
              status: row.status || 'NO',
              used: row.used || 0,
              vn: row.vn,
              source: row.source,
              note: row.note,
            })
            .eq('id', match.id)
          updated++
        }
      } else {
        toAdd.push(row)
      }
    }

    if (toAdd.length > 0) {
      const { data: inserted } = await supabase.from('vocab').insert(
        toAdd.map((r) => ({
          week: r.week || null,
          en: r.en.trim(),
          vn: r.vn || '',
          source: r.source || '',
          note: r.note || '',
          status: r.status || 'NO',
          used: r.used || 0,
        }))
      ).select()
      added = inserted?.length || 0
    }

    return Response.json({ added, updated, total: rows.length })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
