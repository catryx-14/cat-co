import { supabase } from '../../../shared/lib/supabase.js'

// Family display order (warm → heavy) — locked interaction design
export const FAMILY_ORDER = [
  'calm/regulated', 'love/connection', 'joy/happiness', 'surprise',
  'sadness', 'overwhelm/depletion', 'masking', 'fear/anxiety', 'anger',
]

// Client-side quality grouping (design intent; DB stores slugs only)
export const QUALITY_GROUP_MAP = {
  tight: 'tension', clenched: 'tension',
  fluttery: 'energy', buzzy: 'energy', racing: 'energy', trembly: 'energy', tingly: 'energy',
  hot: 'temperature', cold: 'temperature', burning: 'temperature', flushed: 'temperature',
  heavy: 'weight', hollow: 'weight', sinking: 'weight',
  aching: 'ache', throbbing: 'ache',
  queasy: 'stomach',
  'a-lump': 'throat / breath', breathless: 'throat / breath',
  numb: 'absent',
}
export const QUALITY_GROUP_ORDER = [
  'tension', 'energy', 'temperature', 'weight', 'ache', 'stomach', 'throat / breath', 'absent',
]

// Button-only locations (not tappable SVG zones)
export const BUTTON_LOCATION_SLUGS = ['back', 'skin', 'whole-body', 'joints']

// Per-category chip colours (distinct hue per atom type). Readable on dark navy.
export const CATEGORY_COLORS = {
  emotion:   { text: '#f3b8c4', border: 'rgba(243,184,196,0.45)', bg: 'rgba(243,184,196,0.12)' }, // rose
  body:      { text: '#e8c98c', border: 'rgba(232,201,140,0.45)', bg: 'rgba(232,201,140,0.12)' }, // gold
  meaning:   { text: '#9fe0cf', border: 'rgba(159,224,207,0.45)', bg: 'rgba(159,224,207,0.12)' }, // teal
  situation: { text: '#c9b3f0', border: 'rgba(201,179,240,0.45)', bg: 'rgba(201,179,240,0.12)' }, // violet
}

// ── Word matching (so "loving" finds an existing "love") ───────────────────
export function normalizeWord(w) {
  return (w || '').toLowerCase().trim().replace(/[^a-z]/g, '')
}

// Light stemmer — strips common English suffixes to a rough root
export function stemWord(w) {
  let s = normalizeWord(w)
  s = s.replace(/(ings|ing|edly|ed|ledge|ly|ness|fully|ful|less|ments|ment|ers|er|est|ions|ion|ies|es|s)$/,'')
  s = s.replace(/e$/, '')
  return s
}

