import { useState, useEffect, useMemo } from 'react'
import {
  loadActions, createAction, updateAction, deleteAction,
  loadShelf, createTool, CHANNEL_AISLES,
} from './lib/regulationDb.js'

const SECTIONS = [
  ['what it is', 'what_it_is'],
  ['how to use it', 'how_to_use'],
  ['what counts', 'what_counts'],
  ['stop if', 'stop_if'],
  ['why it helps', 'why_it_helps'],
]

const GROUPS = [
  ['All-day choices', 'all_day', 'standing choices you set for the whole day'],
  ['One-off acts',    'one_off', 'little things you do and log as you go'],
]

// A blank draft for "+ add an action" (defaults: one-off, 1 point).
function blankDraft() {
  return {
    id: null, name: '', action_type: 'one_off', points: 1,
    tool_id: null, backingName: null, backingChannel: null,
    sections: {}, showSections: false,
    linkOpen: false, linkQuery: '', makeOpen: false, newCardName: '', newCardChannel: '',
  }
}

function draftFromAction(a) {
  return {
    id: a.id, name: a.name, action_type: a.action_type, points: a.points,
    tool_id: a.tool_id,
    backingName: a.backing?.name ?? null, backingChannel: a.backing?.channel_primary ?? null,
    sections: {
      what_it_is: a.what_it_is || '', how_to_use: a.how_to_use || '',
      what_counts: a.what_counts || '', stop_if: a.stop_if || '', why_it_helps: a.why_it_helps || '',
    },
    showSections: !!(a.what_it_is || a.how_to_use || a.what_counts || a.stop_if || a.why_it_helps),
    linkOpen: false, linkQuery: '', makeOpen: false, newCardName: '', newCardChannel: '',
  }
}

