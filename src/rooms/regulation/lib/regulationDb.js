import { supabase } from '../../../shared/lib/supabase.js'

// ── Band vocabulary (three faces — caution = yellow + orange combined) ──────
export const BANDS = ['green', 'caution', 'purple']
export const BAND_LABEL = { green: 'green', caution: 'yellow / orange', purple: 'purple' }
export const BAND_COLOR = { green: '#2FBE86', caution: '#FF8419', purple: '#A673E4' }
export const BAND_DEEP  = { green: '#163f30', caution: '#5a3210', purple: '#3d2a5e' }
export const MARKER_GLYPH = { do: '+', dont: '–', tool: '◆', coreg: '♥' }

const bandRank = b => ({ green: 1, caution: 2, purple: 3 }[b] ?? 9)
const nowIso = () => new Date().toISOString()
const bySort = (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)

// ── Channel map (id=146 canonical vocabulary) — aisle is derivable, not stored ─
// The Shelf groups cards by aisle → channel using this static map. Strings must
// match regulation_tools.channel_primary exactly.
export const CHANNEL_AISLES = [
  ['Body / sensory',       ['Deep pressure', 'Tactile', 'Movement', 'Breath', 'Thermal', 'Orienting', 'Sound', 'Smell & taste', 'Release / discharge']],
  ['Mind / attention',     ['Monotropic flow', 'Externalizing', 'Cognitive defusion', 'Effortful absorption', 'Gentle absorption', 'Aesthetic & awe']],
  ['Relational',           ['Co-regulation', 'Tending & care', 'Shared joy']],
  ['Shield — remove load', ['Sensory-shielding', 'Demand/social shielding']],
  ['Proactive conditions', ['Predictability & structure', 'Restoration']],
]
export const ALL_CHANNELS = CHANNEL_AISLES.flatMap(([, chs]) => chs)

// ── Action GROUPS — the "life-lived" clusters used by the Manage picker ───────
// GROUP (how life is lived) is a friendlier layer than the raw channel. It is
// DERIVED live from each action's backing-card channel_primary via this map —
// nothing is stored on `actions`. (Engine room id=145 "LOCKED pt 6" §5.)
export const CHANNEL_GROUP = {
  'Restoration': 'Food, water & rest',
  'Demand/social shielding': 'Taking load off',
  'Predictability & structure': "Knowing what's next",
  'Thermal': 'Warmth',
  'Deep pressure': 'Pressure & body',
  'Movement': 'Pressure & body',
  'Tactile': 'Touch in hand',
  'Sensory-shielding': 'Quiet & shielding',
  'Sound': 'Sound',
  'Orienting': 'Outside & senses',
  'Aesthetic & awe': 'Outside & senses',
  'Smell & taste': 'Outside & senses',
  'Co-regulation': 'People nearby',
  'Release / discharge': 'Release',
  'Effortful absorption': 'Mind & absorption',
  'Gentle absorption': 'Mind & absorption',
  'Externalizing': 'Naming & offloading',
  'Cognitive defusion': 'Naming & offloading',
}
// Display order: "setting up the day" groups first, then body, senses, mind.
export const ACTION_GROUP_ORDER = [
  'Food, water & rest', 'Taking load off', "Knowing what's next", 'Warmth',
  'Pressure & body', 'Touch in hand', 'Quiet & shielding', 'Sound',
  'Outside & senses', 'People nearby', 'Release', 'Mind & absorption', 'Naming & offloading',
]
const GROUP_FALLBACK = 'Other'
// The group for one action, from its backing card's primary channel.
export function groupForAction(a) {
  return CHANNEL_GROUP[a?.backing?.channel_primary] || GROUP_FALLBACK
}
// channel → a small note shown under its header on the Shelf
export const CHANNEL_NOTES = {
  'Monotropic flow': "Mostly handled by SI Flow — tracked separately (it cancels the autistic tax and earns the day's regulation %), so the doing-the-flow cards aren't kept here, to avoid counting it twice.",
}

// ── Gallery: every routine with the bands it spans ──────────────────────────
export async function loadRoutines() {
  const { data, error } = await supabase
    .from('routines')
    .select('id, name, subtitle, sort_order, routine_faces(band, built)')
    .order('sort_order')
  if (error) throw error
  return (data || []).map(r => ({
    id: r.id,
    name: r.name,
    subtitle: r.subtitle,
    sort_order: r.sort_order,
    bands: (r.routine_faces || [])
      .filter(f => f.built)
      .map(f => f.band)
      .sort((a, b) => bandRank(a) - bandRank(b)),
  }))
}

