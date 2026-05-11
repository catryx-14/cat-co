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

function str(v) { return String(v ?? '').trim() }

function parseTitle(raw) {
  if (!raw) return { title: '' }
  const match = String(raw).match(/^(.+?)\s+\((.+?),\s*#(\d+(?:\.\d+)?)\)\s*$/)
  if (match) return { title: match[1].trim() }
  return { title: String(raw).trim() }
}

function readSheet(filePath) {
  try {
    const wb = XLSX.readFile(filePath)
    const ws = wb.Sheets[wb.SheetNames[0]]
    return XLSX.utils.sheet_to_json(ws, { defval: '' })
  } catch (e) {
    console.warn(`  Could not read ${filePath}: ${e.message}`)
    return []
  }
}

async function run() {
  // ── Step 1: Read XLSX files ──────────────────────────────────
  console.log('── Step 1: Reading XLSX files ──────────────────────────')
  const mainRows = readSheet(join(__dirname, '..', 'data', 'goodreads_library_export.xlsx'))
  const catrykRows = readSheet(join(__dirname, '..', 'data', 'goodreads_library_export_Catryx.xlsx'))
  console.log(`  Main:   ${mainRows.length} rows`)
  console.log(`  Catryx: ${catrykRows.length} rows`)

  // Build map goodreads_id → { title, bookshelves } — main account takes priority
  const xlsxMap = new Map()
  for (const row of catrykRows) {
    const id = str(row['Book Id'])
    if (id) xlsxMap.set(id, { title: parseTitle(row['Title']).title, bookshelves: str(row['Bookshelves']) })
  }
  for (const row of mainRows) {
    const id = str(row['Book Id'])
    if (id) xlsxMap.set(id, { title: parseTitle(row['Title']).title, bookshelves: str(row['Bookshelves']) })
  }
  console.log(`  Unique books in XLSX by goodreads_id: ${xlsxMap.size}`)

  // ── Step 2: Fetch unenriched books ───────────────────────────
  console.log('\n── Step 2: Fetching unenriched books from Supabase ─────')
  const { data: books, error: fetchErr } = await supabase
    .from('inventory_items')
    .select('id, title, attributes')
    .or('attributes->>ai_enriched.is.null,attributes->>ai_enriched.eq.false')

  if (fetchErr) {
    console.error('Failed to fetch:', fetchErr.message)
    process.exit(1)
  }
  console.log(`  Found ${books.length} unenriched records`)

  // ── Step 3: Diagnose ─────────────────────────────────────────
  console.log('\n── Step 3: Diagnosing ───────────────────────────────────')
  let nullTopLevel = 0, emptyTopLevel = 0, hasAttrTitle = 0, hasAttrBookshelves = 0
  let matchedToXlsx = 0
  const notInXlsx = []

  for (const book of books) {
    if (book.title === null || book.title === undefined) nullTopLevel++
    else if (book.title === '') emptyTopLevel++
    if (book.attributes?.title) hasAttrTitle++
    if (book.attributes?.bookshelves) hasAttrBookshelves++
    const gid = book.attributes?.goodreads_id
    if (gid && xlsxMap.has(gid)) matchedToXlsx++
    else notInXlsx.push({ id: book.id, topTitle: book.title, gid })
  }

  console.log(`  Null top-level title column:     ${nullTopLevel}`)
  console.log(`  Empty top-level title column:    ${emptyTopLevel}`)
  console.log(`  Has title in attributes:         ${hasAttrTitle}`)
  console.log(`  Has bookshelves in attributes:   ${hasAttrBookshelves}`)
  console.log(`  Matched to XLSX by goodreads_id: ${matchedToXlsx}`)
  console.log(`  Not found in XLSX:               ${notInXlsx.length}`)

  if (notInXlsx.length > 0) {
    console.log('\n  Books not matched to XLSX (first 10):')
    for (const b of notInXlsx.slice(0, 10)) {
      console.log(`    id=${b.id} | top-level="${b.topTitle}" | goodreads_id="${b.gid}"`)
    }
  }

  // ── Step 4: Apply fix ────────────────────────────────────────
  console.log('\n── Step 4: Applying fix ─────────────────────────────────')
  let fixed = 0, skipped = 0

  for (let i = 0; i < books.length; i++) {
    const book = books[i]
    const attrs = book.attributes ?? {}
    const gid = attrs.goodreads_id
    const xlsxData = gid ? xlsxMap.get(gid) : null

    // Resolve title: prefer XLSX (authoritative), fall back to existing top-level column
    const resolvedTitle = xlsxData?.title || book.title || ''
    const resolvedBookshelves = xlsxData?.bookshelves || attrs.bookshelves || ''

    if (!resolvedTitle) {
      console.log(`  [${i + 1}/${books.length}] id=${book.id} ⚠ no title found anywhere — skipping`)
      skipped++
      continue
    }

    const mergedAttributes = {
      ...attrs,
      title: resolvedTitle,
      ...(resolvedBookshelves ? { bookshelves: resolvedBookshelves } : {}),
    }

    // Also repair the top-level title column if it's null/empty
    const updatePayload = { attributes: mergedAttributes }
    if (!book.title) updatePayload.title = resolvedTitle

    const { error: updateErr } = await supabase
      .from('inventory_items')
      .update(updatePayload)
      .eq('id', book.id)

    if (updateErr) {
      console.log(`  [${i + 1}/${books.length}] "${resolvedTitle}" ⚠ failed: ${updateErr.message}`)
      skipped++
    } else {
      console.log(`  [${i + 1}/${books.length}] "${resolvedTitle}" ✓`)
      fixed++
    }
  }

  // ── Step 5: Verify ───────────────────────────────────────────
  console.log('\n── Step 5: Verification ─────────────────────────────────')
  const { data: sample } = await supabase
    .from('inventory_items')
    .select('id, title, attributes')
    .or('attributes->>ai_enriched.is.null,attributes->>ai_enriched.eq.false')
    .limit(5)

  if (sample?.length) {
    console.log('  Sample of unenriched records after fix:')
    for (const r of sample) {
      const bsh = (r.attributes?.bookshelves || '').slice(0, 40)
      console.log(`    id=${r.id} | title col="${r.title}" | attrs.title="${r.attributes?.title}" | bookshelves="${bsh}"`)
    }
  }

  console.log('\n── Summary ──────────────────────────────────────────────')
  console.log(`  Fixed:   ${fixed}`)
  console.log(`  Skipped: ${skipped}`)
  console.log('─────────────────────────────────────────────────────────')
  if (fixed > 0) console.log('\nReady. Run: node scripts/enrich-books.js')
}

run().catch(err => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
