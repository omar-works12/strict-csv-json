# strict-csv-json

A CSV <-> JSON converter that treats malformed input as a first-class
problem instead of an afterthought. Most CSV libraries either silently
guess what you meant, or fail with something like `Error: parse error`
and leave you to bisect a 50,000-row file by hand. This one parses CSV
character by character, tracks line and column as it goes, and reports
exactly where things broke.

No dependencies. Standard library only.

## Why

CSV looks trivial until you hit the edge cases: quoted fields containing
commas, escaped quotes (`""`), embedded newlines, `\r\n` vs `\n`, and rows
that don't have the same number of columns as the header. When one of
those goes wrong in a file you didn't write, "invalid CSV" is not
enough information. You need to know which row, which line, which
character.

## Usage

Build once:

```sh
npm run build
```

### CLI

```sh
node dist/cli.js to-json < people.csv > people.json
node dist/cli.js to-csv  < people.json > people.csv
```

### Library

```ts
import { csvToJson, jsonToCsv } from './src/convert.js'

const records = csvToJson('name,age\nAda,36\nGrace,85\n')
// [{ name: 'Ada', age: '36' }, { name: 'Grace', age: '85' }]

const csv = jsonToCsv(records)
// 'name,age\r\nAda,36\r\nGrace,85'
```

### What the errors actually look like

Given a row that's short a column:

```csv
name,age,city
Ana,34,Berlin
Bo,29
```

```
row has 2 field(s) but the header has 3 (row starting at line 3)
```

Given an unterminated quote:

```csv
name,note
Ana,"unterminated
```

```
unterminated quoted field (reached end of input before closing quote) (line 2, column 18)
  Ana,"unterminated
                   ^
```

The line and column always refer to the original input text, not the
parsed field, so you can jump straight to the offending byte in your
editor.

## Development

```sh
npm test
```

Runs the parser and converter test suites with Node's built-in test
runner (`node --test`) against the compiled output.

## Status

Early skeleton. Parsing, serializing, and shape-mismatch errors work,
and the parser's edge cases are covered by tests. See the roadmap for
what's not built yet: custom delimiters and headerless CSV in the CLI,
streaming for large files, `--delimiter`/`--pretty` flags, and
publishing as a real package.
