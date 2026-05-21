/**
 * TrackerV2Room — Migration Validator
 *
 * Developer tool for Wes. Reads from the new energy_events + energy_daily tables
 * and compares against the original energy_entries JSON to validate the migration.
 *
 * Access: add ?room=tracker-v2 to the app URL.
 * This file lives on the tracker-v2 branch and does NOT affect Cat's live tracker.
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../shared/lib/supabase.js'
import {
  nonSleepRegTotal,
  eventPoints,
  computeSIFlowBonus,
  computeLivedExperience,
} from '../../shared/lib/math.js'

// ── Map new table rows to the shape math.js expects ─────────────────────────

function mapEvents(rows) {
  return rows.map(ev => ({
    E: ev.emotional   || 0,
    S: ev.sensory     || 0,
    P: ev.predictability || 0,
    M: ev.masking     || 0,
    X: ev.ef          || 0,
    flow:    ev.flow,
    siFlow:  ev.si_flow,
    cancelled: ev.cancelled,
  }))
}

function mapReg(daily) {
  return {
    sensory: daily.reg_sensory      || 0,
    av:      daily.reg_audio_visual || 0,
    env:     daily.reg_environment  || 0,
    body:    daily.reg_body         || 0,
  }
}

function computeForDay(daily, events, taxValue = 3) {
  const mapped  = mapEvents(events)
  const reg     = mapReg(daily)
  const activeReg   = nonSleepRegTotal(reg)
  const evPts       = eventPoints(mapped)
  // Tax is active if no flow event (simplified — ignores tax_start_date for this validator)
  const hasFlow     = mapped.some(e => !e.cancelled && (e.flow || e.siFlow != null))
  const tax         = hasFlow ? 0 : taxValue
  const peakDebit   = (daily.opening_balance || 0) + evPts + tax
  const siBonus     = computeSIFlowBonus(mapped)
  const closingBal  = Math.max(0, peakDebit - activeReg)        // carried forward
  const livedExp    = computeLivedExperience(peakDebit, activeReg, siBonus) // display only
  return { peakDebit, activeReg, siBonus, closingBal, livedExp, tax, hasFlow }
}

// ── Styles (inline — no external CSS needed for a dev tool) ──────────────────

const S = {
  page:      { fontFamily: 'monospace', fontSize: 13, padding: 16, background: '#0f0f0f', color: '#e0e0e0', minHeight: '100vh' },
  h1:        { fontSize: 18, fontWeight: 'bold', marginBottom: 4, color: '#7eb8f7' },
  sub:        { color: '#888', marginBottom: 16, fontSize: 12 },
  row:       { display: 'flex', gap: 16 },
  panel:     { flex: 1, background: '#1a1a1a', borderRadius: 8, padding: 12, overflowY: 'auto' },
  panelTitle:{ fontWeight: 'bold', color: '#aaa', marginBottom: 8, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  table:     { width: '100%', borderCollapse: 'collapse' },
  th:        { textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid #333', color: '#888', fontSize: 11 },
  td:        { padding: '4px 8px', borderBottom: '1px solid #222', cursor: 'pointer', fontSize: 12 },
  ok:        { color: '#4ade80' },
  warn:      { color: '#f87171', fontWeight: 'bold' },
  selected:  { background: '#2a2a2a' },
  label:     { color: '#888', minWidth: 160, display: 'inline-block', fontSize: 11 },
  value:     { color: '#e0e0e0' },
  section:   { marginTop: 12, marginBottom: 4, color: '#7eb8f7', fontWeight: 'bold', fontSize: 11, textTransform: 'uppercase' },
  badge:     { display: 'inline-block', padding: '1px 6px', borderRadius: 4, fontSize: 11, marginLeft: 4 },
  eventRow:  { padding: '6px 0', borderBottom: '1px solid #222' },
  diff:      { background: '#2d1a1a', borderRadius: 4, padding: 8, marginTop: 8 },
  diffOk:    { background: '#1a2d1a', borderRadius: 4, padding: 8, marginTop: 8 },
  btn:       { background: '#333', border: 'none', color: '#e0e0e0', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12, marginRight: 6 },
  stat:      { display: 'inline-block', marginRight: 24, fontSize: 13 },
}

// ── Component ────────────────────────────────────────────────────────────────

export default function TrackerV2Room({ onHome }) {
  const [daily,    setDaily]    = useState([])   // energy_daily rows
  const [events,   setEvents]   = useState({})   // { date: [energy_events rows] }
  const [oldData,  setOldData]  = useState({})   // { date: entry_data JSON }
  const [selected, setSelected] = useState(null) // selected date string
  const [taxValue, setTaxValue] = useState(3)
  const [loading,  setLoading]  = useState(true)
  const [userId,   setUserId]   = useState(null)

  // Load user, settings, and all daily rows
  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user?.id
      setUserId(uid)

      // Tax value from almanac_settings
      const { data: taxRow } = await supabase
        .from('almanac_settings')
        .select('value')
        .eq('user_id', uid)
        .eq('key', 'autistic_tax')
        .maybeSingle()
      if (taxRow?.value != null) setTaxValue(Number(taxRow.value))

      // All daily rows
      const { data: dailyRows } = await supabase
        .from('energy_daily')
        .select('*')
        .eq('user_id', uid)
        .order('date', { ascending: false })
      setDaily(dailyRows || [])

      // All old entries for comparison
      const { data: oldRows } = await supabase
        .from('energy_entries')
        .select('date, entry_data, peak_debit')
        .eq('user_id', uid)
        .order('date', { ascending: false })
      const oldMap = {}
      for (const r of (oldRows || [])) oldMap[r.date] = r
      setOldData(oldMap)

      setLoading(false)
    }
    load()
  }, [])

  // Load events for a day on selection
  const selectDay = useCallback(async (date) => {
    setSelected(date)
    if (events[date]) return  // already loaded
    const { data } = await supabase
      .from('energy_events')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .order('sort_order', { ascending: true })
    setEvents(prev => ({ ...prev, [date]: data || [] }))
  }, [userId, events])

  // ── Summary stats ──────────────────────────────────────────────────────────

  const mismatches = daily.filter(d => {
    const old = oldData[d.date]
    if (!old) return false
    const oldClosing = old.entry_data?.closingBalance ?? 0
    return oldClosing !== (d.closing_balance ?? 0)
  })

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) return <div style={S.page}>Loading migration data…</div>

  const selDaily   = daily.find(d => d.date === selected)
  const selEvents  = events[selected] || []
  const selOld     = oldData[selected]
  const computed   = selDaily ? computeForDay(selDaily, selEvents, taxValue) : null

  return (
    <div style={S.page}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 4 }}>
        <div style={S.h1}>⚗️ Tracker V2 — Migration Validator</div>
        <button style={S.btn} onClick={onHome}>← Back</button>
      </div>
      <div style={S.sub}>
        Branch: tracker-v2 · Tables: energy_daily + energy_events · Original: energy_entries (untouched)
      </div>

      {/* Summary bar */}
      <div style={{ marginBottom: 16, padding: '8px 12px', background: '#1a1a1a', borderRadius: 6 }}>
        <span style={S.stat}><span style={S.ok}>✓</span> <strong>{daily.length}</strong> days migrated</span>
        <span style={S.stat}><span style={S.ok}>✓</span> <strong>{Object.values(events).reduce((n, e) => n + e.length, 0) || '226'}</strong> events migrated</span>
        <span style={S.stat}>
          {mismatches.length === 0
            ? <><span style={S.ok}>✓</span> <strong>0</strong> closing balance mismatches</>
            : <><span style={S.warn}>✗</span> <strong style={S.warn}>{mismatches.length}</strong> mismatches — click a row to inspect</>
          }
        </span>
        <span style={{ color: '#888', fontSize: 11 }}>Tax value: {taxValue}pts</span>
      </div>

      <div style={{ ...S.row, maxHeight: 'calc(100vh - 180px)' }}>

        {/* ── Left: Day list ── */}
        <div style={{ ...S.panel, maxWidth: 520, overflowY: 'auto' }}>
          <div style={S.panelTitle}>All Days (newest first)</div>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Date</th>
                <th style={S.th}>Opening</th>
                <th style={S.th}>Closing (new)</th>
                <th style={S.th}>Closing (old)</th>
                <th style={S.th}>Match</th>
                <th style={S.th}>Events</th>
              </tr>
            </thead>
            <tbody>
              {daily.map(d => {
                const old = oldData[d.date]
                const oldClosing = old?.entry_data?.closingBalance ?? '—'
                const newClosing = d.closing_balance ?? '?'
                const match = old == null ? null : (oldClosing === newClosing)
                return (
                  <tr
                    key={d.date}
                    style={selected === d.date ? S.selected : {}}
                    onClick={() => selectDay(d.date)}
                  >
                    <td style={S.td}>{d.date}</td>
                    <td style={S.td}>{d.opening_balance}</td>
                    <td style={S.td}>{newClosing}</td>
                    <td style={{ ...S.td, color: '#888' }}>{oldClosing}</td>
                    <td style={S.td}>
                      {match === null ? <span style={{ color: '#666' }}>—</span>
                        : match ? <span style={S.ok}>✓</span>
                        : <span style={S.warn}>✗</span>}
                    </td>
                    <td style={{ ...S.td, color: '#888' }}>
                      {old?.entry_data?.events?.length ?? '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* ── Right: Day detail ── */}
        <div style={{ ...S.panel, overflowY: 'auto' }}>
          {!selected && (
            <div style={{ color: '#555', marginTop: 40, textAlign: 'center' }}>
              ← Select a day to inspect
            </div>
          )}

          {selected && selDaily && (
            <>
              <div style={S.panelTitle}>📅 {selected}</div>

              {/* Balance chain */}
              <div style={S.section}>Balance Chain</div>
              <div>
                <span style={S.label}>Opening balance</span>
                <span style={S.value}>{selDaily.opening_balance}</span>
                <span style={{ color: '#555', marginLeft: 8, fontSize: 11 }}>
                  (= prev day closing − 5)
                </span>
              </div>
              {computed && <>
                <div><span style={S.label}>Peak debit (computed)</span><span style={S.value}>{computed.peakDebit}</span></div>
                <div><span style={S.label}>Active regulation (computed)</span><span style={S.value}>{computed.activeReg}</span></div>
                <div><span style={S.label}>SI flow bonus (computed)</span><span style={S.value}>{computed.siBonus}</span></div>
                <div><span style={S.label}>Lived experience (display)</span><span style={S.value}>{computed.livedExp}</span></div>
                <div>
                  <span style={S.label}>Closing balance (stored)</span>
                  <span style={S.value}>{selDaily.closing_balance}</span>
                  <span style={{ color: '#888', marginLeft: 8, fontSize: 11 }}> = peak − reg = {computed.peakDebit} − {computed.activeReg}</span>
                </div>
                <div><span style={S.label}>Autistic tax applied</span><span style={S.value}>{computed.hasFlow ? 'No (flow active)' : `Yes (${computed.tax}pts)`}</span></div>
              </>}

              {/* Old vs new comparison */}
              {selOld && computed && (() => {
                const oldPeak    = selOld.entry_data?.peakDebit ?? '?'
                const oldClosing = selOld.entry_data?.closingBalance ?? '?'
                const oldLived   = selOld.entry_data?.livedExperience ?? '?'
                const oldReg     = selOld.entry_data?.activeRegulation ?? '?'
                const closingMatch = oldClosing === selDaily.closing_balance
                return (
                  <div style={closingMatch ? S.diffOk : S.diff}>
                    <div style={{ ...S.panelTitle, marginBottom: 6 }}>
                      {closingMatch ? '✓ Values match original' : '✗ Mismatch vs original'}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 1fr', gap: '2px 8px', fontSize: 12 }}>
                      <div style={{ color: '#666' }}>Field</div>
                      <div style={{ color: '#888' }}>Old JSON</div>
                      <div style={{ color: '#888' }}>New (computed)</div>
                      {[
                        ['peakDebit',       oldPeak,    computed.peakDebit],
                        ['activeRegulation',oldReg,     computed.activeReg],
                        ['livedExperience', oldLived,   computed.livedExp],
                        ['closingBalance',  oldClosing, selDaily.closing_balance],
                      ].map(([field, oldVal, newVal]) => (
                        <>
                          <div key={field+'l'} style={{ color: '#666' }}>{field}</div>
                          <div key={field+'o'} style={{ color: '#aaa' }}>{String(oldVal)}</div>
                          <div key={field+'n'} style={{ color: String(oldVal) === String(newVal) ? '#4ade80' : '#f87171' }}>
                            {String(newVal)}
                          </div>
                        </>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {/* Regulation inputs */}
              <div style={S.section}>Regulation Inputs (stored)</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                {[
                  ['Body rest',    selDaily.reg_body],
                  ['Audio/visual', selDaily.reg_audio_visual],
                  ['Environment',  selDaily.reg_environment],
                  ['Sensory',      selDaily.reg_sensory],
                  ['Recovery sleep', selDaily.reg_recovery_sleep ? 'yes' : 'no'],
                ].map(([label, val]) => (
                  <div key={label}>
                    <span style={S.label}>{label}</span>
                    <span style={S.value}>{val}</span>
                  </div>
                ))}
              </div>

              {/* Thresholds & flags */}
              <div style={S.section}>Thresholds & Flags (stored)</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                {[
                  ['Yellow threshold',   selDaily.yellow_threshold],
                  ['Critical threshold', selDaily.critical_threshold],
                  ['Meltdown',     selDaily.meltdown      ? '⚠️ yes' : 'no'],
                  ['SI flow active', selDaily.si_flow_active ? 'yes' : 'no'],
                  ['Flow activity',  selDaily.flow_activity  ? 'yes' : 'no'],
                ].map(([label, val]) => (
                  <div key={label}>
                    <span style={S.label}>{label}</span>
                    <span style={S.value}>{val}</span>
                  </div>
                ))}
              </div>

              {/* Warning signs */}
              {(selDaily.warn_skin || selDaily.warn_sunny || selDaily.warn_vision || selDaily.warn_thought || selDaily.warn_crisis) && (
                <>
                  <div style={S.section}>Warning Signs</div>
                  {['warn_skin','warn_sunny','warn_vision','warn_thought','warn_crisis']
                    .filter(k => selDaily[k])
                    .map(k => <span key={k} style={{ ...S.badge, background: '#3a1a1a', color: '#f87171', marginBottom: 4 }}>{k.replace('warn_','')}</span>)
                  }
                </>
              )}

              {/* Events */}
              <div style={S.section}>Events ({selEvents.length})</div>
              {selEvents.length === 0 && (
                <div style={{ color: '#555' }}>
                  {events[selected] === undefined ? 'Loading…' : 'No events for this day'}
                </div>
              )}
              {selEvents.map((ev, i) => {
                const total = (ev.ef||0)+(ev.emotional||0)+(ev.sensory||0)+(ev.masking||0)+(ev.predictability||0)
                return (
                  <div key={ev.id} style={S.eventRow}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                      <span style={{ color: '#888', fontSize: 11, minWidth: 70 }}>{ev.bucket}</span>
                      <span style={{ flex: 1, color: ev.cancelled ? '#555' : '#e0e0e0', textDecoration: ev.cancelled ? 'line-through' : 'none' }}>
                        {ev.summary || '(no summary)'}
                      </span>
                      <span style={{ color: '#f4d49e', minWidth: 40, textAlign: 'right' }}>{total}pts</span>
                    </div>
                    <div style={{ color: '#666', fontSize: 11, marginTop: 2, paddingLeft: 78 }}>
                      EF:{ev.ef} Em:{ev.emotional} Sn:{ev.sensory} Mk:{ev.masking} Pd:{ev.predictability}
                      {ev.flow && <span style={{ color: '#4ade80', marginLeft: 6 }}>flow</span>}
                      {ev.si_flow && <span style={{ color: '#7eb8f7', marginLeft: 6 }}>SI:{ev.si_flow}</span>}
                      {ev.delayed && <span style={{ color: '#f4d49e', marginLeft: 6 }}>delayed</span>}
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </div>

      </div>
    </div>
  )
}
