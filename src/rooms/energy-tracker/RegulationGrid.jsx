/**
 * RegulationGrid — the daily regulation surface on the Capacity Tracker: the
 * "Today" (CHOSEN) half of the two-surface model (engine room id=145 "LOCKED
 * pt 6"). Top to bottom:
 *   • two routine slots (morning / evening) — tap to pick a routine (6 pts each)
 *   • a GROWING "today's choices (N)" list — one chip per picked action
 *     (name · type tag · +points · ×); the list stretches/shrinks to exactly
 *     what was chosen (no fixed boxes)
 *   • a quiet "regulation today" readout (running total). At the 20-point cap a
 *     single gentle line shows — no bar, no "x of 20", no nudge (visited-not-fed).
 *
 * Picking actions happens over in the Regulation room's Actions tab ("Manage");
 * both surfaces write the same per-day `regulation_log`, so they share one day.
 * Tapping any chip opens its card. The × removes the row.
 *
 * State of the day comes in as `rows` (regulation_log rows); all mutations go
 * through onAddRoutine / onRemove so the parent can recompute the day's rings
 * and carry-forward closing balance.
 */

import { useEffect, useState } from 'react'
import { loadRoutineOptions, sumRegLog, loadRecoveryActionIds } from '../../shared/lib/regulationLog.js'
import RoutineCard from '../regulation/RoutineCard.jsx'
import ActionCard from '../regulation/ActionCard.jsx'
import ActionBrowser from '../regulation/ActionBrowser.jsx'
import { REG_STYLES } from '../regulation/regStyles.js'

const CAP = 20

