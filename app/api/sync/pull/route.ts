import { createServerClient } from '@/lib/supabase-server'

export const maxDuration = 30

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

async function fetchScriptJson(url: string): Promise<{ data?: SheetRow[]; error?: string }> {
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: { Accept: 'application/json' },
    })

    const contentType = res.headers.get('content-type') || ''
    const text = await res.text()

    if (!contentType.includes('json')) {
      // HTML response usually means Apps Script access is not "Anyone"
      // or the deployment URL is wrong
      return {
        error: `Google Apps Script returned HTML instead of JSON (status ${res.status}). This usually means: (1) The deployment is not set to "Anyone" access, or (2) The URL is wrong, or (3) The script has an error. Redeploy with "Who has access: Anyone" and try again.`,
      }
    }

    try {
      return JSON.parse(text)
    } catch {
      return { error: `Apps Script returned invalid JSON: ${text.slice(0, 200)}` }
    }
  } catch (err) {
    return { error: `Network error: ${String(err)}` }
  }
}

export async function POST() {
  const supabase = createServerClient()

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

  const json = await fetchScriptJson(scriptUrl)
  if (json.error) return Response.json({ error: json.error }, { status: 500 })

  const rows = json.data || []
  if (rows.length === 0) return Response.json({ added: 0, updated: 0, total: 0 })

  const { data: existing } = await supabase.from('vocab').select('id, en, vn, status, used')
  const existingMap = new Map((existing || []).map((v) => [v.en.trim().toLowerCase(), v]))

  let added = 0
  let updated = 0
  const toAdd: SheetRow[] = []

  for (const row of rows) {
    if (!row.en?.trim()) continue
    const key = row.en.trim().toLowerCase()
    const match = existingMap.get(key)

    if (match) {
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
    const { data: inserted } = await supabase
      .from('vocab')
      .insert(
        toAdd.map((r) => ({
          week: r.week || null,
          en: r.en.trim(),
          vn: r.vn || '',
          source: r.source || '',
          note: r.note || '',
          status: r.status || 'NO',
          used: r.used || 0,
        }))
      )
      .select()
    added = inserted?.length || 0
  }

  return Response.json({ added, updated, total: rows.length })
}
