'use client'

import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'

interface ParsedRow {
  en: string
  vn: string
  source: string
  note: string
  week?: number
  status?: string
  used?: number
}

export default function ImportPage() {
  const [parsedData, setParsedData] = useState<ParsedRow[]>([])
  const [importing, setImporting] = useState(false)
  const [message, setMessage] = useState('')
  const [sheetNames, setSheetNames] = useState<string[]>([])
  const [selectedSheet, setSelectedSheet] = useState('')
  const [workbookRef, setWorkbookRef] = useState<XLSX.WorkBook | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer)
      const wb = XLSX.read(data, { type: 'array' })
      setWorkbookRef(wb)
      setSheetNames(wb.SheetNames)
      // Auto-select first sheet or "List" if it exists
      const defaultSheet = wb.SheetNames.includes('List') ? 'List' : wb.SheetNames[0]
      setSelectedSheet(defaultSheet)
      parseSheet(wb, defaultSheet)
    }
    reader.readAsArrayBuffer(file)
  }

  const parseSheet = (wb: XLSX.WorkBook, sheetName: string) => {
    const ws = wb.Sheets[sheetName]
    const json = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 })

    // Find header row (look for "EN" or "English" column)
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
        if (val === 'en' || val === 'english') { enCol = j; headerRow = i }
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
      // Fallback: assume first row is header with columns A=Week, B=No, C=EN, D=VN, E=Source, F=Note
      headerRow = 0
      enCol = 2 // C
      vnCol = 3 // D
      sourceCol = 4 // E
      noteCol = 5 // F
      weekCol = 0 // A
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

  const handleSheetChange = (sheetName: string) => {
    setSelectedSheet(sheetName)
    if (workbookRef) parseSheet(workbookRef, sheetName)
  }

  const handleImport = async () => {
    if (parsedData.length === 0) return
    setImporting(true)
    setMessage('')

    // Import in batches of 50
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

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Import Vocab</h1>
      <p className="text-sm text-muted mb-6">
        Upload an Excel (.xlsx) or CSV file, or paste a Google Sheets URL
      </p>

      {/* File upload */}
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
          className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-light transition"
        >
          Choose File (.xlsx, .csv)
        </button>
        <p className="text-xs text-muted mt-3">
          Expected columns: EN (English sentence), VN (Vietnamese), Source, Note
        </p>
      </div>

      {/* Google Sheets URL */}
      <div className="mb-6">
        <label className="text-sm font-medium block mb-1">Or paste Google Sheets URL</label>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="https://docs.google.com/spreadsheets/d/..."
            className="flex-1 text-sm px-3 py-2 border border-border rounded-lg"
            onKeyDown={async (e) => {
              if (e.key !== 'Enter') return
              const url = (e.target as HTMLInputElement).value.trim()
              if (!url) return

              // Convert Google Sheets URL to CSV export URL
              const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/)
              if (!match) {
                setMessage('Invalid Google Sheets URL')
                return
              }
              const sheetId = match[1]
              const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`

              try {
                setMessage('Fetching from Google Sheets...')
                const res = await fetch(csvUrl)
                const text = await res.text()
                const wb = XLSX.read(text, { type: 'string' })
                setWorkbookRef(wb)
                setSheetNames(wb.SheetNames)
                setSelectedSheet(wb.SheetNames[0])
                parseSheet(wb, wb.SheetNames[0])
              } catch {
                setMessage('Failed to fetch. Make sure the sheet is published/public.')
              }
            }}
          />
        </div>
        <p className="text-xs text-muted mt-1">Sheet must be public or &quot;published to web&quot;. Press Enter to load.</p>
      </div>

      {/* Sheet selector */}
      {sheetNames.length > 1 && (
        <div className="mb-4">
          <label className="text-sm font-medium block mb-1">Select Sheet</label>
          <div className="flex flex-wrap gap-2">
            {sheetNames.map((name) => (
              <button
                key={name}
                onClick={() => handleSheetChange(name)}
                className={`text-sm px-3 py-1 rounded-lg transition ${
                  selectedSheet === name
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Status message */}
      {message && (
        <p
          className={`text-sm mb-4 ${
            message.startsWith('Error') || message.startsWith('Failed')
              ? 'text-danger'
              : message.startsWith('Success')
              ? 'text-success'
              : 'text-primary'
          }`}
        >
          {message}
        </p>
      )}

      {/* Preview */}
      {parsedData.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Preview ({parsedData.length} entries)</h2>
            <button
              onClick={handleImport}
              disabled={importing}
              className="px-6 py-2 bg-success text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition"
            >
              {importing ? 'Importing...' : `Import ${parsedData.length} entries`}
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
                Showing first 50 of {parsedData.length} entries
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
