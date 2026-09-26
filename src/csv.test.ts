import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CsvParseError, parseCsv, serializeCsv } from './csv.js'

test('parses a plain row', () => {
  const rows = parseCsv('a,b,c\n1,2,3\n')
  assert.deepEqual(
    rows.map((r) => r.fields),
    [
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]
  )
})

test('records the starting line of each row', () => {
  const rows = parseCsv('a,b\n1,2\n3,4\n')
  assert.deepEqual(
    rows.map((r) => r.line),
    [1, 2, 3]
  )
})

test('last row without a trailing newline is still captured', () => {
  const rows = parseCsv('a,b\n1,2')
  assert.deepEqual(
    rows.map((r) => r.fields),
    [
      ['a', 'b'],
      ['1', '2'],
    ]
  )
})

test('empty input produces no rows', () => {
  assert.deepEqual(parseCsv(''), [])
})

test('a single trailing newline does not add a phantom row', () => {
  const rows = parseCsv('a,b\n')
  assert.equal(rows.length, 1)
})

test('quoted field can contain the delimiter', () => {
  const rows = parseCsv('a,b\n"x,y",z\n')
  assert.deepEqual(rows[1]?.fields, ['x,y', 'z'])
})

test('doubled quotes inside a quoted field unescape to one quote', () => {
  const rows = parseCsv('a\n"she said ""hi"""\n')
  assert.deepEqual(rows[1]?.fields, ['she said "hi"'])
})

test('quoted field can contain an embedded newline', () => {
  const rows = parseCsv('a\n"line one\nline two"\n')
  assert.deepEqual(rows[1]?.fields, ['line one\nline two'])
})

test('\\r\\n and bare \\n are both treated as row separators', () => {
  const rows = parseCsv('a,b\r\n1,2\n3,4\r\n')
  assert.deepEqual(
    rows.map((r) => r.fields),
    [
      ['a', 'b'],
      ['1', '2'],
      ['3', '4'],
    ]
  )
})

test('a custom single-character delimiter is honored', () => {
  const rows = parseCsv('a;b\n1;2\n', { delimiter: ';' })
  assert.deepEqual(rows[1]?.fields, ['1', '2'])
})

test('a multi-character delimiter is rejected up front', () => {
  assert.throws(() => parseCsv('a,b', { delimiter: ';;' }), /exactly one character/)
})

test('an unterminated quote reports the position at end of input', () => {
  const input = 'a,b\n1,"unterminated'
  try {
    parseCsv(input)
    assert.fail('expected parseCsv to throw')
  } catch (error) {
    assert.ok(error instanceof CsvParseError)
    assert.equal(error.line, 2)
    assert.equal(error.column, 16)
    assert.match(error.message, /unterminated quoted field/)
  }
})

test('a quote in the middle of an unquoted field is rejected', () => {
  const input = 'a,b\n1,ab"cd\n'
  try {
    parseCsv(input)
    assert.fail('expected parseCsv to throw')
  } catch (error) {
    assert.ok(error instanceof CsvParseError)
    assert.equal(error.line, 2)
    assert.equal(error.column, 5)
  }
})

test('stray text after a closing quote is rejected', () => {
  const input = 'a,b\n1,"quoted"stray\n'
  try {
    parseCsv(input)
    assert.fail('expected parseCsv to throw')
  } catch (error) {
    assert.ok(error instanceof CsvParseError)
    assert.equal(error.line, 2)
    assert.equal(error.column, 11)
  }
})

test('serializeCsv round-trips through parseCsv', () => {
  const original = [
    ['a', 'b,c', 'd"e', 'f\ng'],
    ['1', '2', '3', '4'],
  ]
  const csv = serializeCsv(original)
  const rows = parseCsv(csv)
  assert.deepEqual(
    rows.map((r) => r.fields),
    original
  )
})

test('serializeCsv only quotes fields that need it', () => {
  const csv = serializeCsv([['plain', 'has,comma']])
  assert.equal(csv, 'plain,"has,comma"')
})
