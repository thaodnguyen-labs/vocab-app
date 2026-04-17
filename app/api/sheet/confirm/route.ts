import { NextRequest } from 'next/server'
import { getScriptUrl } from '../route'

export const maxDuration = 30

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const enList: unknown = body.enList
  if (!Array.isArray(enList) || enList.length === 0) {
    return Response.json({ error: 'enList is required' }, { status: 400 })
  }

  const { url, error } = await getScriptUrl()
  if (error) return Response.json({ error }, { status: 400 })

  try {
    const res = await fetch(url!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ action: 'confirm', enList }),
      redirect: 'follow',
    })

    const contentType = res.headers.get('content-type') || ''
    const text = await res.text()

    if (!contentType.includes('json')) {
      return Response.json(
        {
          error: `Google Apps Script returned HTML instead of JSON (status ${res.status}). Redeploy with "Anyone" access.`,
        },
        { status: 500 }
      )
    }

    const json = JSON.parse(text) as { error?: string; updated?: number }
    if (json.error) return Response.json({ error: json.error }, { status: 500 })
    return Response.json({ updated: json.updated ?? 0 })
  } catch (err) {
    return Response.json({ error: `Network error: ${String(err)}` }, { status: 500 })
  }
}
