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
export async function loadAction(actionId) {
  const { data, error } = await supabase
    .from('actions')
    .select('id, name, points, action_type, what_it_is, how_to_use, what_counts, stop_if, why_it_helps')
    .eq('id', actionId)
    .single()
  if (error) throw error
  return data
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
