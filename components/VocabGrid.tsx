'use client'

import { useState, useRef, useCallback } from 'react'

interface VocabRow {
  en: string
  vn: string
  source: string
  note: string
}

const EMPTY_ROW: VocabRow = { en: '', vn: '', source: '', note: '' }
const COLUMNS: { key: keyof VocabRow; label: string; width: string }[] = [
  { key: 'en', label: 'English', width: 'min-w-[250px]' },
  { key: 'vn', label: 'Vietnamese', width: 'min-w-[250px]' },
  { key: 'source', label: 'Source', width: 'min-w-[150px]' },
  { key: 'note', label: 'Note', width: 'min-w-[200px]' },
]

export default function VocabGrid({
  onSave,
  saving,
}: {
  onSave: (rows: VocabRow[]) => void
  saving: boolean
}) {
  const [rows, setRows] = useState<VocabRow[]>(
    Array.from({ length: 10 }, () => ({ ...EMPTY_ROW }))
  )
  const tableRef = useRef<HTMLTableElement>(null)

  const updateCell = useCallback((rowIdx: number, col: keyof VocabRow, value: string) => {
    setRows((prev) => {
      const next = [...prev]
      next[rowIdx] = { ...next[rowIdx], [col]: value }
      return next
    })
  }, [])

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const text = e.clipboardData.getData('text/plain')
      if (!text.includes('\t') && !text.includes('\n')) return // not tabular data

      e.preventDefault()
      const target = e.target as HTMLElement
      const td = target.closest('td')
      if (!td) return

      const rowIdx = parseInt(td.dataset.row || '0')
      const colIdx = parseInt(td.dataset.col || '0')

      const pastedRows = text
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => line.split('\t'))

      setRows((prev) => {
        const next = [...prev]
        // Ensure enough rows
        while (next.length < rowIdx + pastedRows.length) {
          next.push({ ...EMPTY_ROW })
        }

        for (let r = 0; r < pastedRows.length; r++) {
          const targetRow = rowIdx + r
          for (let c = 0; c < pastedRows[r].length; c++) {
            const targetCol = colIdx + c
            if (targetCol < COLUMNS.length) {
              next[targetRow] = {
                ...next[targetRow],
                [COLUMNS[targetCol].key]: pastedRows[r][c].trim(),
              }
            }
          }
        }
        return next
      })
    },
    []
  )

  const addRows = () => {
    setRows((prev) => [...prev, ...Array.from({ length: 5 }, () => ({ ...EMPTY_ROW }))])
  }

  const removeRow = (idx: number) => {
    setRows((prev) => prev.filter((_, i) => i !== idx))
  }

  const clearAll = () => {
    setRows(Array.from({ length: 10 }, () => ({ ...EMPTY_ROW })))
  }

  const filledRows = rows.filter((r) => r.en.trim() || r.vn.trim())

  const handleSave = () => {
    const valid = filledRows.filter((r) => r.en.trim() && r.vn.trim())
    if (valid.length === 0) return
    onSave(valid)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-muted">
          {filledRows.length} rows filled. Paste from Excel/Sheets or type directly.
        </p>
        <div className="flex gap-2">
          <button
            onClick={clearAll}
            className="text-sm px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 transition"
          >
            Clear
          </button>
          <button
            onClick={addRows}
            className="text-sm px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 transition"
          >
            + 5 rows
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border border-border rounded-lg">
        <table ref={tableRef} className="vocab-grid w-full border-collapse" onPaste={handlePaste}>
          <thead>
            <tr>
              <th className="w-8">#</th>
              {COLUMNS.map((col) => (
                <th key={col.key} className={col.width}>
                  {col.label}
                </th>
              ))}
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr key={rowIdx}>
                <td className="text-center text-xs text-muted !min-w-0">{rowIdx + 1}</td>
                {COLUMNS.map((col, colIdx) => (
                  <td
                    key={col.key}
                    data-row={rowIdx}
                    data-col={colIdx}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) =>
                      updateCell(rowIdx, col.key, e.currentTarget.textContent || '')
                    }
                    className="text-sm"
                  >
                    {row[col.key]}
                  </td>
                ))}
                <td className="!min-w-0 text-center">
                  <button
                    onClick={() => removeRow(rowIdx)}
                    className="text-gray-400 hover:text-danger text-xs"
                    title="Remove row"
                  >
                    x
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving || filledRows.length === 0}
          className="px-6 py-2 bg-foreground text-background rounded-lg font-medium hover:opacity-80 disabled:opacity-50 transition"
        >
          {saving ? 'Saving...' : `Save ${filledRows.length} vocab`}
        </button>
      </div>
    </div>
  )
}
