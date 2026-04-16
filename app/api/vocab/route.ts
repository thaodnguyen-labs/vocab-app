import { createServerClient } from '@/lib/supabase-server'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = createServerClient()
  const sp = request.nextUrl.searchParams
  const search = sp.get('search') || ''
  const status = sp.get('status') // 'YES', 'NO', or null
  const limit = parseInt(sp.get('limit') || '100')
  const offset = parseInt(sp.get('offset') || '0')
  const minimal = sp.get('minimal') === '1' // just id, en, vn

  const selectCols = minimal ? 'id, en, vn, status, used' : '*'

  let query = supabase
    .from('vocab')
    .select(selectCols, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (search) {
    query = query.or(`en.ilike.%${search}%,vn.ilike.%${search}%`)
  }
  if (status) {
    query = query.eq('status', status)
  }

  const { data, error, count } = await query

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ data, count })
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient()
  const body = await request.json()
  const rows = Array.isArray(body) ? body : [body]

  const { data, error } = await supabase.from('vocab').insert(rows).select()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ data })
}

export async function PUT(request: NextRequest) {
  const supabase = createServerClient()
  const body = await request.json()
  const { id, ...updates } = body

  const { data, error } = await supabase
    .from('vocab')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ data })
}

export async function DELETE(request: NextRequest) {
  const supabase = createServerClient()
  const { id } = await request.json()

  const { error } = await supabase.from('vocab').delete().eq('id', id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
