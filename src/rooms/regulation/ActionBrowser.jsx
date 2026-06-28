import { useState, useEffect, useMemo } from 'react'
import { loadActions, loadTool, ACTION_GROUP_ORDER } from './lib/regulationDb.js'

/**
 * ActionBrowser — the shared grouped/searchable list of actions, used in two
 * places so the two surfaces never drift apart (engine room id=145 "LOCKED pt 6"):
 *
 *   • mode="manage" — the Regulation room's Actions tab. Browse + read + edit.
 *     Rows have a caret → inline card (5 sections, channel tags, first-aid badge,
 *     a link to the backing shelf card, and an "edit" link). NO daily points here.
 *
 *   • mode="pick" — the picker drawer on the Capacity Tracker. Each row carries a
 *     "use → added ✓" button that writes to the day's log; at the 20-pt cap the
 *     unselected buttons grey to "full". The day's points + cap live in the
 *     Tracker, which drives `selectedIds` / `capped` / `onToggleUse`.
 *
 * Self-contained styles (--ab-* vars) so it looks right in either container.
 */

const SECTIONS = [
  ['what it is', 'what_it_is'],
  ['how to use it', 'how_to_use'],
  ['what counts', 'what_counts'],
  ['stop if', 'stop_if'],
  ['why it helps', 'why_it_helps'],
]
const SCI_FIELDS = [
  ['what it is', 'description'],
  ['how to use it', 'how_to_use'],
  ['the science', 'the_science'],
  ['notes & variations', 'notes_variations'],
]
const TYPE_FILTERS = [['all', 'all'], ['all_day', 'all-day'], ['one_off', 'one-off']]