// ── One routine, fully expanded into faces → doses + ingredients ────────────
export async function loadRoutine(routineId) {
  const { data, error } = await supabase
    .from('routines')
    .select(`
      id, name, subtitle, sort_order,
      routine_faces (
        id, band, label, built,
        what_it_is, how_to_use, what_counts, stop_if, why_it_helps, dose_note,
        routine_doses ( id, name, points_today, points_recovery, sort_order ),
        routine_face_ingredients ( id, tool_id, label, marker, tier, is_personal, sort_order )
      )
    `)
    .eq('id', routineId)
    .single()
  if (error) throw error

  const facesByBand = {}
  for (const f of data.routine_faces || []) {
    f.doses = (f.routine_doses || []).slice().sort(bySort)
    f.ingredients = (f.routine_face_ingredients || []).slice().sort(bySort)
    delete f.routine_doses
    delete f.routine_face_ingredients
    facesByBand[f.band] = f
  }
  return { id: data.id, name: data.name, subtitle: data.subtitle, sort_order: data.sort_order, facesByBand }
}

// ── One action (the "Activity" card) with its five optional sections ─────────
// Carries the backing shelf card (id/name/channels/tags) so the card can show
// its channel tags, a "first aid" badge, and a link through to the science.
export async function loadAction(actionId) {
  const { data, error } = await supabase
    .from('actions')
    .select('id, name, points, action_type, tool_id, what_it_is, how_to_use, what_counts, stop_if, why_it_helps, regulation_tools(id, name, channel_primary, channels_secondary, tags)')
    .eq('id', actionId)
    .single()
  if (error) throw error
  return { ...data, backing: data.regulation_tools || null }
}

// ── The science card behind an ingredient chip (only when tool_id is set) ────
export async function loadTool(toolId) {
  const { data, error } = await supabase
    .from('regulation_tools')
    .select('id, name, card_type, description, how_to_use, the_science, notes_variations')
    .eq('id', toolId)
    .single()
  if (error) throw error
  return data
}

// ── Routine name / subtitle ─────────────────────────────────────────────────
export async function updateRoutineMeta(routineId, fields) {
  const { error } = await supabase
    .from('routines')
    .update({ ...fields, updated_at: nowIso() })
    .eq('id', routineId)
  if (error) throw error
}

// ── Face text (five sections, label, dose_note) ─────────────────────────────
export async function updateFace(faceId, fields) {
  const { error } = await supabase
    .from('routine_faces')
    .update({ ...fields, updated_at: nowIso() })
    .eq('id', faceId)
  if (error) throw error
}

// ── Doses ───────────────────────────────────────────────────────────────────
export async function addDose(faceId, { name, points_today = null, points_recovery = null, sort_order }) {
  const { data, error } = await supabase
    .from('routine_doses')
    .insert({ face_id: faceId, name, points_today, points_recovery, sort_order })
    .select('id, name, points_today, points_recovery, sort_order')
    .single()
  if (error) throw error
  return data
}
export async function updateDose(doseId, fields) {
  const { error } = await supabase
    .from('routine_doses')
    .update({ ...fields, updated_at: nowIso() })
    .eq('id', doseId)
  if (error) throw error
}
export async function deleteDose(doseId) {
  const { error } = await supabase.from('routine_doses').delete().eq('id', doseId)
  if (error) throw error
}

// ── Ingredients (ad-hoc adds land as tier 'mine', marker 'do', personal) ────
export async function addIngredient(faceId, {
  label, marker = 'do', tier = 'mine', is_personal = true, tool_id = null, sort_order,
}) {
  const { data, error } = await supabase
    .from('routine_face_ingredients')
    .insert({ face_id: faceId, label, marker, tier, is_personal, tool_id, sort_order })
    .select('id, tool_id, label, marker, tier, is_personal, sort_order')
    .single()
  if (error) throw error
  return data
}
export async function deleteIngredient(ingredientId) {
  const { error } = await supabase.from('routine_face_ingredients').delete().eq('id', ingredientId)
  if (error) throw error
}

// ── The existing card shelf — for linking an ingredient to a real tool card ──
export async function loadAllTools() {
  const { data, error } = await supabase
    .from('regulation_tools')
    .select('id, name')
    .order('name')
  if (error) throw error
  return data || []
}

// ── Shelf tab: the whole regulation_tools pool (one library, filtered into views) ──
export async function loadShelf() {
  const { data, error } = await supabase
    .from('regulation_tools')
    .select('id, name, marker, channel_primary, channels_secondary, has_card, is_personal, tags, description, how_to_use, the_science, notes_variations, time_component, access_cost, created_by_user_id')
    .order('name')
  if (error) throw error
  return data || []
}

// New card in a channel — usable while unfinished (has_card false; science later).
// id is GENERATED ALWAYS (omit it). RLS requires created_by_user_id = auth.uid().
// `fields` carries the optional write-up columns (description / the_science / …)
// when a card is authored in full from the Shelf editor.
export async function createTool({ name, channel, marker = null, userId, has_card = false, fields = {} }) {
  const { data, error } = await supabase
    .from('regulation_tools')
    .insert({
      name, channel_primary: channel, marker,
      has_card, is_personal: true, tags: [],
      created_by_user_id: userId,
      ...fields,
    })
    .select('id, name, marker, channel_primary, channels_secondary, has_card, is_personal, tags, description, how_to_use, the_science, notes_variations, time_component, access_cost, created_by_user_id')
    .single()
  if (error) throw error
  return data
}