function levenshtein(a, b) {
  const m = a.length, n = b.length
  if (!m) return n
  if (!n) return m
  const dp = Array.from({ length: m + 1 }, (_, i) => i)
  for (let j = 1; j <= n; j++) {
    let prev = dp[0]
    dp[0] = j
    for (let i = 1; i <= m; i++) {
      const tmp = dp[i]
      dp[i] = Math.min(
        dp[i] + 1,
        dp[i - 1] + 1,
        prev + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
      prev = tmp
    }
  }
  return dp[m]
}

// Find existing vocab rows that match a typed query — exact, substring, shared
// stem, prefix, or a close typo. Returns rows ranked best-first.
export function findWordMatches(query, rows, labelKey = 'word') {
  const nq = normalizeWord(query)
  const sq = stemWord(query)
  if (!nq) return []
  const scored = []
  for (const r of rows) {
    const label = r[labelKey] ?? r.word ?? r.name
    const nw = normalizeWord(label)
    const sw = stemWord(label)
    let score = Infinity
    if (nw === nq) score = 0
    else if (nw.includes(nq) || nq.includes(nw)) score = 1
    else if (sq.length >= 3 && sw === sq) score = 2
    else if (sq.length >= 4 && (nw.startsWith(sq) || nq.startsWith(sw))) score = 3
    else {
      const d = levenshtein(nq, nw)
      if (d <= 2 && Math.min(nq.length, nw.length) >= 4) score = 4 + d
    }
    if (score < Infinity) scored.push({ r, score })
  }
  scored.sort((a, b) => a.score - b.score)
  return scored.map(x => x.r)
}

// Insert a personal emotion word, then return the new row (for live vocab merge)
export async function addEmotionWord({ userId, word, family }) {
  const base = normalizeWord(word) || 'word'
  const row = {
    slug: base, word: word.trim(), family,
    neighbours: [], is_personal: true, created_by_user_id: userId || null,
  }
  let { data, error } = await supabase
    .from('emotion_words').insert(row).select('slug, word, family, neighbours').single()
  if (error && error.code === '23505') {
    row.slug = `${base}-${Date.now()}`
    ;({ data, error } = await supabase
      .from('emotion_words').insert(row).select('slug, word, family, neighbours').single())
  }
  if (error) throw error
  return data
}

// Insert a personal meaning word under a family, then return the new row
export async function addMeaningWord({ userId, name, parentSlug }) {
  const base = `personal-${normalizeWord(name) || 'word'}`
  const row = {
    slug: base, name: name.trim(), parent_slug: parentSlug || null,
    sort_order: 999, is_personal: true, created_by_user_id: userId || null,
  }
  let { data, error } = await supabase
    .from('meaning_taxonomy').insert(row).select('slug, name, gloss, parent_slug, sort_order').single()
  if (error && error.code === '23505') {
    row.slug = `${base}-${Date.now()}`
    ;({ data, error } = await supabase
      .from('meaning_taxonomy').insert(row).select('slug, name, gloss, parent_slug, sort_order').single())
  }
  if (error) throw error
  return data
}

export async function loadAllVocab() {
  const [
    { data: emotionRows, error: e1 },
    { data: meaningRows, error: e2 },
    { data: bodyRows,    error: e3 },
    { data: sitRows,     error: e4 },
  ] = await Promise.all([
    supabase.from('emotion_words').select('slug, word, family, neighbours').order('family').order('word'),
    supabase.from('meaning_taxonomy').select('slug, name, gloss, parent_slug, sort_order').order('sort_order'),
    supabase.from('body_sensations').select('slug, name, kind, sort_order, parent_group').order('sort_order'),
    supabase.from('lost_found_situations').select('slug, name, sort_order, is_personal').order('sort_order'),
  ])
  if (e1 || e2 || e3 || e4) throw (e1 || e2 || e3 || e4)

  const emotionBySlug = {}
  const emotionFamilies = {}
  for (const r of emotionRows) {
    emotionBySlug[r.slug] = r
    if (!emotionFamilies[r.family]) emotionFamilies[r.family] = []
    emotionFamilies[r.family].push(r)
  }

  const meaningFamilies = meaningRows.filter(r => !r.parent_slug).sort((a, b) => a.sort_order - b.sort_order)
  const meaningByParent = {}
  const meaningBySlug = {}
  for (const r of meaningRows) {
    meaningBySlug[r.slug] = r
    if (r.parent_slug) {
      if (!meaningByParent[r.parent_slug]) meaningByParent[r.parent_slug] = []
      meaningByParent[r.parent_slug].push(r)
    }
  }

  const bodyLocations = bodyRows.filter(r => r.kind === 'location')
  const bodyQualities = bodyRows.filter(r => r.kind === 'quality')

  return {
    emotions: { bySlug: emotionBySlug, families: emotionFamilies },
    meanings: { families: meaningFamilies, byParent: meaningByParent, bySlug: meaningBySlug },
    body: { locations: bodyLocations, qualities: bodyQualities },
    situations: sitRows,
  }
}

// Format vocab for injection into the ask-Claude system prompt
export function formatVocabForPrompt(vocab) {
  const { emotions, meanings, body, situations } = vocab
  const lines = ['\n\n--- Cat\'s vocabulary (use these words and slugs exactly) ---']

  lines.push('\nEMOTION FAMILIES (warm → heavy):')
  for (const fam of FAMILY_ORDER) {
    const words = emotions.families[fam] || []
    if (words.length) lines.push(`  ${fam}: ${words.map(w => w.word).join(', ')}`)
  }

  lines.push('\nMEANING FAMILIES (with gloss and granular words):')
  for (const fam of meanings.families) {
    const granular = meanings.byParent[fam.slug] || []
    const g = granular.length ? `  granular: ${granular.map(g => g.name).join(', ')}` : ''
    lines.push(`  [${fam.name}] — ${fam.gloss || ''}`)
    if (g) lines.push(`    ${g}`)
  }

  lines.push('\nBODY SENSATION LOCATIONS:')
  lines.push('  ' + body.locations.map(l => l.name).join(', '))

  lines.push('\nBODY SENSATION QUALITIES:')
  lines.push('  ' + body.qualities.map(q => q.name).join(', '))

  lines.push('\nSITUATION CATEGORIES:')
  lines.push('  ' + situations.map(s => s.name).join(', '))

  return lines.join('\n')
}

// Map the friendly UI outcome values to the DB's allowed check-constraint values.
// emotion_outcome accepts: named | partly | not_found_yet | skipped
// meaning_outcome accepts: found | not_found_yet | skipped
const EMOTION_OUTCOME_MAP = { yes: 'named', 'not quite': 'partly', 'still lost': 'not_found_yet' }
const MEANING_OUTCOME_MAP = { yes: 'found', 'not quite': 'not_found_yet', 'still lost': 'not_found_yet' }

// Reverse maps — DB values back to UI values (for reopening an entry to edit).
// Note: meaning 'not quite' and 'still lost' both store as not_found_yet, so the
// reverse is lossy and resolves to 'still lost'.
export const EMOTION_OUTCOME_TO_UI = { named: 'yes', partly: 'not quite', not_found_yet: 'still lost', skipped: null }
export const MEANING_OUTCOME_TO_UI = { found: 'yes', not_found_yet: 'still lost', skipped: null }

// Insert all atom rows for an entry (shared by save + update)
async function insertAtoms(entryId, { situations, emotions, bodyEntries, meanings }) {
  const inserts = []
  if (situations?.length) {
    inserts.push(supabase.from('lost_found_entry_situations').insert(
      situations.map(s => ({ entry_id: entryId, situation_slug: s.slug, source: s.source || 'self' }))
    ))
  }
  if (emotions?.length) {
    inserts.push(supabase.from('lost_found_entry_emotions').insert(
      emotions.map(e => ({
        entry_id: entryId, emotion_slug: e.slug, source: e.source || 'self',
        traversal_path: e.traversal_path?.length ? e.traversal_path : null,
      }))
    ))
  }
  if (bodyEntries?.length) {
    inserts.push(supabase.from('lost_found_entry_body').insert(
      bodyEntries.map(b => ({
        entry_id: entryId, location_slug: b.location_slug,
        quality_slugs: b.quality_slugs?.length ? b.quality_slugs : null,
        source: b.source || 'self',
      }))
    ))
  }
  if (meanings?.length) {
    inserts.push(supabase.from('lost_found_entry_meanings').insert(
      meanings.map(m => ({ entry_id: entryId, meaning_slug: m.slug, source: m.source || 'self' }))
    ))
  }
  const results = await Promise.all(inserts)
  for (const { error } of results) if (error) throw error
}

// Save a complete entry with all atoms
export async function saveEntry({ userId, expression, situations, emotions, bodyEntries, meanings, emotionOutcome, meaningOutcome }) {
  const { data: entry, error: entryErr } = await supabase
    .from('lost_found_entries')
    .insert({
      user_id: userId,
      expression: expression?.trim() || null,
      emotion_outcome: emotionOutcome ? (EMOTION_OUTCOME_MAP[emotionOutcome] ?? null) : null,
      meaning_outcome: meaningOutcome ? (MEANING_OUTCOME_MAP[meaningOutcome] ?? null) : null,
    })
    .select('id')
    .single()
  if (entryErr) throw entryErr

  await insertAtoms(entry.id, { situations, emotions, bodyEntries, meanings })
  return entry.id
}

// Update an existing entry: rewrite the parent row, then replace all atoms.
export async function updateEntry({ entryId, expression, situations, emotions, bodyEntries, meanings, emotionOutcome, meaningOutcome }) {
  const { error: upErr } = await supabase
    .from('lost_found_entries')
    .update({
      expression: expression?.trim() || null,
      emotion_outcome: emotionOutcome ? (EMOTION_OUTCOME_MAP[emotionOutcome] ?? null) : null,
      meaning_outcome: meaningOutcome ? (MEANING_OUTCOME_MAP[meaningOutcome] ?? null) : null,
    })
    .eq('id', entryId)
  if (upErr) throw upErr

  // Replace child atoms — clear the old set, then insert the current one
  const dels = await Promise.all([
    supabase.from('lost_found_entry_situations').delete().eq('entry_id', entryId),
    supabase.from('lost_found_entry_emotions').delete().eq('entry_id', entryId),
    supabase.from('lost_found_entry_body').delete().eq('entry_id', entryId),
    supabase.from('lost_found_entry_meanings').delete().eq('entry_id', entryId),
  ])
  for (const { error } of dels) if (error) throw error

  await insertAtoms(entryId, { situations, emotions, bodyEntries, meanings })
  return entryId
}

// Delete an entry. Child atom rows cascade via ON DELETE CASCADE.
export async function deleteEntry(entryId) {
  const { error } = await supabase
    .from('lost_found_entries')
    .delete()
    .eq('id', entryId)
  if (error) throw error
}

// Persist every Claude turn from an ask-Claude exchange.
// Called on entry save — turns are not kept if the entry is abandoned.
export async function saveAskTurns(userId, entryId, messages) {
  const turns = messages
    .filter(m => m.role === 'assistant')
    .map((m, idx) => ({
      user_id: userId,
      entry_id: entryId,
      turn_index: idx,
      question_text: m.content ?? null,
      moves: m.moves ?? [],
      primary_move: m.primaryMove ?? null,
      marked_helpful: m.markedHelpful ?? false,
    }))
  if (!turns.length) return
  const { error } = await supabase.from('lost_found_ask_turns').insert(turns)
  if (error) throw error
}

// Load collection entries for Tab 2
export async function loadCollection(userId) {
  const { data, error } = await supabase
    .from('lost_found_entries')
    .select(`
      id, expression, emotion_outcome, meaning_outcome, created_at,
      lost_found_entry_emotions(emotion_slug, source),
      lost_found_entry_meanings(meaning_slug, source),
      lost_found_entry_body(location_slug, quality_slugs),
      lost_found_entry_situations(situation_slug)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}