export default function ActionBrowser({
  mode = 'manage', reloadSignal = 0, focusActionId = null, onConsumedFocus,
  // pick mode:
  selectedIds, capped = false, onToggleUse, busyId = null, onEditInRoom,
  featureRecovery = false,
  // manage mode:
  onEdit, onOpenShelf,
}) {
  const [actions, setActions] = useState(null)
  const [q, setQ] = useState('')
  const [gFilter, setG] = useState('all')
  const [tFilter, setT] = useState('all')
  const [openGroups, setOpenGroups] = useState(() => new Set())
  const [expanded, setExpanded] = useState(() => new Set())

  useEffect(() => {
    loadActions().then(setActions).catch(e => { console.error('[Regulation] load actions', e); setActions([]) })
  }, [reloadSignal])

  // Deep-link in (shelf card → its specific action): open the group + the row.
  useEffect(() => {
    if (focusActionId == null || !actions) return
    const a = actions.find(x => x.id === focusActionId)
    if (a) {
      setOpenGroups(s => new Set(s).add(a.group))
      setExpanded(s => new Set(s).add(a.id))
    }
    onConsumedFocus?.()
  }, [focusActionId, actions])

  function toggleGroup(g) { setOpenGroups(s => { const n = new Set(s); n.has(g) ? n.delete(g) : n.add(g); return n }) }
  function toggleRow(id)  { setExpanded(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n }) }

  const ql = q.trim().toLowerCase()
  const searching = !!ql || gFilter !== 'all' || tFilter !== 'all'
  const filtered = (actions || []).filter(a =>
    (gFilter === 'all' || a.group === gFilter) &&
    (tFilter === 'all' || a.action_type === tFilter) &&
    (!ql || a.name.toLowerCase().includes(ql))
  )
  const presentGroups = useMemo(() => {
    const inOrder = ACTION_GROUP_ORDER.filter(g => filtered.some(a => a.group === g))
    const extras = [...new Set(filtered.map(a => a.group))].filter(g => !ACTION_GROUP_ORDER.includes(g))
    return [...inOrder, ...extras]
  }, [filtered])

  // Purple-day "gathered for you" layer — the recovery-tagged actions surfaced at
  // the top for easy reach. It SURFACES, it does not gate: every action still lives
  // in its normal group below, nothing is hidden or blocked.
  const recoveryRows = (featureRecovery && mode === 'pick')
    ? filtered.filter(a => a.recovery) : []

  return (
    <div className="ab">
      <style>{BROWSE_STYLES}</style>

      <div className="ab-search">
        <span className="ab-si">⌕</span>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="search an action…" autoComplete="off" spellCheck={false} />
        {q && <span className="ab-sx" onClick={() => setQ('')}>×</span>}
      </div>

      <div className="ab-filtlab">group · how it’s lived</div>
      <div className="ab-chips">
        <span className={`ab-fchip ${gFilter === 'all' ? 'on' : ''}`} onClick={() => setG('all')}>all</span>
        {ACTION_GROUP_ORDER.map(g => (
          <span key={g} className={`ab-fchip ${gFilter === g ? 'on' : ''}`} onClick={() => setG(g)}>{g}</span>
        ))}
      </div>
      <div className="ab-filtlab">type</div>
      <div className="ab-chips">
        {TYPE_FILTERS.map(([v, l]) => (
          <span key={v} className={`ab-fchip ${tFilter === v ? 'on' : ''}`} onClick={() => setT(v)}>{l}</span>
        ))}
      </div>

      {actions === null ? <div className="ab-loading">…</div> : (
        <>
          {recoveryRows.length > 0 && (
            <div className="ab-feature">
              <div className="ab-feathd">
                <span className="ab-featname">gathered for you</span>
                <span className="ab-featsub">gentle recovery · uncapped</span>
              </div>
              <div className="ab-grows open-rows">
                {recoveryRows.map(a => (
                  <ActionRow
                    key={`feat-${a.id}`} a={a} mode={mode}
                    on={!!selectedIds?.has(a.id)} capped={capped} busy={busyId === a.id}
                    exp={expanded.has(a.id)}
                    onToggleUse={onToggleUse}
                    onToggleRow={() => toggleRow(a.id)}
                    onEdit={onEdit}
                    onOpenShelf={onOpenShelf}
                    onEditInRoom={onEditInRoom}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="ab-groups">
            {presentGroups.map(g => {
              const rows = filtered.filter(a => a.group === g)
              const isOpen = searching || openGroups.has(g)
              return (
                <div className={`ab-group ${isOpen ? 'open' : ''}`} key={g}>
                  <div className="ab-grouphd" onClick={() => toggleGroup(g)}>
                    <span className="ab-gname">{g}</span>
                    <span className="ab-gcount">{rows.length}</span>
                    <span className="ab-car">▾</span>
                  </div>
                  <div className="ab-grows">
                    {rows.map(a => (
                      <ActionRow
                        key={a.id} a={a} mode={mode}
                        on={!!selectedIds?.has(a.id)} capped={capped} busy={busyId === a.id}
                        exp={expanded.has(a.id)}
                        onToggleUse={onToggleUse}
                        onToggleRow={() => toggleRow(a.id)}
                        onEdit={onEdit}
                        onOpenShelf={onOpenShelf}
                        onEditInRoom={onEditInRoom}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {filtered.length === 0 && (
            <div className="ab-nomatch">{searching ? 'no match — try a different word or filter' : 'no actions yet.'}</div>
          )}
          {!searching && presentGroups.length > 0 && (
            <div className="ab-calmnote">groups are closed by default — tap one to open it. searching opens them all.</div>
          )}
        </>
      )}
    </div>
  )
}

// ── One action row: header + inline card ──
// Tap anywhere on the header to open/close the card (the caret is just a hint).
function ActionRow({ a, mode, on, capped, busy, exp, onToggleUse, onToggleRow, onEdit, onOpenShelf, onEditInRoom }) {
  const [sci, setSci] = useState(null)
  const [sciOpen, setSciOpen] = useState(false)
  const locked = capped && !on
  const allday = a.action_type === 'all_day'

  async function shelfClick() {
    if (onOpenShelf) { onOpenShelf(a.tool_id, a.backing?.name); return }
    if (a.tool_id == null) return
    if (sci) { setSciOpen(o => !o); return }
    try { const tool = await loadTool(a.tool_id); setSci(tool); setSciOpen(true) }
    catch (e) { console.error('[Regulation] load shelf card', e) }
  }

  return (
    <div className={`ab-row ${exp ? 'exp' : ''}`}>
      <div className="ab-rowhd" onClick={onToggleRow} title="tap to read the card">
        <span className="ab-dot" />
        <span className="ab-rnm">{a.name}</span>
        <span className={`ab-ptag ${allday ? 'allday' : ''}`}>+{a.points}</span>
        {mode === 'pick' && (
          on
            ? <button className="ab-use added" disabled={busy} onClick={e => { e.stopPropagation(); onToggleUse?.(a) }}>added ✓</button>
            : locked
              ? <button className="ab-use full" disabled onClick={e => e.stopPropagation()}>full</button>
              : <button className="ab-use" disabled={busy} onClick={e => { e.stopPropagation(); onToggleUse?.(a) }}>use</button>
        )}
        <span className="ab-car" aria-hidden="true">▾</span>
      </div>

      {exp && (
        <div className="ab-body">
          {SECTIONS.map(([label, key]) => (
            <div className="ab-sec" key={key}>
              <div className="ab-sl">{label}</div>
              {a[key] ? <div className="ab-sv">{a[key]}</div> : <div className="ab-sv todo">— optional</div>}
            </div>
          ))}

          <div className="ab-tagrow">
            {a.channels.map((c, i) => <span key={c + i} className={`ab-chtag ${i > 0 ? 'sec' : ''}`}>{c}</span>)}
            {a.firstAid && <span className="ab-fa">first aid</span>}
          </div>

          <div className="ab-cardlinks">
            {a.tool_id != null && (
              <button className="ab-shelflink" onClick={shelfClick}>
                {onOpenShelf
                  ? `open shelf card${a.backing?.name ? `: ${a.backing.name}` : ''} →`
                  : (sciOpen ? 'hide the science ▴' : `the science${a.backing?.name ? `: ${a.backing.name}` : ''} ▾`)}
              </button>
            )}
            {mode === 'manage' && onEdit && <button className="ab-editlink" onClick={() => onEdit(a)}>edit</button>}
            {mode === 'pick' && onEditInRoom && <button className="ab-editlink" onClick={() => onEditInRoom(a.id)}>edit in the Regulation room →</button>}
          </div>

          {!onOpenShelf && sciOpen && sci && (
            <div className="ab-sci">
              {SCI_FIELDS.some(([, k]) => sci[k]) ? (
                SCI_FIELDS.map(([label, key]) => sci[key] ? (
                  <div className="ab-scisec" key={key}><div className="ab-scil">{label}</div><p>{sci[key]}</p></div>
                ) : null)
              ) : <p className="ab-scinone">the science on this shelf card hasn’t been written up yet.</p>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Self-contained palette so the list looks right inside the Actions tab AND the
// Tracker drawer (neither container's CSS vars are assumed).
const BROWSE_STYLES = `
.ab{--ab-ink:#e9edf8;--ab-dim:#9eaacb;--ab-faint:#6b779b;--ab-faint2:#4d587a;
  --ab-line:#2b3a60;--ab-gold:#e6c878;--ab-gold-soft:#f2dfa6;--ab-green:#2FBE86;
  --ab-teal:#5aa9cf;--ab-rose:#e391b0;--ab-amethyst:#b08ae0;color:var(--ab-ink);
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;}
.ab .ab-search{display:flex;align-items:center;gap:9px;background:rgba(13,21,40,.7);border:1px solid var(--ab-line);
  border-radius:11px;padding:11px 13px;margin-bottom:14px;}
.ab .ab-search:focus-within{border-color:#3c4d80;}
.ab .ab-search input{flex:1;background:none;border:none;color:var(--ab-ink);font-size:14px;outline:none;font-family:inherit;}
.ab .ab-search input::placeholder{color:var(--ab-faint);}
.ab .ab-si{color:var(--ab-faint);}
.ab .ab-sx{color:var(--ab-faint);cursor:pointer;font-size:17px;line-height:1;}
.ab .ab-loading{color:var(--ab-faint);text-align:center;font-style:italic;padding:30px 0;}
.ab .ab-filtlab{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--ab-faint);margin:4px 2px 7px;}
.ab .ab-chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;}
.ab .ab-fchip{border:1px solid var(--ab-line);background:rgba(20,29,54,.5);color:var(--ab-dim);border-radius:999px;
  padding:5px 12px;font-size:12.5px;cursor:pointer;white-space:nowrap;transition:.13s;}
.ab .ab-fchip:hover{border-color:#52639c;}
.ab .ab-fchip.on{border-color:var(--ab-gold);background:rgba(230,200,120,.13);color:var(--ab-gold-soft);}

/* "gathered for you" — purple-day recovery palette, surfaced at the top */
.ab .ab-feature{border:1px solid rgba(176,138,224,.34);background:rgba(54,40,90,.18);
  border-radius:13px;padding:4px 12px 8px;margin-bottom:14px;}
.ab .ab-feathd{display:flex;align-items:baseline;gap:9px;padding:11px 2px 4px;}
.ab .ab-featname{font-family:"Cormorant Garamond",Georgia,serif;font-size:17px;color:#c9aef0;}
.ab .ab-featsub{font-size:10.5px;color:var(--ab-faint);font-style:italic;letter-spacing:.03em;}
.ab .ab-feature .ab-grows{display:block;padding-bottom:2px;}
.ab .ab-feature .ab-row:first-child{border-top:0;}

.ab .ab-groups{margin-top:4px;}
.ab .ab-group{border-top:1px solid var(--ab-line);}
.ab .ab-group:first-child{border-top:0;}
.ab .ab-grouphd{display:flex;align-items:center;gap:9px;padding:13px 2px;cursor:pointer;user-select:none;}
.ab .ab-gname{font-family:"Cormorant Garamond",Georgia,serif;font-size:17px;color:var(--ab-ink);}
.ab .ab-gcount{color:var(--ab-faint);font-size:12px;}
.ab .ab-car{margin-left:auto;color:var(--ab-faint);font-size:12px;transition:transform .18s;}
.ab .ab-group.open .ab-car{transform:rotate(180deg);}
.ab .ab-grows{display:none;padding-bottom:6px;}
.ab .ab-group.open .ab-grows{display:block;}

.ab .ab-row{border-top:1px solid rgba(43,58,96,.5);}
.ab .ab-rowhd{display:flex;align-items:center;gap:11px;padding:11px 2px;cursor:pointer;}
.ab .ab-rowhd:hover .ab-rnm{color:#fff;}
.ab .ab-dot{width:5px;height:5px;border-radius:50%;background:var(--ab-faint);flex:none;}
.ab .ab-rnm{font-size:15px;color:var(--ab-ink);}
.ab .ab-ptag{font-size:11.5px;color:var(--ab-faint);font-variant-numeric:tabular-nums;min-width:26px;margin-left:auto;}
.ab .ab-ptag.allday{color:var(--ab-amethyst);}
.ab .ab-use{border:1px solid var(--ab-green);background:transparent;color:var(--ab-green);border-radius:8px;
  padding:5px 15px;font-size:12px;letter-spacing:.04em;cursor:pointer;white-space:nowrap;font-family:inherit;transition:.13s;}
.ab .ab-use:hover{background:rgba(47,190,134,.12);}
.ab .ab-use.added{border-color:var(--ab-gold);color:var(--ab-gold-soft);background:rgba(230,200,120,.12);}
.ab .ab-use.full{border-color:var(--ab-line);color:var(--ab-faint);cursor:not-allowed;background:transparent;}
.ab .ab-use:disabled{opacity:.7;}
.ab .ab-ptag:not(.allday) ~ .ab-use{}
.ab .ab-car{color:var(--ab-faint);font-size:12px;padding:4px;transition:transform .18s;display:inline-block;}
.ab .ab-row.exp .ab-car{transform:rotate(180deg);}

.ab .ab-body{background:rgba(12,20,40,.45);border-radius:10px;margin:0 0 9px;padding:6px 4px 14px;animation:abpop .18s ease;}
@keyframes abpop{from{opacity:0;transform:translateY(-3px)}to{opacity:1;transform:none}}
.ab .ab-sec{padding:8px 13px 0;}
.ab .ab-sl{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--ab-green);margin-bottom:2px;font-weight:600;}
.ab .ab-sv{font-size:13px;color:#dbe2f4;line-height:1.55;white-space:pre-wrap;}
.ab .ab-sv.todo{color:var(--ab-faint);font-style:italic;}
.ab .ab-tagrow{display:flex;flex-wrap:wrap;gap:5px;align-items:center;padding:13px 13px 0;}
.ab .ab-chtag{font-size:10.5px;padding:2px 9px;border-radius:999px;border:1px solid rgba(47,190,134,.4);color:#9fe3c4;background:rgba(47,190,134,.07);}
.ab .ab-chtag.sec{border-color:rgba(110,130,180,.4);color:var(--ab-dim);background:transparent;}
.ab .ab-fa{font-size:10px;letter-spacing:.06em;text-transform:uppercase;padding:2px 9px;border-radius:999px;border:1px solid rgba(227,145,176,.5);color:#e391b0;}
.ab .ab-cardlinks{display:flex;align-items:center;gap:16px;padding:14px 13px 0;}
.ab .ab-shelflink{background:none;border:none;font-size:12.5px;color:var(--ab-gold-soft);cursor:pointer;font-family:inherit;
  border-bottom:1px dashed rgba(242,223,166,.4);padding:0 0 1px;}
.ab .ab-shelflink:hover{color:var(--ab-gold);}
.ab .ab-editlink{background:none;border:none;font-size:12.5px;color:var(--ab-faint);cursor:pointer;font-family:inherit;margin-left:auto;}
.ab .ab-editlink:hover{color:var(--ab-ink);}
.ab .ab-sci{margin:13px 13px 0;border-top:1px solid var(--ab-line);padding-top:12px;}
.ab .ab-scisec{margin-bottom:12px;}
.ab .ab-scil{font-size:10px;letter-spacing:.13em;text-transform:uppercase;color:var(--ab-faint);margin-bottom:3px;}
.ab .ab-sci p{margin:0;font-size:12.5px;line-height:1.55;color:#dbe2f4;white-space:pre-wrap;}
.ab .ab-scinone{color:var(--ab-faint);font-style:italic;}

.ab .ab-nomatch{color:var(--ab-faint);font-style:italic;font-size:13px;padding:16px;text-align:center;}
.ab .ab-calmnote{color:var(--ab-faint);font-size:12px;font-style:italic;text-align:center;padding:14px 0 2px;}
`
