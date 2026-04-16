'use client'

import { useState, useRef } from 'react'
import type * as XLSXType from 'xlsx'

interface ParsedRow {
  en: string
  vn: string
  source: string
  note: string
  week?: number
  status?: string
  used?: number
}

// Lazy-load the heavy xlsx library only when needed
let xlsxModule: typeof XLSXType | null = null
async function loadXlsx(): Promise<typeof XLSXType> {
  if (xlsxModule) return xlsxModule
  xlsxModule = await import('xlsx')
  return xlsxModule
}

export default function ImportPage() {
  const [parsedData, setParsedData] = useState<ParsedRow[]>([])
  const [importing, setImporting] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [message, setMessage] = useState('')
  const [sheetNames, setSheetNames] = useState<string[]>([])
  const [selectedSheet, setSelectedSheet] = useState('')
  const [workbookRef, setWorkbookRef] = useState<XLSXType.WorkBook | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setParsing(true)
    setMessage('Loading file...')

    const XLSX = await loadXlsx()
    const reader = new FileReader()
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer)
      const wb = XLSX.read(data, { type: 'array' })
      setWorkbookRef(wb)
      setSheetNames(wb.SheetNames)
      const defaultSheet = wb.SheetNames.includes('List') ? 'List' : wb.SheetNames[0]
      setSelectedSheet(defaultSheet)
      parseSheet(XLSX, wb, defaultSheet)
      setParsing(false)
    }
    reader.readAsArrayBuffer(file)
  }

  const parseSheet = (XLSX: typeof XLSXType, wb: XLSXType.WorkBook, sheetName: string) => {
    const ws = wb.Sheets[sheetName]
    const json = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 })

    let headerRow = -1
    let enCol = -1
    let vnCol = -1
    let sourceCol = -1
    let noteCol = -1
    let weekCol = -1
    let statusCol = -1
    let usedCol = -1

    for (let i = 0; i < Math.min(5, json.length); i++) {
      const row = json[i] as string[]
      if (!row) continue
      for (let j = 0; j < row.length; j++) {
        const val = String(row[j] || '').toLowerCase().trim()
        if (val === 'en' || val === 'english') {
          enCol = j
          headerRow = i
        }
        if (val === 'vn' || val === 'vietnamese') vnCol = j
        if (val === 'source') sourceCol = j
        if (val === 'note') noteCol = j
        if (val === 'week') weekCol = j
        if (val === 'status') statusCol = j
        if (val === 'used') usedCol = j
      }
      if (headerRow >= 0) break
    }

    if (headerRow < 0) {
      headerRow = 0
      enCol = 2
      vnCol = 3
      sourceCol = 4
      noteCol = 5
      weekCol = 0
    }

    const rows: ParsedRow[] = []
    for (let i = headerRow + 1; i < json.length; i++) {
      const row = json[i] as (string | number | undefined)[]
      if (!row) continue

      const en = String(row[enCol] || '').trim()
      const vn = String(row[vnCol] || '').trim()
      if (!en && !vn) continue

      rows.push({
        en,
        vn,
        source: sourceCol >= 0 ? String(row[sourceCol] || '').trim() : '',
        note: noteCol >= 0 ? String(row[noteCol] || '').trim() : '',
        week: weekCol >= 0 ? Number(row[weekCol]) || undefined : undefined,
        status: statusCol >= 0 ? String(row[statusCol] || 'NO').trim() : 'NO',
        used: usedCol >= 0 ? Number(row[usedCol]) || 0 : 0,
      })
    }

    setParsedData(rows)
    setMessage(`Found ${rows.length} vocab entries in "${sheetName}"`)
  }

  const handleSheetChange = async (sheetName: string) => {
    setSelectedSheet(sheetName)
    if (workbookRef) {
      const XLSX = await loadXlsx()
      parseSheet(XLSX, workbookRef, sheetName)
    }
  }

  const handleImport = async () => {
    if (parsedData.length === 0) return
    setImporting(true)
    setMessage('')

    const batchSize = 50
    let imported = 0

    for (let i = 0; i < parsedData.length; i += batchSize) {
      const batch = parsedData.slice(i, i + batchSize)
      const res = await fetch('/api/vocab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch),
      })
      const result = await res.json()
      if (result.error) {
        setMessage(`Error at batch ${i}: ${result.error}`)
        setImporting(false)
        return
      }
      imported += result.data.length
      setMessage(`Importing... ${imported}/${parsedData.length}`)
    }

    setMessage(`Successfully imported ${imported} vocab entries!`)
    setImporting(false)
    setParsedData([])
  }

  const handleGoogleSheet = async (url: string) => {
    if (!url) return
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/)
    if (!match) {
      setMessage('Invalid Google Sheets URL')
      return
    }
    const sheetId = match[1]
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`

    try {
      setMessage('Fetching from Google Sheets...')
      setParsing(true)
      const XLSX = await loadXlsx()
      const res = await fetch(csvUrl)
      const text = await res.text()
      const wb = XLSX.read(text, { type: 'string' })
      setWorkbookRef(wb)
      setSheetNames(wb.SheetNames)
      setSelectedSheet(wb.SheetNames[0])
      parseSheet(XLSX, wb, wb.SheetNames[0])
    } catch {
      setMessage('Failed to fetch. Make sure the sheet is published/public.')
    } finally {
      setParsing(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1 text-foreground">Import Vocab</h1>
      <p className="text-sm text-muted mb-6">
        Upload an Excel (.xlsx) or CSV file, or paste a Google Sheets URL
      </p>

      <div className="bg-card border-2 border-dashed border-border rounded-xl p-8 text-center mb-6">
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFile}
          className="hidden"
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={parsing}
          className="px-6 py-3 bg-foreground text-background rounded-lg font-medium hover:opacity-80 disabled:opacity-50 transition"
        >
          {parsing ? 'Loading...' : 'Choose File (.xlsx, .csv)'}
        </button>
        <p className="text-xs text-muted mt-3">
          Expected columns: EN (English sentence), VN (Vietnamese), Source, Note
        </p>
      </div>

      <div className="mb-6">
        <label className="text-sm font-medium block mb-1 text-foreground">
          Or paste Google Sheets URL
        </label>
        <input
          type="text"
          placeholder="https://docs.google.com/spreadsheets/d/..."
          className="w-full text-sm px-3 py-2 border border-border rounded-lg bg-near-white focus:outline-none focus:border-foreground text-foreground"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleGoogleSheet((e.target as HTMLInputElement).value.trim())
          }}
        />
        <p className="text-xs text-muted mt-1">
          Sheet must be public or &quot;published to web&quot;. Press Enter to load.
        </p>
      </div>

      {sheetNames.length > 1 && (
        <div className="mb-4">
          <label className="text-sm font-medium block mb-1 text-foreground">Select Sheet</label>
          <div className="flex flex-wrap gap-2">
            {sheetNames.map((name) => (
              <button
                key={name}
                onClick={() => handleSheetChange(name)}
                className={`text-sm px-3 py-1 rounded-lg transition font-medium ${
                  selectedSheet === name
                    ? 'bg-foreground text-background'
                    : 'bg-row-alt text-muted hover:bg-border'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {message && (
        <p
          className={`text-sm mb-4 ${
            message.startsWith('Error') || message.startsWith('Failed')
              ? 'text-danger'
              : message.startsWith('Success')
              ? 'text-foreground font-medium'
              : 'text-muted'
          }`}
        >
          {message}
        </p>
      )}

      {parsedData.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground">
              Preview ({parsedData.length} entries)
            </h2>
            <button
              onClick={handleImport}
              disabled={importing}
              className="px-6 py-2 bg-foreground text-background rounded-lg font-medium hover:opacity-80 disabled:opacity-50 transition"
            >
              {importing ? 'Importing...' : `Import ${parsedData.length}`}
            </button>
          </div>

          <div className="overflow-x-auto border border-border rounded-lg max-h-96">
            <table className="vocab-grid w-full border-collapse">
              <thead>
                <tr>
                  <th>#</th>
                  <th>English</th>
                  <th>Vietnamese</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {parsedData.slice(0, 50).map((row, i) => (
                  <tr key={i}>
                    <td className="text-xs text-muted">{i + 1}</td>
                    <td className="text-sm">{row.en}</td>
                    <td className="text-sm">{row.vn}</td>
                    <td className="text-xs text-muted">{row.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parsedData.length > 50 && (
              <p className="text-xs text-muted p-2 text-center">
                Showing first 50 of {parsedData.length}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
