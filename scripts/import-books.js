import 'dotenv/config'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { createRequire } from 'module'
import { createClient } from '@supabase/supabase-js'

const require = createRequire(import.meta.url)
const XLSX = require('xlsx')

const __dirname = dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const INVENTORY_ID = 1
const USER_ID = '0a8a546c-8abc-4d16-92a0-98b592ee97c3'

const STATUS_MAP = {
  'read':              2,
  'to-read':           3,
  'currently-reading': 1,
}

function parseTitle(raw) {
  if (!raw) return { title: '', series_name: null, series_number: null }
  const match = String(raw).match(/^(.+?)\s+\((.+?),\s*#(\d+(?:\.\d+)?)\)\s*$/)
  if (match) {
    return {
      title:         match[1].trim(),
      series_name:   match[2].trim(),
      series_number: parseFloat(match[3]),
    }
  }
  return { title: String(raw).trim(), series_name: null, series_number: null }
}

function readSheet(filePath) {
  const wb = XLSX.readFile(filePath)
  const ws = wb.Sheets[wb.SheetNames[0]]
  return XLSX.utils.sheet_to_json(ws, { defval: '' })
}

function str(v) { return String(v ?? '').trim() }
function num(v) { const n = Number(v); return isNaN(n) ? null : n }

function buildItem(row, source) {
  const bookshelves    = str(row['Bookshelves']).toLowerCase()
  const exclusiveShelf = str(row['Exclusive Shelf']).toLowerCase()

  let status       = STATUS_MAP[exclusiveShelf] ?? 3
  let needs_review = false

  if (bookshelves.includes('dnf-at-least-for-now')) {
    status = 4
  } else if (exclusiveShelf === 'currently-reading') {
    needs_review = true
  }

  const { title, series_name, series_number } = parseTitle(row['Title'])

  const goodreads_rating = num(row['My Rating']) ?? 0

  const attributes = {
    goodreads_id:    str(row['Book Id']),
    source,
    author:          str(row['Author']) || undefined,
    goodreads_rating,
    capacity_rating: 'medium',
    format:          'ebook',
    ai_enriched:     false,
  }

  const additionalAuthors = str(row['Additional Authors'])
  if (additionalAuthors) attributes.additional_authors = additionalAuthors

  const pages = num(row['Number of Pages'])
  if (pages && pages > 0) attributes.pages = pages

  const yearPublished = num(row['Year Published'])
  if (yearPublished && yearPublished > 0) attributes.year_published = yearPublished

  const dateRead = str(row['Date Read'])
  if (dateRead) attributes.date_read = dateRead

  const dateAdded = str(row['Date Added'])
  if (dateAdded) attributes.date_added = dateAdded

  const readCount = num(row['Read Count'])
  if (readCount && readCount > 0) attributes.read_count = readCount

  if (series_name) {
    attributes.series_name   = series_name
    attributes.series_number = series_number
  }

  return {
    inventory_id: INVENTORY_ID,
    user_id:      USER_ID,
    title,
    status,
    needs_review,
    tags:         [],
    notes:        null,
    attributes,
  }
}

async function run() {
  const mainPath   = join(__dirname, '..', 'data', 'goodreads_library_export.xlsx')
  const catrykPath = join(__dirname, '..', 'data', 'goodreads_library_export_Catryx.xlsx')

  console.log('Reading XLSX files...')
  const mainRows   = readSheet(mainPath)
  const catrykRows = readSheet(catrykPath)
  console.log(`  Main account:   ${mainRows.length} rows`)
  console.log(`  Public account: ${catrykRows.length} rows`)

  // Build map by goodreads_id — main account takes priority
  const itemsMap = new Map()
  for (const row of catrykRows) {
    const id = str(row['Book Id'])
    if (id) itemsMap.set(id, buildItem(row, 'goodreads-public'))
  }
  for (const row of mainRows) {
    const id = str(row['Book Id'])
    if (id) itemsMap.set(id, buildItem(row, 'goodreads-main'))
  }

  console.log(`\nUnique books after deduplication: ${itemsMap.size}`)

  // Fetch existing goodreads_ids
  console.log('\nChecking existing records in Supabase...')
  const { data: existing, error: fetchErr } = await supabase
    .from('inventory_items')
    .select('attributes')
    .eq('inventory_id', INVENTORY_ID)

  if (fetchErr) {
    console.error('Failed to fetch existing records:', fetchErr.message)
    process.exit(1)
  }

  const existingIds = new Set(
    (existing || []).map(r => r.attributes?.goodreads_id).filter(Boolean)
  )
  console.log(`  ${existingIds.size} books already in database`)

  const toInsert = [...itemsMap.values()].filter(
    item => !existingIds.has(item.attributes.goodreads_id)
  )
  const skipped = itemsMap.size - toInsert.length

  if (toInsert.length === 0) {
    console.log('\nNothing new to insert.')
  } else {
    console.log(`\nInserting ${toInsert.length} new books in batches of 100...`)
  }

  let inserted = 0
  let failed   = 0
  const BATCH  = 100

  for (let i = 0; i < toInsert.length; i += BATCH) {
    const batch = toInsert.slice(i, i + BATCH)
    const { error } = await supabase.from('inventory_items').insert(batch)
    if (error) {
      console.error(`  Batch ${Math.floor(i / BATCH) + 1} failed: ${error.message}`)
      failed += batch.length
    } else {
      inserted += batch.length
      process.stdout.write(`  ${inserted} / ${toInsert.length} inserted...\r`)
    }
  }

  if (toInsert.length > 0) process.stdout.write('\n')

  console.log('\n── Summary ─────────────────────────────')
  console.log(`  Total unique books processed: ${itemsMap.size}`)
  console.log(`  Already in database (skipped): ${skipped}`)
  console.log(`  Newly inserted:               ${inserted}`)
  if (failed > 0)
    console.log(`  Failed:                       ${failed}`)
  console.log('────────────────────────────────────────')
}

run().catch(err => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
