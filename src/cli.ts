import { readFileSync } from 'node:fs'
import { CsvParseError } from './csv.js'
import { CsvShapeError, csvToJson, jsonToCsv, type JsonRecord } from './convert.js'

function readStdin(): string {
  return readFileSync(0, 'utf8')
}

function main(argv: string[]): number {
  const command = argv[0]

  if (command === 'to-json') {
    const input = readStdin()
    const records = csvToJson(input)
    process.stdout.write(`${JSON.stringify(records, null, 2)}\n`)
    return 0
  }

  if (command === 'to-csv') {
    const input = readStdin()
    const records = JSON.parse(input) as JsonRecord[]
    process.stdout.write(`${jsonToCsv(records)}\n`)
    return 0
  }

  process.stderr.write('usage: strict-csv-json <to-json|to-csv>  (reads stdin, writes stdout)\n')
  return 1
}

try {
  process.exitCode = main(process.argv.slice(2))
} catch (error) {
  if (error instanceof CsvParseError || error instanceof CsvShapeError) {
    process.stderr.write(`${error.message}\n`)
  } else {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  }
  process.exitCode = 1
}