// Edit an existing shelf card (name / channel / marker / the write-up fields).
export async function updateTool(id, fields) {
  const { error } = await supabase.from('regulation_tools').update(fields).eq('id', id)
  if (error) throw error
}

// ── Actions tab: single regulating acts, each backed 1:1 by a shelf card ──────
export async function loadActions() {
  const { data, error } = await supabase
    .from('actions')
    .select('id, name, points, action_type, tool_id, what_it_is, how_to_use, what_counts, stop_if, why_it_helps, sort_order, regulation_tools(id, name, channel_primary, channels_secondary, tags)')
    .order('sort_order')
  if (error) throw error
  return (data || []).map(a => {
    const backing = a.regulation_tools || null
    return {
      ...a,
      backing,
      // Channel tags (how it regulates) read live from the backing card.
      channels: backing
        ? [backing.channel_primary, ...(backing.channels_secondary || [])].filter(Boolean)
        : [],
      // "first aid" is a curation tag on the backing card — a separate badge.
      firstAid: !!(backing?.tags || []).includes('first aid'),
      group: CHANNEL_GROUP[backing?.channel_primary] || GROUP_FALLBACK,
    }
  })
}

export async function createAction({ userId, name, action_type, points, tool_id, sections = {} }) {
  const { data: rows } = await supabase
    .from('actions').select('sort_order').order('sort_order', { ascending: false }).limit(1)
  const nextSort = ((rows && rows[0]?.sort_order) || 0) + 1
  const { data, error } = await supabase
    .from('actions')
    .insert({
      name, action_type, points, tool_id,
      created_by_user_id: userId, sort_order: nextSort,
      what_it_is:  sections.what_it_is  ?? null,
      how_to_use:  sections.how_to_use  ?? null,
      what_counts: sections.what_counts ?? null,
      stop_if:     sections.stop_if     ?? null,
      why_it_helps: sections.why_it_helps ?? null,
    })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

export async function updateAction(id, fields) {
  const { error } = await supabase
    .from('actions').update({ ...fields, updated_at: nowIso() }).eq('id', id)
  if (error) throw error
}

export async function deleteAction(id) {
  const { error } = await supabase.from('actions').delete().eq('id', id)
  if (error) throw error
}

// ── Remove a single built face (its doses / ingredients cascade) ────────────
export async function deleteFace(faceId) {
  const { error } = await supabase.from('routine_faces').delete().eq('id', faceId)
  if (error) throw error
}

// ── Grow a face: turn a seed band into a built face + one starter dose. ──────
// `fields` carries any text the user has already typed into the draft so nothing
// is lost when the face is persisted on first input.
export async function buildFace(routineId, band, fields = {}) {
  const { data: face, error } = await supabase
    .from('routine_faces')
    .insert({
      routine_id: routineId, band, built: true,
      label: fields.label ?? BAND_LABEL[band],
      what_it_is: fields.what_it_is ?? '',
      how_to_use: fields.how_to_use ?? '',
      what_counts: fields.what_counts ?? '',
      stop_if: fields.stop_if ?? '',
      why_it_helps: fields.why_it_helps ?? '',
      dose_note: fields.dose_note ?? '',
    })
    .select('id, band, label, built, what_it_is, how_to_use, what_counts, stop_if, why_it_helps, dose_note')
    .single()
  if (error) throw error

  // Purple seeds with the today/recovery split; green/caution with today only.
  const dose = await addDose(face.id, band === 'purple'
    ? { name: 'a short version', points_today: null, points_recovery: null, sort_order: 1 }
    : { name: 'a little', points_today: null, points_recovery: null, sort_order: 1 })

  face.doses = [dose]
  face.ingredients = []
  return face
}

// ── New routine: a routines row + one green face, born built but empty ──────
export async function createRoutine(userId) {
  const { data: rows } = await supabase
    .from('routines').select('sort_order').order('sort_order', { ascending: false }).limit(1)
  const nextSort = ((rows && rows[0]?.sort_order) || 0) + 1

  const { data: routine, error } = await supabase
    .from('routines')
    .insert({ name: 'new routine', subtitle: null, created_by_user_id: userId || null, sort_order: nextSort })
    .select('id')
    .single()
  if (error) throw error

  await buildFace(routine.id, 'green')
  return routine.id
}

// ── Delete a routine (faces / doses / ingredients cascade via FKs) ──────────
export async function deleteRoutine(routineId) {
  const { error } = await supabase.from('routines').delete().eq('id', routineId)
  if (error) throw error
}

// Next sort_order for a new child row, given the current siblings.
export function nextSortOrder(rows) {
  return rows.reduce((m, r) => Math.max(m, r.sort_order ?? 0), 0) + 1
}