export default function RegulationGrid({ rows = [], onAddRoutine, onAddAction, onRemove, onEditAction, isPurple = false, readOnly = false }) {
  const [routineOpts, setRoutineOpts] = useState([])
  const [pick, setPick] = useState(null)   // { slot, q } | null  (routine picker)
  const [busy, setBusy] = useState(false)
  const [viewRow, setViewRow] = useState(null)   // a logged row whose card is open
  const [pickerOpen, setPickerOpen] = useState(false)   // the action picker drawer
  const [togglingId, setTogglingId] = useState(null)    // action id mid-write in the drawer
  const [recoveryIds, setRecoveryIds] = useState(() => new Set())   // action ids tagged 'recovery'

  const openCard = (row) => setViewRow(row)
  const closeCard = () => setViewRow(null)

  useEffect(() => {
    let alive = true
    loadRoutineOptions()
      .then(r => { if (alive) setRoutineOpts(r) })
      .catch(err => console.error('failed to load routine options', err))
    return () => { alive = false }
  }, [])

  // The recovery-tagged action ids drive both the purple-day recovery collection
  // (care given) and the "gathered for you" palette in the picker.
  useEffect(() => {
    if (!isPurple) return
    let alive = true
    loadRecoveryActionIds()
      .then(s => { if (alive) setRecoveryIds(s) })
      .catch(err => console.error('failed to load recovery action ids', err))
    return () => { alive = false }
  }, [isPurple])

  const morning = rows.find(r => r.kind === 'routine' && r.slot === 'morning') || null
  const evening = rows.find(r => r.kind === 'routine' && r.slot === 'evening') || null
  const activities = rows.filter(r => r.kind === 'action').slice().sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  const total = sumRegLog(rows)
  // Purple days are UNCAPPED — recovery has no ceiling, so nothing greys out at the
  // floor; points simply route to recovery past the waterline. The 20-pt cap stays
  // on normal days only.
  const capped = !isPurple && total >= CAP
  const selectedIds = new Set(activities.map(a => a.action_id).filter(id => id != null))

  // The recovery COLLECTION (purple only) — care given, not a score. Everything
  // gentle reached for today: any row that overflowed past the line (points_recovery
  // > 0) PLUS any recovery-tagged action logged today, whichever side it landed.
  const recoveryItems = isPurple
    ? rows.filter(r => (r.points_recovery ?? 0) > 0 ||
                       (r.kind === 'action' && recoveryIds.has(r.action_id)))
          .slice().sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    : []

  // Pick / unpick an action from the drawer — writes the same day's log the list reads.
  async function toggleUse(action) {
    if (readOnly || togglingId) return
    setTogglingId(action.id)
    try {
      const existing = activities.filter(r => r.action_id === action.id)
      if (existing.length) {
        for (const r of existing) await onRemove?.(r)
      } else if (!capped) {
        await onAddAction?.(action)
      }
    } catch (err) {
      console.error('failed to toggle action', err)
    } finally {
      setTogglingId(null)
    }
  }

  function openPick(slot) {
    if (readOnly) return
    setPick({ slot, q: '' })
  }
  function closeSheet() { setPick(null) }

  async function choose(opt) {
    if (busy) return
    setBusy(true)
    try {
      await onAddRoutine?.(pick.slot, opt)
      closeSheet()
    } catch (err) {
      console.error('failed to log routine', err)
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
      <div className={`rg-rbox ghost${readOnly ? ' readonly' : ''}`} onClick={() => openPick(slot)}>
        <span className="rg-g">{ghost}</span>
      </div>
    )
  }

  // ── Picker sheet (routines only) ──
  const q = (pick?.q ?? '').toLowerCase()
  const filtered = (routineOpts || []).filter(o => o.name.toLowerCase().includes(q))

  return (
    <div className="reg-grid">
      <style>{GRID_STYLES}</style>

      <div className="rg-routines">
        <RoutineBox slot="morning" row={morning} ghost="tap to choose your morning routine" />
        <RoutineBox slot="evening" row={evening} ghost="tap to choose your evening routine" />
      </div>

      <div className="rg-chosen">
        <div className="rg-chead">
          <h3>today’s choices</h3>
          <span className="rg-ct">({activities.length})</span>
          <span className="rg-readout"><b>{total}</b><span>regulation today</span></span>
        </div>

        {activities.length ? (
          <div className="rg-chiplist">
            {activities.map(a => (
              <div className="rg-chip" key={a.id} onClick={() => openCard(a)} title="tap to see the card">
                <span className="rg-cnm">{a.label}</span>
                <span className={`rg-ctag ${a.action_type === 'all_day' ? 'allday' : 'oneoff'}`}>
                  {a.action_type === 'all_day' ? 'all-day' : 'one-off'}
                </span>
                <span className="rg-cp">+{a.points}</span>
                {!readOnly && <button className="rg-cx" onClick={e => { e.stopPropagation(); remove(a) }} title="remove">×</button>}
              </div>
            ))}
          </div>
        ) : (
          <div className="rg-emptynote">
            {readOnly ? 'nothing was logged this day' : 'nothing logged yet — pick from the Regulation room’s Actions tab, or tap an action through the day'}
          </div>
        )}

        {capped && (
          <div className="rg-capmsg full">you’ve hit {CAP} — that’s a full day’s regulation. the rest rest. 🌙</div>
        )}

        {!readOnly && !capped && (
          <button className="rg-addbtn" onClick={() => setPickerOpen(true)}>+ add an action</button>
        )}
      </div>

      {isPurple && recoveryItems.length > 0 && (
        <div className="rg-recovery">
          <div className="rg-rechead">what you reached for today</div>
          <div className="rg-recsub">care given · the day’s whole job</div>
          <ul className="rg-reclist">
            {recoveryItems.map(r => (
              <li className="rg-recitem" key={`rec-${r.id}`}>
                <span className="rg-recmark">♥</span>
                <span className="rg-recnm">{r.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {pick && (
        <>
          <div className="rg-scrim" onClick={closeSheet} />
          <div className="rg-sheet up">
            <div className="rg-sh">
              <span className="rg-t">choose a routine</span>
              <span className="rg-sheet-x" onClick={closeSheet}>×</span>
            </div>
            <div className="rg-search">
              <span style={{ color: 'var(--rg-faint)' }}>⌕</span>
              <input
                autoFocus
                value={pick.q}
                placeholder="search your routines…"
                autoComplete="off"
                spellCheck={false}
                onChange={e => setPick(p => ({ ...p, q: e.target.value }))}
              />
            </div>
            <div className="rg-optlist">
              {filtered.length ? filtered.map(o => (
                <div className="rg-opt" key={o.id} onClick={() => choose(o)}>
                  <span className="rg-on">{o.name}</span>
                  <span className="rg-src">routine · {o.points}</span>
                  <span className="rg-op">+{o.points}</span>
                </div>
              )) : <div className="rg-nomatch">no match — try a different word</div>}
            </div>
          </div>
        </>
      )}

      {pickerOpen && (
        <>
          <div className="rg-pscrim" onClick={() => setPickerOpen(false)} />
          <div className="rg-pdrawer up">
            <div className="rg-ph">
              <span className="rg-pt">add an action</span>
              <span className="rg-pclose" onClick={() => setPickerOpen(false)}>×</span>
            </div>
            <ActionBrowser
              mode="pick"
              selectedIds={selectedIds}
              capped={capped}
              busyId={togglingId}
              onToggleUse={toggleUse}
              featureRecovery={isPurple}
              onEditInRoom={onEditAction ? (id) => { setPickerOpen(false); onEditAction(id) } : undefined}
            />
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
                    ? <RoutineCard routineId={viewRow.routine_id} onBack={closeCard} backLabel="‹ close" flat />
                    : <MissingCard onBack={closeCard} />)
                : (viewRow.action_id
                    ? <ActionCard actionId={viewRow.action_id} onBack={closeCard} backLabel="‹ close" />
                    : <MissingCard onBack={closeCard} />)}
              {viewRow.kind === 'routine' && viewRow.routine_id && !readOnly && (
                <div className="rg-swaprow">
                  <button className="rg-swapbtn"
                    onClick={() => { const slot = viewRow.slot; closeCard(); openPick(slot) }}>
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

// Styling ported from the regulation-actions-wireframe "Today" surface, scoped
// under .reg-grid and prefixed rg- so generic class names can't collide.
const GRID_STYLES = `
.reg-grid{
  --rg-ink:#e9edf8; --rg-dim:#9aa6c6; --rg-faint:#65718f; --rg-faint2:#4d587a;
  --rg-line:#243150; --rg-line2:#1c2742;
  --rg-gold:#e6c878; --rg-gold-soft:#f2dfa6;
  --rg-green:#2FBE86; --rg-teal:#5aa9cf; --rg-rose:#e391b0; --rg-amethyst:#b08ae0;
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

/* today's choices — a growing list, not boxes */
.reg-grid .rg-chosen{margin-top:20px;}
.reg-grid .rg-chead{display:flex;align-items:baseline;gap:8px;margin:0 2px 11px;}
.reg-grid .rg-chead h3{font-family:var(--rg-serif);font-size:20px;color:var(--rg-gold-soft);margin:0;font-weight:600;}
.reg-grid .rg-chead .rg-ct{color:var(--rg-faint);font-size:14px;}
.reg-grid .rg-readout{margin-left:auto;text-align:right;}
.reg-grid .rg-readout b{font-family:var(--rg-serif);color:var(--rg-green);font-size:18px;font-variant-numeric:tabular-nums;}
.reg-grid .rg-readout span{color:var(--rg-faint2);font-size:10.5px;display:block;letter-spacing:.04em;}

.reg-grid .rg-chiplist{display:flex;flex-direction:column;gap:7px;}
.reg-grid .rg-chip{display:flex;align-items:center;gap:11px;background:rgba(20,29,54,.5);border:1px solid var(--rg-line);
  border-radius:11px;padding:11px 13px;cursor:pointer;transition:.13s;animation:rgpop .18s ease;}
.reg-grid .rg-chip:hover{border-color:#46598f;}
@keyframes rgpop{from{opacity:0;transform:translateY(-3px)}to{opacity:1;transform:none}}
.reg-grid .rg-chip .rg-cnm{font-family:var(--rg-serif);font-size:17px;color:var(--rg-ink);}
.reg-grid .rg-chip .rg-ctag{font-size:8.5px;letter-spacing:.06em;text-transform:uppercase;border:1px solid;border-radius:5px;padding:1px 6px;}
.reg-grid .rg-chip .rg-ctag.allday{color:var(--rg-gold-soft);border-color:rgba(230,200,120,.45);}
.reg-grid .rg-chip .rg-ctag.oneoff{color:var(--rg-teal);border-color:rgba(90,169,207,.4);}
.reg-grid .rg-chip .rg-cp{margin-left:auto;font-family:var(--rg-serif);font-size:15px;color:var(--rg-teal);font-variant-numeric:tabular-nums;}
.reg-grid .rg-chip .rg-cx{border:0;background:transparent;color:var(--rg-faint);font-size:17px;cursor:pointer;line-height:1;padding:0 2px;}
.reg-grid .rg-chip .rg-cx:hover{color:var(--rg-rose);}

.reg-grid .rg-emptynote{color:var(--rg-faint);font-style:italic;font-size:13px;border:1px dashed var(--rg-line2);
  border-radius:11px;padding:16px;text-align:center;line-height:1.5;}
.reg-grid .rg-capmsg{margin-top:13px;font-size:12.5px;color:var(--rg-gold-soft);font-style:italic;line-height:1.5;text-align:center;}

/* recovery collection — purple days only. care given, not a score: no count, no
   target, no bar, no nudge. a quiet gathering of what was tended to. */
.reg-grid .rg-recovery{margin-top:22px;border-top:1px solid rgba(176,138,224,.22);padding-top:16px;}
.reg-grid .rg-rechead{font-family:var(--rg-serif);font-size:19px;color:var(--rg-amethyst);}
.reg-grid .rg-recsub{font-size:11px;color:var(--rg-faint2);font-style:italic;letter-spacing:.03em;margin:1px 0 11px;}
.reg-grid .rg-reclist{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px;}
.reg-grid .rg-recitem{display:flex;align-items:center;gap:10px;background:rgba(54,40,90,.28);
  border:1px solid rgba(176,138,224,.22);border-radius:11px;padding:10px 13px;}
.reg-grid .rg-recmark{color:var(--rg-amethyst);font-size:13px;flex:none;}
.reg-grid .rg-recnm{font-family:var(--rg-serif);font-size:17px;color:var(--rg-ink);}

/* + add an action — opens the picker drawer */
.reg-grid .rg-addbtn{margin-top:13px;width:100%;border:1px dashed #33405f;background:rgba(20,29,54,.3);color:var(--rg-faint);
  border-radius:12px;padding:13px;font-family:var(--rg-serif);font-style:italic;font-size:16px;cursor:pointer;transition:.13s;}
.reg-grid .rg-addbtn:hover{border-color:#56689c;color:var(--rg-dim);}

/* picker drawer — side on desktop, slide-up sheet on phone */
.rg-pscrim{position:fixed;inset:0;background:rgba(4,8,16,.55);backdrop-filter:blur(2px);z-index:60;}
.rg-pdrawer{position:fixed;z-index:61;background:linear-gradient(180deg,#0e1838 0%,#131f48 60%,#0f1a3a 100%);
  overflow-y:auto;-webkit-overflow-scrolling:touch;}
.rg-pdrawer .rg-ph{display:flex;align-items:baseline;gap:10px;margin-bottom:14px;}
.rg-pdrawer .rg-pt{font-family:"Cormorant Garamond",Georgia,serif;font-size:22px;color:#f2dfa6;}
.rg-pdrawer .rg-pclose{margin-left:auto;color:#65718f;font-size:24px;cursor:pointer;line-height:1;}
@media(min-width:721px){
  .rg-pdrawer{right:0;top:0;bottom:0;width:clamp(360px,42vw,520px);border-left:1px solid rgba(232,201,140,.22);
    padding:24px 26px 48px;transform:translateX(100%);transition:transform .26s cubic-bezier(.3,.7,.3,1);}
  .rg-pdrawer.up{transform:translateX(0);}
}
@media(max-width:720px){
  .rg-pdrawer{left:0;right:0;bottom:0;max-height:86vh;border-top:1px solid #2f3e63;border-radius:18px 18px 0 0;
    max-width:660px;margin:0 auto;padding:16px 16px calc(20px + env(safe-area-inset-bottom));
    transform:translateY(110%);transition:transform .26s cubic-bezier(.3,.7,.3,1);}
  .rg-pdrawer.up{transform:translateY(0);}
}

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
.rg-sheet .rg-op{margin-left:auto;font-family:"Cormorant Garamond",Georgia,serif;font-size:17px;color:#2FBE86;}
.rg-sheet .rg-src{font-size:10.5px;color:#65718f;font-style:italic;margin-left:6px;}
.rg-sheet .rg-nomatch{color:#65718f;font-style:italic;font-size:13px;padding:14px;text-align:center;}
`