export default function ActionsTab({ userId }) {
  const [actions, setActions] = useState(null)
  const [tools, setTools]     = useState([])
  const [q, setQ]             = useState('')
  const [draft, setDraft]     = useState(null)
  const [busy, setBusy]       = useState(false)

  const refresh = () => loadActions().then(setActions).catch(e => { console.error('[Regulation] load actions', e); setActions([]) })
  useEffect(() => { refresh(); loadShelf().then(setTools).catch(() => {}) }, [])

  const patch = (fields) => setDraft(d => ({ ...d, ...fields }))

  function openNew()  { setDraft(blankDraft()) }
  function openEdit(a){ setDraft(draftFromAction(a)) }
  function close()    { setDraft(null) }

  // Type toggle: on a NEW action, snap points to the type's default (editable after).
  function setType(t) {
    setDraft(d => ({ ...d, action_type: t, points: d.id == null ? (t === 'all_day' ? 2 : 1) : d.points }))
  }

  function pickCard(tool) {
    patch({ tool_id: tool.id, backingName: tool.name, backingChannel: tool.channel_primary, linkOpen: false, makeOpen: false, linkQuery: '' })
  }

  async function makeCard() {
    const name = draft.newCardName.trim()
    if (!name || !draft.newCardChannel || busy) return
    setBusy(true)
    try {
      const tool = await createTool({ name, channel: draft.newCardChannel, userId })
      setTools(ts => [...ts, tool].sort((a, b) => a.name.localeCompare(b.name)))
      pickCard(tool)
    } catch (e) { console.error('[Regulation] make card', e) }
    finally { setBusy(false) }
  }

  async function save() {
    if (busy || !draft.name.trim() || !draft.tool_id) return
    setBusy(true)
    try {
      const sections = {
        what_it_is: draft.sections.what_it_is || null,
        how_to_use: draft.sections.how_to_use || null,
        what_counts: draft.sections.what_counts || null,
        stop_if: draft.sections.stop_if || null,
        why_it_helps: draft.sections.why_it_helps || null,
      }
      if (draft.id == null) {
        await createAction({ userId, name: draft.name.trim(), action_type: draft.action_type, points: draft.points, tool_id: draft.tool_id, sections })
      } else {
        await updateAction(draft.id, { name: draft.name.trim(), action_type: draft.action_type, points: draft.points, tool_id: draft.tool_id, ...sections })
      }
      await refresh()
      close()
    } catch (e) { console.error('[Regulation] save action', e) }
    finally { setBusy(false) }
  }

  async function remove() {
    if (busy || draft.id == null) return
    if (!window.confirm('delete this action? past days you logged it keep their points.')) return
    setBusy(true)
    try { await deleteAction(draft.id); await refresh(); close() }
    catch (e) { console.error('[Regulation] delete action', e) }
    finally { setBusy(false) }
  }

  const linkMatches = useMemo(() => {
    const s = draft?.linkQuery.trim().toLowerCase() || ''
    return tools.filter(t => !s || t.name.toLowerCase().includes(s)).slice(0, 40)
  }, [tools, draft?.linkQuery])

  return (
    <div>
      <p className="rr-intro">
        Single regulating acts — not a whole routine, just one thing. Each links to a card on the shelf
        (where the science lives), carries a fixed 1 or 2 points set here (never on the day), and shows up
        in the tracker's activity picker the moment you save it.
      </p>

      <div className="rr-search">
        <span className="si">⌕</span>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="search your actions…" autoComplete="off" spellCheck={false} />
        {q && <span className="sx" onClick={() => setQ('')}>×</span>}
      </div>

      {actions === null ? <div className="reg-loading">…</div> : (
        <>
          {GROUPS.map(([title, key, sub]) => {
            const items = actions.filter(a => a.action_type === key && (
              !q || a.name.toLowerCase().includes(q.toLowerCase()) || (a.what_it_is || '').toLowerCase().includes(q.toLowerCase())
            ))
            if (!items.length) return null
            return (
              <div key={key}>
                <div className="rr-agroup">{title}<span className="as">{sub}</span></div>
                {items.map(a => (
                  <div key={a.id} className="rr-acard" onClick={() => openEdit(a)}>
                    <div className="rt">{a.name}</div>
                    <div className="rs">{a.what_it_is || '— no notes yet —'}</div>
                    <div className="rfoot">
                      <span className={`rr-atype ${a.action_type === 'all_day' ? 'allday' : 'oneoff'}`}>
                        {a.action_type === 'all_day' ? 'all-day' : 'one-off'}
                      </span>
                      <span className={`rr-alink${a.backing ? '' : ' none'}`}>
                        <span className="lk">↳ shelf</span>{a.backing?.name || 'no card'}
                      </span>
                      <span className="pts">{a.points}<span className="u">pt{a.points > 1 ? 's' : ''}</span></span>
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
          {actions.length === 0 && <div className="rr-nomatch">no actions yet — add your first below.</div>}
          <button className="rr-addnew" onClick={openNew}>+ add an action</button>
        </>
      )}

      {draft && (
        <>
          <div className="rr-scrim" onClick={close} />
          <div className="rr-dock up"><div className="dwrap">
            <button className="dx" onClick={close}>×</button>
            <input className="rr-nameinput" value={draft.name} autoFocus
              placeholder="name this action…"
              onChange={e => patch({ name: e.target.value, newCardName: draft.newCardName || e.target.value })} />

            <div className="meta">
              <span className="rr-ptsedit">type
                <button className={`rr-pb ${draft.action_type === 'all_day' ? 'on' : ''}`} onClick={() => setType('all_day')}>all-day</button>
                <button className={`rr-pb ${draft.action_type === 'one_off' ? 'on' : ''}`} onClick={() => setType('one_off')}>one-off</button>
              </span>
              <span className="rr-ptsedit">points
                <button className={`rr-pb num ${draft.points === 1 ? 'on' : ''}`} onClick={() => patch({ points: 1 })}>1</button>
                <button className={`rr-pb num ${draft.points === 2 ? 'on' : ''}`} onClick={() => patch({ points: 2 })}>2</button>
              </span>
            </div>

            {/* backing card (required) */}
            <div className="rr-field">
              <div className="rr-flabel">backing card · where the science lives</div>
              <div className="rr-linkbox">
                {draft.tool_id ? (
                  <div className="rr-linkcur">
                    <span>↳ {draft.backingName}</span>
                    {draft.backingChannel && <span className="ch">· {draft.backingChannel}</span>}
                    <button className="rr-mini" style={{ marginLeft: 'auto' }}
                      onClick={() => patch({ tool_id: null, backingName: null, backingChannel: null, linkOpen: true })}>change</button>
                  </div>
                ) : draft.makeOpen ? (
                  <>
                    <input className="rr-ta" style={{ minHeight: 0 }} value={draft.newCardName}
                      placeholder="card name…" onChange={e => patch({ newCardName: e.target.value })} />
                    <select className="rr-select" value={draft.newCardChannel} onChange={e => patch({ newCardChannel: e.target.value })}>
                      <option value="">choose a channel…</option>
                      {CHANNEL_AISLES.map(([aisle, chans]) => (
                        <optgroup key={aisle} label={aisle}>
                          {chans.map(ch => <option key={ch} value={ch}>{ch}</option>)}
                        </optgroup>
                      ))}
                    </select>
                    <div style={{ display: 'flex', gap: 10, marginTop: 9, alignItems: 'center' }}>
                      <button className="rr-savebtn" style={{ marginTop: 0 }}
                        disabled={!draft.newCardName.trim() || !draft.newCardChannel || busy} onClick={makeCard}>create &amp; link</button>
                      <button className="rr-mini" onClick={() => patch({ makeOpen: false })}>cancel</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rr-search" style={{ margin: 0 }}>
                      <span className="si">⌕</span>
                      <input value={draft.linkQuery} placeholder="search the shelf to link a card…"
                        onChange={e => patch({ linkQuery: e.target.value, linkOpen: true })} />
                    </div>
                    {draft.linkOpen && (
                      <div className="rr-matchlist">
                        {linkMatches.map(t => (
                          <button key={t.id} className="rr-match" onClick={() => pickCard(t)}>
                            {t.name}{t.channel_primary && <span className="ch">{t.channel_primary}</span>}
                          </button>
                        ))}
                        {linkMatches.length === 0 && <div className="rr-nomatch" style={{ padding: 12 }}>no card by that name</div>}
                      </div>
                    )}
                    <button className="rr-mini" style={{ marginTop: 10 }}
                      onClick={() => patch({ makeOpen: true, newCardName: draft.newCardName || draft.name })}>
                      + nothing fits — make a new card
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* optional sections */}
            {draft.showSections ? (
              SECTIONS.map(([label, key]) => (
                <div className="rr-dsec" key={key}>
                  <div className="dl">{label}</div>
                  <textarea className="rr-ta" value={draft.sections[key] || ''} placeholder={`${label}… (optional)`}
                    onChange={e => patch({ sections: { ...draft.sections, [key]: e.target.value } })} />
                </div>
              ))
            ) : (
              <button className="rr-mini" style={{ marginTop: 14 }} onClick={() => patch({ showSections: true })}>
                + add notes (optional)
              </button>
            )}

            <button className="rr-savebtn" disabled={!draft.name.trim() || !draft.tool_id || busy} onClick={save}>
              {draft.id == null ? 'add action' : 'save'}
            </button>
            {draft.id != null && <button className="rr-delbtn" onClick={remove}>delete this action</button>}
          </div></div>
        </>
      )}
    </div>
  )
}
