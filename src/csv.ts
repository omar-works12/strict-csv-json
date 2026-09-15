// Minimal RFC 4180 style CSV parser and serializer.
// The parser tracks line/column as it scans so every failure can point
// at the exact character that broke the grammar, instead of just
// saying "malformed CSV" and leaving the reader to guess.

export interface CsvParseOptions {
  delimiter?: string
}

export interface CsvRow {
  fields: string[]
  /** 1-based line number where this row's first field began. */
  line: number
}

export class CsvParseError extends Error {
  readonly line: number
  readonly column: number

  constructor(message: string, line: number, column: number, source: string) {
    super(CsvParseError.render(message, line, column, source))
    this.name = 'CsvParseError'
    this.line = line
    this.column = column
  }

  private static render(message: string, line: number, column: number, source: string): string {
    const sourceLine = source.split(/\r\n|\r|\n/)[line - 1] ?? ''
    const pointer = `${' '.repeat(Math.max(column - 1, 0))}^`
    return `${message} (line ${line}, column ${column})\n  ${sourceLine}\n  ${pointer}`
  }
}

export function parseCsv(input: string, options: CsvParseOptions = {}): CsvRow[] {
  const delimiter = options.delimiter ?? ','
  if (delimiter.length !== 1) {
    throw new Error('delimiter must be exactly one character')
  }

  const rows: CsvRow[] = []
  let row: string[] = []
  let field = ''
  let line = 1
  let column = 1
  let rowStartLine = 1
  let inQuotes = false
  let fieldStarted = false
  let justClosedQuote = false

  const fail = (message: string): never => {
    throw new CsvParseError(message, line, column, input)
  }

  const endField = (): void => {
    row.push(field)
    field = ''
    fieldStarted = false
    justClosedQuote = false
  }

  const endRow = (): void => {
    endField()
    rows.push({ fields: row, line: rowStartLine })
    row = []
  }

  let i = 0
  while (i < input.length) {
    const char = input[i]
    const isNewline = char === '\n' || char === '\r'
    const newlineWidth = char === '\r' && input[i + 1] === '\n' ? 2 : 1

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"'
          i += 2
          column += 2
          continue
        }
        inQuotes = false
        justClosedQuote = true
        i += 1
        column += 1
        continue
      }
      if (isNewline) {
        field += '\n'
        i += newlineWidth
        line += 1
        column = 1
        continue
      }
      field += char
      i += 1
      column += 1
      continue
    }

    if (justClosedQuote && !isNewline && char !== delimiter) {
      fail(`unexpected character ${JSON.stringify(char)} after closing quote`)
    }

    if (char === delimiter) {
      endField()
      i += 1
      column += 1
      continue
    }

    if (isNewline) {
      endRow()
      i += newlineWidth
      line += 1
      column = 1
      rowStartLine = line
      continue
    }

    if (char === '"') {
      if (fieldStarted) {
        fail('unexpected quote in the middle of an unquoted field')
      }
      inQuotes = true
      fieldStarted = true
      i += 1
      column += 1
      continue
    }

    field += char
    fieldStarted = true
    i += 1
    column += 1
  }

  if (inQuotes) {
    fail('unterminated quoted field (reached end of input before closing quote)')
  }

  if (field.length > 0 || row.length > 0 || fieldStarted) {
    endRow()
  }

  return rows
}

export function serializeCsv(rows: string[][], options: CsvParseOptions = {}): string {
  const delimiter = options.delimiter ?? ','
  return rows.map((row) => row.map((field) => escapeField(field, delimiter)).join(delimiter)).join('\r\n')
}

function escapeField(field: string, delimiter: string): string {
  const needsQuoting = field.includes(delimiter) || field.includes('"') || field.includes('\n') || field.includes('\r')
  if (!needsQuoting) {
    return field
  }
  return `"${field.replace(/"/g, '""')}"`
}
