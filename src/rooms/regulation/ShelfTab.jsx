import { useState, useEffect, useMemo } from 'react'
import {
  loadShelf, loadActions, createTool,
  CHANNEL_AISLES, CHANNEL_NOTES,
} from './lib/regulationDb.js'

const MK = {
  do:    ['+', 'do · arrange / a thing you do'],
  dont:  ['–', "don't · decline / a thing you don't"],
  tool:  ['◆', 'tool · a thing you use'],
  coreg: ['♥', 'co-regulation · someone with you'],
}
const markerOf = (c) => (c.marker && MK[c.marker]) ? c.marker : 'tool'

const DETAIL_FIELDS = [
  ['what it is', 'description'],
  ['how to use it', 'how_to_use'],
  ['the science', 'the_science'],
  ['notes & variations', 'notes_variations'],
  ['time', 'time_component'],
  ['effort to use', 'access_cost'],
]

export default function ShelfTab({ userId, onJumpToActions }) {
  const [tools, setTools]     = useState(null)
  const [actions, setActions] = useState([])
  const [filter, setFilter]   = useState(null)
  const [query, setQuery]     = useState('')
  const [openAisles, setOpenAisles] = useState({ 0: true })
  const [sel, setSel]         = useState(null)   // selected card for the detail dock
  const [addTo, setAddTo]     = useState(null)   // channel name we're adding a card to
  const [addName, setAddName] = useState('')
  const [addMarker, setAddMarker] = useState('tool')
  const [busy, setBusy]       = useState(false)

  const refresh = () => loadShelf().then(setTools).catch(e => { console.error('[Regulation] load shelf', e); setTools([]) })
  useEffect(() => { refresh(); loadActions().then(setActions).catch(() => {}) }, [])

  // tool_id → [action names]
  const actionsByTool = useMemo(() => {
    const m = {}
    for (const a of actions) { if (a.tool_id != null) (m[a.tool_id] ||= []).push(a.name) }
    return m
  }, [actions])
  const hasAction = (id) => !!actionsByTool[id]

  // channel → cards (from the live pool), plus any channels not in the static map
  const byChannel = useMemo(() => {
    const m = {}
    for (const t of (tools || [])) (m[t.channel_primary || '(unfiled)'] ||= []).push(t)
    return m
  }, [tools])

  const active = !!(filter || query)
  const matches = (c) => {
    if (query && !c.name.toLowerCase().includes(query.toLowerCase())) return false
    if (!filter) return true
    if (filter === 'fa') return (c.tags || []).includes('first aid')
    if (filter === 'draft') return !c.has_card
    if (filter === 'action') return hasAction(c.id)
    return markerOf(c) === filter
  }

  const totals = useMemo(() => {
    let cards = 0, drafts = 0, stocked = 0, empty = 0
    const mapped = CHANNEL_AISLES.flatMap(([, chs]) => chs)
    for (const ch of mapped) {
      const list = byChannel[ch] || []
      cards += list.length
      if (list.length) stocked++; else empty++
      drafts += list.filter(c => !c.has_card).length
    }
    return { cards, drafts, stocked, empty, chans: mapped.length }
  }, [byChannel])

  const LEG = [
    ['do',   <><span className="rr-mk do">+</span> do</>],
    ['dont', <><span className="rr-mk dont">–</span> don't</>],
    ['tool', <><span className="rr-mk tool">◆</span> tool</>],
    ['coreg',<><span className="rr-mk coreg">♥</span> co-reg</>],
    ['fa',   <><span className="rr-dot" /> in First Aid</>],
    ['action',<><span className="rr-actdot" /> has an Action</>],
    ['draft',<><span className="rr-legdash" /> not written yet</>],
  ]

  async function doAdd(ch) {
    if (!addName.trim() || busy) return
    setBusy(true)
    try {
      await createTool({ name: addName.trim(), channel: ch, marker: addMarker, userId })
      setAddName(''); setAddTo(null); setAddMarker('tool')
      await refresh()
    } catch (e) { console.error('[Regulation] add card', e) }
    finally { setBusy(false) }
  }

  return (
    <div>
      <div className="rr-legend">
        {LEG.map(([k, inner]) => (
          <span key={k} className={`rr-li ${filter === k ? 'act' : ''}`}
            onClick={() => { setFilter(filter === k ? null : k); setSel(null) }}>{inner}</span>
        ))}
        <span className="rr-hintrow">tap a key to filter the whole shelf to just those</span>
      </div>

      <div className="rr-search">
        <span className="si">⌕</span>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="search the shelf…" autoComplete="off" spellCheck={false} />
        {query && <span className="sx" onClick={() => setQuery('')}>×</span>}
      </div>

      {tools === null ? <div className="reg-loading">…</div> : (
        <>
          <div className="rr-count">
            <b>{totals.cards}</b> cards across <b>{totals.chans}</b> channels · {totals.stocked} stocked, {totals.empty} empty · {totals.drafts} awaiting write-up
          </div>

          {CHANNEL_AISLES.map(([aisle, chans], ai) => {
            // which channels in this aisle to show
            const shownChans = chans.filter(ch => {
              if (!active) return true
              return (byChannel[ch] || []).some(matches)
            })
            if (active && shownChans.length === 0) return null
            const isOpen = active || openAisles[ai]
            const aTotal = chans.reduce((n, ch) => n + (byChannel[ch] || []).filter(matches).length, 0)
            return (
              <div key={aisle} className={`rr-aisle ${isOpen ? 'open' : ''}`}>
                <div className="rr-ahdr" onClick={() => !active && setOpenAisles(o => ({ ...o, [ai]: !o[ai] }))}>
                  <span className="rr-chev">▶</span>
                  <span className="rr-anm">{aisle}</span>
                  <span className="rr-acount">{chans.length} channels · {aTotal} card{aTotal === 1 ? '' : 's'}</span>
                </div>
                <div className="rr-abody">
                  {shownChans.map(ch => {
                    const all = byChannel[ch] || []
                    const list = all.filter(matches)
                    const isEmpty = all.length === 0
                    if (active && list.length === 0) return null
                    const note = CHANNEL_NOTES[ch] && !active
                      ? <div className="rr-cnote">{CHANNEL_NOTES[ch]}</div> : null
                    if (isEmpty && !active) {
                      return (
                        <div key={ch} className="rr-chan empty">
                          <div className="rr-chdr"><span className="rr-cnm">{ch}</span><span className="rr-rule" /></div>
                          <div className="rr-emptyshelf">
                            <span>shelf empty — nothing rostered here yet</span>
                            <span className="ros" onClick={() => { setAddTo(ch); setAddName('') }}>+ add a card</span>
                          </div>
                          {addTo === ch && <AddBox {...{ addName, setAddName, addMarker, setAddMarker, busy, onAdd: () => doAdd(ch), onCancel: () => setAddTo(null) }} />}
                        </div>
                      )
                    }
                    return (
                      <div key={ch} className="rr-chan">
                        <div className="rr-chdr"><span className="rr-cnm">{ch}</span><span className="rr-cnt">{list.length}</span><span className="rr-rule" /></div>
                        {note}
                        <div className="rr-cardrow">
                          {list.map(c => {
                            const mk = markerOf(c)
                            return (
                              <span key={c.id} className={`rr-card ${mk} ${c.has_card ? '' : 'draft'} ${sel?.id === c.id ? 'sel' : ''}`} onClick={() => setSel(c)}>
                                <span className={`rr-mk ${mk}`}>{MK[mk][0]}</span>{c.name}
                                {(c.tags || []).includes('first aid') && <span className="rr-fa" />}
                                {hasAction(c.id) && <span className="rr-actdot" />}
                              </span>
                            )
                          })}
                          {!active && <span className="rr-card add" onClick={() => { setAddTo(ch); setAddName('') }}>+ add</span>}
                        </div>
                        {addTo === ch && <AddBox {...{ addName, setAddName, addMarker, setAddMarker, busy, onAdd: () => doAdd(ch), onCancel: () => setAddTo(null) }} />}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </>
      )}

      {/* read-only card detail */}
      {sel && (
        <>
          <div className="rr-scrim" onClick={() => setSel(null)} />
          <div className="rr-dock up"><div className="dwrap">
            <button className="dx" onClick={() => setSel(null)}>×</button>
            <div className="dn">{sel.name}</div>
            <div className="meta">
              <span className="tag">{MK[markerOf(sel)][0]} {MK[markerOf(sel)][1]}</span>
              {sel.channel_primary && <span className="tag">{sel.channel_primary}</span>}
              {(sel.channels_secondary || []).map(c => <span key={c} className="tag">{c}</span>)}
              {(sel.tags || []).includes('first aid') && <span className="tag gold">● in First Aid</span>}
            </div>
            {DETAIL_FIELDS.some(([, k]) => sel[k]) ? (
              DETAIL_FIELDS.map(([label, key]) => sel[key] ? (
                <div className="rr-dsec" key={key}><div className="dl">{label}</div><div className="dt">{sel[key]}</div></div>
              ) : null)
            ) : (
              <div className="rr-dsec"><div className="dt empty">
                Name and channel are set — usable today. The how-to and the science get written whenever you have the spoons.
              </div></div>
            )}
            {hasAction(sel.id) && (
              <div className="rr-dsci">↳ used as the action <b>{actionsByTool[sel.id][0]}</b>
                {onJumpToActions && <button className="rr-mini" style={{ marginLeft: 8 }} onClick={() => { setSel(null); onJumpToActions() }}>go to it →</button>}
              </div>
            )}
          </div></div>
        </>
      )}
    </div>
  )
}

function AddBox({ addName, setAddName, addMarker, setAddMarker, busy, onAdd, onCancel }) {
  return (
    <div className="rr-linkbox" style={{ marginTop: 9 }}>
      <input className="rr-ta" style={{ minHeight: 0 }} value={addName} autoFocus placeholder="card name…"
        onChange={e => setAddName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') onAdd() }} />
      <div className="meta" style={{ marginTop: 9 }}>
        <span className="rr-ptsedit">kind
          {['do', 'dont', 'tool', 'coreg'].map(m => (
            <button key={m} className={`rr-pb ${addMarker === m ? 'on' : ''}`} onClick={() => setAddMarker(m)} title={MK[m][1]}>{MK[m][0]}</button>
          ))}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 10, alignItems: 'center' }}>
        <button className="rr-savebtn" style={{ marginTop: 0 }} disabled={!addName.trim() || busy} onClick={onAdd}>add card</button>
        <button className="rr-mini" onClick={onCancel}>cancel</button>
      </div>
    </div>
  )
}
