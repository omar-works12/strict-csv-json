import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CsvShapeError, csvToJson, jsonToCsv } from './convert.js'

test('csvToJson maps header names to row values', () => {
  const records = csvToJson('name,age\nAda,36\nGrace,85\n')
  assert.deepEqual(records, [
    { name: 'Ada', age: '36' },
    { name: 'Grace', age: '85' },
  ])
})

test('csvToJson on header-only input returns an empty array of records', () => {
  assert.deepEqual(csvToJson('name,age\n'), [])
})

test('csvToJson on empty input returns an empty array', () => {
  assert.deepEqual(csvToJson(''), [])
})

test('a row with too few fields is rejected with its line number', () => {
  const input = 'name,age,city\nAna,34,Berlin\nBo,29\n'
  try {
    csvToJson(input)
    assert.fail('expected csvToJson to throw')
  } catch (error) {
    assert.ok(error instanceof CsvShapeError)
    assert.equal(error.line, 3)
    assert.match(error.message, /has 2 field\(s\) but the header has 3/)
  }
})

test('a duplicate header name is rejected', () => {
  try {
    csvToJson('name,name\na,b\n')
    assert.fail('expected csvToJson to throw')
  } catch (error) {
    assert.ok(error instanceof CsvShapeError)
    assert.match(error.message, /duplicate column name "name"/)
  }
})

test('jsonToCsv writes the header from the first record\'s keys', () => {
  const csv = jsonToCsv([
    { name: 'Ada', age: '36' },
    { name: 'Grace', age: '85' },
  ])
  assert.equal(csv, 'name,age\r\nAda,36\r\nGrace,85')
})

test('jsonToCsv on an empty array produces an empty string', () => {
  assert.equal(jsonToCsv([]), '')
})

test('jsonToCsv rejects a record missing a column present in the first record', () => {
  assert.throws(
    () => jsonToCsv([{ name: 'Ada', age: '36' }, { name: 'Grace' } as unknown as Record<string, string>]),
    /record at index 1 is missing field "age"/
  )
})
