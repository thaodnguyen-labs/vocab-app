import { createServerClient } from '@/lib/supabase-server'

export const maxDuration = 30

export interface SheetRow {
  week?: number | null
  no?: number | null
  en: string
  vn: string
  source?: string
  note?: string
  status?: string
  used?: number
}

async function getScriptUrl(): Promise<{ url?: string; error?: string }> {
  const supabase = createServerClient()
  const { data } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'sheets_script_url')
    .single()

  const url = data?.value
  if (!url) return { error: 'Google Sheets script URL not configured.' }
  return { url }
}

async function fetchSheetJson<T>(url: string): Promise<{ data?: T; error?: string }> {
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })

    const contentType = res.headers.get('content-type') || ''
    const text = await res.text()

    if (!contentType.includes('json')) {
      return {
        error: `Google Apps Script returned HTML instead of JSON (status ${res.status}). Redeploy the script with "Who has access: Anyone" and verify the URL.`,
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

export async function GET() {
  const { url, error } = await getScriptUrl()
  if (error) return Response.json({ error }, { status: 400 })

  const json = await fetchSheetJson<SheetRow[]>(url!)
  if (json.error) return Response.json({ error: json.error }, { status: 500 })

  return Response.json({ data: json.data || [] })
}

export { getScriptUrl }
