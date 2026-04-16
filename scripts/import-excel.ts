/**
 * One-time script to import existing vocab from Daily English 2025.xlsx
 *
 * Usage:
 *   npx tsx scripts/import-excel.ts
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import * as XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  const xlsxPath = path.resolve(__dirname, '../../Daily English 2025.xlsx')

  if (!fs.existsSync(xlsxPath)) {
    console.error(`File not found: ${xlsxPath}`)
    process.exit(1)
  }

  console.log(`Reading ${xlsxPath}...`)
  const wb = XLSX.readFile(xlsxPath)

  // Parse the "List" sheet (main vocab)
  const ws = wb.Sheets['List']
  if (!ws) {
    console.error('Sheet "List" not found')
    process.exit(1)
  }

  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { header: 1 })

  // Row 0 is header: Week(A), No(B), EN(C), VN(D), Source(E), Note(F), ?, Status(H), Used(I)
  const rows: {
    week: number | null
    en: string
    vn: string
    source: string
    note: string
    status: string
    used: number
  }[] = []

  for (let i = 1; i < json.length; i++) {
    const row = json[i] as (string | number | undefined)[]
    if (!row) continue

    const en = String(row[2] || '').trim() // Column C
    const vn = String(row[3] || '').trim() // Column D
    if (!en && !vn) continue

    rows.push({
      week: Number(row[0]) || null, // Column A
      en,
      vn,
      source: String(row[4] || '').trim(), // Column E
      note: String(row[5] || '').trim(), // Column F
      status: String(row[7] || 'NO').trim(), // Column H
      used: Number(row[8]) || 0, // Column I
    })
  }

  console.log(`Parsed ${rows.length} vocab entries`)

  // Import in batches of 50
  const batchSize = 50
  let imported = 0

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    const { data, error } = await supabase.from('vocab').insert(batch).select()

    if (error) {
      console.error(`Error at batch ${i}:`, error.message)
      continue
    }

    imported += data.length
    console.log(`Imported ${imported}/${rows.length}`)
  }

  console.log(`Done! Total imported: ${imported}`)
}

main().catch(console.error)
