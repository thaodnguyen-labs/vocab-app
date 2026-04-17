import { createServerClient } from '@/lib/supabase-server'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = createServerClient()
  const key = request.nextUrl.searchParams.get('key')

  if (key) {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', key)
      .single()
    return Response.json({ value: data?.value ?? null })
  }

  const { data, error } = await supabase.from('settings').select('*')
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const settings: Record<string, string> = {}
  for (const row of data || []) {
    settings[row.key] = row.value
  }
  return Response.json({ settings })
}

export async function PUT(request: NextRequest) {
  const supabase = createServerClient()
  const body = await request.json()

  const { error } = await supabase
    .from('settings')
    .upsert({ key: body.key, value: body.value, updated_at: new Date().toISOString() })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
