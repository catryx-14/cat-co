/**
 * RegulationGrid — the daily regulation grid on the Capacity Tracker.
 *
 * Two routine boxes (morning / evening) + an 8-box activity grid. Tapping a box
 * opens a searchable slide-up picker (routines for the routine boxes, actions for
 * the activity grid). Filling a box writes a regulation_log row via the parent's
 * handlers; the × removes it. At a 20-point cap the empty activity boxes gray out
 * and lock. Layout / styling / interactions ported from the locked prototype
 * regulation-on-tracker-prototype.html (engine room id=145 "LOCKED pt 5").
 *
 * State of the day comes in as `rows` (regulation_log rows). All mutations go
 * through onAddRoutine / onAddAction / onRemove so the parent can recompute the
 * rings and re-save the day's carry-forward closing balance.
 */

import { useEffect, useState } from 'react'
import { loadRoutineOptions, loadActionOptions, sumRegLog } from '../../shared/lib/regulationLog.js'
import RoutineCard from '../regulation/RoutineCard.jsx'
import ActionCard from '../regulation/ActionCard.jsx'
import { REG_STYLES } from '../regulation/regStyles.js'

const CAP = 20
const NBOX = 8

export default function RegulationGrid({ rows = [], onAddRoutine, onAddAction, onRemove, readOnly = false }) {
  const [routineOpts, setRoutineOpts] = useState([])
  const [actionOpts,  setActionOpts]  = useState([])
  const [pick, setPick] = useState(null)   // { mode:'routine'|'activity', slot, q } | null
  const [busy, setBusy] = useState(false)
  const [viewRow, setViewRow] = useState(null)   // a logged row whose card is open

  const openCard = (row) => setViewRow(row)
  const closeCard = () => setViewRow(null)

  useEffect(() => {
    let alive = true
    Promise.all([loadRoutineOptions(), loadActionOptions()])
      .then(([r, a]) => { if (alive) { setRoutineOpts(r); setActionOpts(a) } })
      .catch(err => console.error('failed to load picker options', err))
    return () => { alive = false }
  }, [])

  const morning = rows.find(r => r.kind === 'routine' && r.slot === 'morning') || null
  const evening = rows.find(r => r.kind === 'routine' && r.slot === 'evening') || null
  const activities = rows.filter(r => r.kind === 'action').slice().sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  const total = sumRegLog(rows)
  const capped = total >= CAP

  function openPick(mode, slot) {
    if (readOnly) return
    setPick({ mode, slot, q: '' })
  }
  function closeSheet() { setPick(null) }

  async function choose(opt) {
    if (busy) return
    setBusy(true)
    try {
      if (pick.mode === 'routine') {
        await onAddRoutine?.(pick.slot, opt)
      } else {
        if (!capped) await onAddAction?.(opt)
      }
      closeSheet()
    } catch (err) {
      console.error('failed to log regulation', err)
    } finally {
      setBusy(false)
    }
  }

  async function remove(row) {
    if (busy || readOnly) return
    setBusy(true)
    try { await onRemove?.(row) }
    catch (err) { console.error('failed to remove regulation row', err) }
    finally { setBusy(false) }
  }

  // ── Routine box ──
  function RoutineBox({ slot, row, ghost }) {
    if (row) {
      return (
        <div className="rg-rbox" onClick={() => openCard(row)} title="tap to see the card">
          <span className="rg-ic">☕</span>
          <span className="rg-nm">{row.label}</span>
          <span className="rg-pp">+{row.points}</span>
          {!readOnly && (
            <span className="rg-x" onClick={e => { e.stopPropagation(); remove(row) }}>×</span>
          )}
        </div>
      )
    }
    return (
      <div className={`rg-rbox ghost${readOnly ? ' readonly' : ''}`} onClick={() => openPick('routine', slot)}>
        <span className="rg-g">{ghost}</span>
      </div>
    )
  }

  // ── Activity cells ──
  const cells = []
  for (let i = 0; i < NBOX; i++) {
    const a = activities[i]
    if (a) {
      cells.push(
        <div className="rg-abox" key={a.id} onClick={() => openCard(a)} title="tap to see the card">
          {!readOnly && <span className="rg-x" onClick={e => { e.stopPropagation(); remove(a) }}>×</span>}
          <div className="rg-anm">{a.label}</div>
          <div className="rg-arow">
            <span className={`rg-atag ${a.action_type === 'all_day' ? 'allday' : 'oneoff'}`}>
              {a.action_type === 'all_day' ? 'all-day' : 'one-off'}
            </span>
            <span className="rg-ap">+{a.points}</span>
          </div>
        </div>
      )
    } else if (capped) {
      cells.push(<div className="rg-abox locked" key={`lock${i}`}><span className="rg-g">full</span></div>)
    } else if (readOnly) {
      cells.push(<div className="rg-abox ghost readonly" key={`empty${i}`}><span className="rg-g">—</span></div>)
    } else {
      cells.push(
        <div className="rg-abox ghost" key={`add${i}`} onClick={() => openPick('activity', null)}>
          <span className="rg-g">+ add an activity</span>
        </div>
      )
    }
  }

  const capMsg = capped
    ? <div className="rg-capmsg full">you've hit {CAP} — that's a full day's regulation. the rest rest. 🌙</div>
    : <div className="rg-capmsg">fill what fits — nothing's owed</div>

  // ── Picker sheet ──
  const opts = pick?.mode === 'routine' ? routineOpts : actionOpts
  const q = (pick?.q ?? '').toLowerCase()
  const filtered = (opts || []).filter(o => o.name.toLowerCase().includes(q))

  return (
    <div className="reg-grid">
      <style>{GRID_STYLES}</style>

      <div className="rg-routines">
        <RoutineBox slot="morning" row={morning} ghost="tap to choose your morning routine" />
        <RoutineBox slot="evening" row={evening} ghost="tap to choose your evening routine" />
      </div>

      <div className="rg-activities">
        <div className="rg-alabel">
          activities
          <span className="rg-cap">all-day choices set in the morning · one-offs as you go</span>
        </div>
        <div className="rg-grid">{cells}</div>
        {capMsg}
      </div>

      {pick && (
        <>
          <div className="rg-scrim" onClick={closeSheet} />
          <div className="rg-sheet up">
            <div className="rg-sh">
              <span className="rg-t">{pick.mode === 'routine' ? 'choose a routine' : 'add an activity'}</span>
              <span className="rg-sheet-x" onClick={closeSheet}>×</span>
            </div>
            <div className="rg-search">
              <span style={{ color: 'var(--rg-faint)' }}>⌕</span>
              <input
                autoFocus
                value={pick.q}
                placeholder={pick.mode === 'routine' ? 'search your routines…' : 'search your actions…'}
                autoComplete="off"
                spellCheck={false}
                onChange={e => setPick(p => ({ ...p, q: e.target.value }))}
              />
            </div>
            <div className="rg-optlist">
              {filtered.length ? filtered.map(o => (
                <div className="rg-opt" key={o.id} onClick={() => choose(o)}>
                  <span className="rg-on">{o.name}</span>
                  {pick.mode === 'routine'
                    ? <span className="rg-src">routine · {o.points}</span>
                    : <span className={`rg-otag ${o.action_type === 'all_day' ? 'allday' : 'oneoff'}`}>
                        {o.action_type === 'all_day' ? 'all-day' : 'one-off'}
                      </span>}
                  <span className="rg-op">+{o.points}</span>
                </div>
              )) : <div className="rg-nomatch">no match — try a different word</div>}
            </div>
          </div>
        </>
      )}

      {viewRow && (
        <div className="rg-cardview" onClick={closeCard}>
          <div className="rg-cardview-panel reg-room" onClick={e => e.stopPropagation()}>
            <style>{REG_STYLES}</style>
            <div className="reg-body">
              {viewRow.kind === 'routine'
                ? (viewRow.routine_id
                    ? <RoutineCard routineId={viewRow.routine_id} onBack={closeCard} backLabel="‹ close" />
                    : <MissingCard onBack={closeCard} />)
                : (viewRow.action_id
                    ? <ActionCard actionId={viewRow.action_id} onBack={closeCard} backLabel="‹ close" />
                    : <MissingCard onBack={closeCard} />)}
              {viewRow.kind === 'routine' && viewRow.routine_id && !readOnly && (
                <div className="rg-swaprow">
                  <button className="rg-swapbtn"
                    onClick={() => { const slot = viewRow.slot; closeCard(); openPick('routine', slot) }}>
                    choose a different routine
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Shown when a logged routine/action's source card was since deleted (FK nulled).
function MissingCard({ onBack }) {
  return (
    <div>
      <button className="reg-back" onClick={onBack}>‹ close</button>
      <div className="card"><div className="cardbody">
        <p className="reg-lede">this card is no longer available — the routine or action it came from was removed. its points still stand for the day.</p>
      </div></div>
    </div>
  )
}

// Styling ported from regulation-on-tracker-prototype.html, scoped under .reg-grid
// and prefixed rg- so the generic prototype class names can't collide with the app.
const GRID_STYLES = `
.reg-grid{
  --rg-ink:#e9edf8; --rg-dim:#9aa6c6; --rg-faint:#65718f; --rg-faint2:#4d587a;
  --rg-line:#243150; --rg-line2:#1c2742;
  --rg-gold:#e6c878; --rg-gold-soft:#f2dfa6;
  --rg-green:#2FBE86; --rg-teal:#5aa9cf; --rg-rose:#e391b0;
  --rg-serif:"Cormorant Garamond",Georgia,serif;
  color:var(--rg-ink);
}
.reg-grid .rg-rbox{border:1.5px solid var(--rg-line);border-radius:13px;padding:16px 18px;margin-bottom:10px;min-height:62px;
  display:flex;align-items:center;gap:13px;cursor:pointer;transition:.13s;background:rgba(20,29,54,.35);}
.reg-grid .rg-rbox:hover{border-color:#46598f;}
.reg-grid .rg-rbox.ghost{border-style:dashed;border-color:#33405f;justify-content:center;}
.reg-grid .rg-rbox.ghost.readonly{cursor:default;}
.reg-grid .rg-rbox.ghost.readonly:hover{border-color:#33405f;}
.reg-grid .rg-rbox .rg-g{font-family:var(--rg-serif);font-style:italic;font-size:18px;color:var(--rg-faint);}
.reg-grid .rg-rbox .rg-ic{width:30px;height:30px;border-radius:9px;background:rgba(47,190,134,.16);display:flex;align-items:center;justify-content:center;font-size:15px;flex:none;}
.reg-grid .rg-rbox .rg-nm{font-family:var(--rg-serif);font-size:21px;color:var(--rg-ink);}
.reg-grid .rg-rbox .rg-pp{margin-left:auto;font-family:var(--rg-serif);font-size:19px;color:var(--rg-green);}
.reg-grid .rg-rbox .rg-x{color:var(--rg-faint);cursor:pointer;font-size:19px;line-height:1;padding-left:4px;}
.reg-grid .rg-rbox .rg-x:hover{color:var(--rg-rose);}

.reg-grid .rg-alabel{font-family:var(--rg-serif);font-style:italic;font-size:16px;color:var(--rg-faint);margin:18px 2px 10px;
  display:flex;align-items:baseline;justify-content:space-between;gap:10px;}
.reg-grid .rg-alabel .rg-cap{font-size:12.5px;font-style:normal;text-align:right;}
.reg-grid .rg-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;}
@media(max-width:560px){.reg-grid .rg-grid{grid-template-columns:repeat(2,1fr);}}
.reg-grid .rg-abox{border:1.5px solid var(--rg-line);border-radius:12px;min-height:78px;padding:11px;cursor:pointer;transition:.13s;
  display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;gap:5px;background:rgba(20,29,54,.4);position:relative;}
.reg-grid .rg-abox:hover{border-color:#46598f;}
.reg-grid .rg-abox.ghost{border-style:dashed;border-color:#33405f;}
.reg-grid .rg-abox.ghost.readonly{cursor:default;}
.reg-grid .rg-abox.ghost.readonly:hover{border-color:#33405f;}
.reg-grid .rg-abox.ghost .rg-g{font-family:var(--rg-serif);font-style:italic;font-size:15px;color:var(--rg-faint);}
.reg-grid .rg-abox.locked{border-style:dashed;border-color:#1c2742;background:rgba(12,18,30,.4);cursor:default;opacity:.5;}
.reg-grid .rg-abox.locked .rg-g{font-size:12px;color:var(--rg-faint2);font-style:italic;}
.reg-grid .rg-abox .rg-anm{font-family:var(--rg-serif);font-size:16.5px;color:var(--rg-ink);line-height:1.15;}
.reg-grid .rg-abox .rg-arow{display:flex;align-items:center;gap:7px;}
.reg-grid .rg-abox .rg-atag{font-size:8.5px;letter-spacing:.06em;text-transform:uppercase;border:1px solid;border-radius:5px;padding:1px 5px;}
.reg-grid .rg-abox .rg-atag.allday{color:var(--rg-gold-soft);border-color:rgba(230,200,120,.45);}
.reg-grid .rg-abox .rg-atag.oneoff{color:var(--rg-teal);border-color:rgba(90,169,207,.4);}
.reg-grid .rg-abox .rg-ap{font-family:var(--rg-serif);font-size:15px;color:var(--rg-teal);}
.reg-grid .rg-abox .rg-x{position:absolute;top:5px;right:8px;color:var(--rg-faint);font-size:15px;cursor:pointer;line-height:1;}
.reg-grid .rg-abox .rg-x:hover{color:var(--rg-rose);}

.reg-grid .rg-capmsg{margin-top:13px;font-size:12.5px;color:var(--rg-faint);font-style:italic;line-height:1.5;text-align:center;}
.reg-grid .rg-capmsg.full{color:var(--rg-gold-soft);}

/* card viewer — tap a filled entry to read its full Activity / Routine card */
.rg-cardview{position:fixed;inset:0;background:rgba(4,7,15,.74);backdrop-filter:blur(3px);z-index:50;
  overflow-y:auto;display:flex;align-items:flex-start;justify-content:center;padding:22px 12px 40px;}
.rg-cardview-panel{width:100%;max-width:620px;}
.rg-swaprow{display:flex;justify-content:center;margin-top:16px;}
.rg-swapbtn{background:rgba(230,200,120,.14);border:1px solid rgba(230,200,120,.4);color:#f2dfa6;
  border-radius:10px;padding:9px 18px;font-size:13px;cursor:pointer;font-family:inherit;}
.rg-swapbtn:hover{background:rgba(230,200,120,.22);}

.rg-scrim{position:fixed;inset:0;background:rgba(4,8,16,.5);z-index:40;}
.rg-sheet{position:fixed;left:0;right:0;bottom:0;background:linear-gradient(180deg,#141d34,#0e1626);
  border-top:1px solid #2f3e63;border-radius:18px 18px 0 0;padding:16px 18px calc(20px + env(safe-area-inset-bottom));
  transform:translateY(110%);transition:transform .24s cubic-bezier(.3,.7,.3,1);z-index:41;max-height:76vh;overflow-y:auto;
  max-width:660px;margin:0 auto;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#e9edf8;}
.rg-sheet.up{transform:translateY(0);}
.rg-sheet .rg-sh{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:11px;}
.rg-sheet .rg-t{font-family:"Cormorant Garamond",Georgia,serif;font-size:21px;color:#f2dfa6;}
.rg-sheet .rg-sheet-x{color:#65718f;font-size:22px;cursor:pointer;line-height:1;}
.rg-sheet .rg-search{display:flex;align-items:center;gap:9px;background:rgba(18,27,48,.6);border:1px solid #1c2742;
  border-radius:11px;padding:10px 13px;margin-bottom:12px;}
.rg-sheet .rg-search:focus-within{border-color:#3c4d80;}
.rg-sheet .rg-search input{flex:1;background:none;border:none;color:#e9edf8;font-size:15px;outline:none;font-family:inherit;}
.rg-sheet .rg-search input::placeholder{color:#65718f;}
.rg-sheet .rg-optlist{--rg-faint:#65718f;}
.rg-sheet .rg-opt{display:flex;align-items:center;gap:11px;border:1px solid #243150;border-radius:11px;padding:11px 14px;margin-bottom:7px;
  cursor:pointer;background:rgba(20,29,54,.45);transition:.13s;}
.rg-sheet .rg-opt:hover{border-color:#56689c;background:rgba(28,39,68,.6);}
.rg-sheet .rg-on{font-family:"Cormorant Garamond",Georgia,serif;font-size:18px;color:#e9edf8;}
.rg-sheet .rg-otag{font-size:8.5px;letter-spacing:.06em;text-transform:uppercase;border:1px solid;border-radius:5px;padding:1px 6px;}
.rg-sheet .rg-otag.allday{color:#f2dfa6;border-color:rgba(230,200,120,.45);}
.rg-sheet .rg-otag.oneoff{color:#5aa9cf;border-color:rgba(90,169,207,.4);}
.rg-sheet .rg-op{margin-left:auto;font-family:"Cormorant Garamond",Georgia,serif;font-size:17px;color:#2FBE86;}
.rg-sheet .rg-src{font-size:10.5px;color:#65718f;font-style:italic;margin-left:6px;}
.rg-sheet .rg-nomatch{color:#65718f;font-style:italic;font-size:13px;padding:14px;text-align:center;}
`
