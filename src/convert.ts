import { type CsvParseOptions, parseCsv, serializeCsv } from './csv.js'

export type JsonRecord = Record<string, string>

export class CsvShapeError extends Error {
  readonly line: number

  constructor(message: string, line: number) {
    super(`${message} (row starting at line ${line})`)
    this.name = 'CsvShapeError'
    this.line = line
  }
}

export function csvToJson(input: string, options: CsvParseOptions = {}): JsonRecord[] {
  const rows = parseCsv(input, options)
  if (rows.length === 0) {
    return []
  }

  const [header, ...body] = rows
  const columns = header.fields
  assertUniqueHeader(columns, header.line)

  return body.map((row) => {
    if (row.fields.length !== columns.length) {
      throw new CsvShapeError(
        `row has ${row.fields.length} field(s) but the header has ${columns.length}`,
        row.line
      )
    }
    const record: JsonRecord = {}
    columns.forEach((name, index) => {
      record[name] = row.fields[index] as string
    })
    return record
  })
}

export function jsonToCsv(records: JsonRecord[], options: CsvParseOptions = {}): string {
  if (records.length === 0) {
    return ''
  }

  const columns = Object.keys(records[0] as JsonRecord)
  const rows: string[][] = [columns]

  records.forEach((record, index) => {
    const row = columns.map((column) => {
      if (!(column in record)) {
        throw new Error(`record at index ${index} is missing field "${column}"`)
      }
      return record[column] as string
    })
    rows.push(row)
  })

  return serializeCsv(rows, options)
}

function assertUniqueHeader(columns: string[], headerLine: number): void {
  const seen = new Set<string>()
  for (const name of columns) {
    if (seen.has(name)) {
      throw new CsvShapeError(`duplicate column name "${name}" in header`, headerLine)
    }
    seen.add(name)
  }
}
