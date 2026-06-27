import { useState, useMemo, useEffect } from 'react'
import {
  loadShelf, createTool, createAction, updateAction, deleteAction, CHANNEL_AISLES,
} from './lib/regulationDb.js'
import ActionBrowser from './ActionBrowser.jsx'

/**
 * ActionsTab — the Regulation room's "Actions" tab: the library where actions are
 * browsed, read, and edited (engine room id=145 "LOCKED pt 6"). This is NOT where
 * the day is logged — the daily picking + points + cap live on the Capacity
 * Tracker (its picker drawer reuses the same <ActionBrowser> list). So there are
 * no "use" buttons or point totals here; just a calm browse-and-tend surface.
 *
 * Authoring (create / edit / delete an action, link or make its backing shelf
 * card) lives behind each card's "edit" link and the "+ new action" button.
 */

const SECTIONS = [
  ['what it is', 'what_it_is'],
  ['how to use it', 'how_to_use'],
  ['what counts', 'what_counts'],
  ['stop if', 'stop_if'],
  ['why it helps', 'why_it_helps'],
]

function blankDraft() {
  return {
    id: null, name: '', action_type: 'one_off', points: 1,
    tool_id: null, backingName: null, backingChannel: null,
    sections: {}, linkOpen: false, linkQuery: '', makeOpen: false, newCardName: '', newCardChannel: '',
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
    linkOpen: false, linkQuery: '', makeOpen: false, newCardName: '', newCardChannel: '',
  }
}

export default function ActionsTab({ userId, focusActionId = null, onConsumedFocus, onOpenShelf }) {
  const [tools, setTools]   = useState([])
  const [draft, setDraft]   = useState(null)
  const [busy, setBusy]     = useState(false)
  const [reloadSignal, setReloadSignal] = useState(0)   // bump to refresh the browser list

  useEffect(() => { loadShelf().then(setTools).catch(() => {}) }, [])

  const patch = (fields) => setDraft(d => ({ ...d, ...fields }))
  function openNew()  { setDraft(blankDraft()) }
  function openEdit(a){ setDraft(draftFromAction(a)) }
  function close()    { setDraft(null) }
  const bumpList = () => setReloadSignal(n => n + 1)

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
      bumpList()
      close()
    } catch (e) { console.error('[Regulation] save action', e) }
    finally { setBusy(false) }
  }
  async function remove() {
    if (busy || draft.id == null) return
    if (!window.confirm('delete this action? past days you logged it keep their points.')) return
    setBusy(true)
    try { await deleteAction(draft.id); bumpList(); close() }
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
        Your library of single regulating acts — browse, read, and tend them here. Open a card to read it,
        see how it regulates, and jump to the science. You pick what you’ll actually use on the day over in
        the Capacity Tracker.
      </p>

      <ActionBrowser
        mode="manage"
        reloadSignal={reloadSignal}
        focusActionId={focusActionId}
        onConsumedFocus={onConsumedFocus}
        onEdit={openEdit}
        onOpenShelf={onOpenShelf}
      />

      <button className="rr-addnew" onClick={openNew}>+ new action</button>

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

            {/* five-section template — shown by default */}
            {SECTIONS.map(([label, key]) => (
              <div className="rr-dsec" key={key}>
                <div className="dl">{label}</div>
                <textarea className="rr-ta" value={draft.sections[key] || ''} placeholder={`${label}… (optional)`}
                  onChange={e => patch({ sections: { ...draft.sections, [key]: e.target.value } })} />
              </div>
            ))}

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
