import { useState, useEffect, useCallback } from 'react'
import RoomMark from '../../shared/components/RoomMark.jsx'
import { todayDisplayStr } from '../../shared/lib/dates.js'
import { supabase } from '../../shared/lib/supabase.js'
import { loadRoutines, createRoutine } from './lib/regulationDb.js'
import RoutineCard from './RoutineCard.jsx'
import RoutineEditor from './RoutineEditor.jsx'
import ShelfTab from './ShelfTab.jsx'
import ActionsTab from './ActionsTab.jsx'
import { REG_STYLES } from './regStyles.js'

// Gallery tile: name + subtitle. Routines are flat anchors now (the three faces
// are retired, id=145), so the tile no longer shows band dots or a "spans" line.
function RoutineTile({ routine, onOpen }) {
  const built = (routine.bands || []).length > 0
  return (
    <button className="reg-tile" onClick={() => onOpen(routine.id)}>
      <div className="reg-tile-name">{routine.name}</div>
      {routine.subtitle && <div className="reg-tile-sub">{routine.subtitle}</div>}
      {!built && <div className="reg-tile-span">not built yet</div>}
    </button>
  )
}

// The Routines tab — the existing gallery → read card → editor flow, unchanged.
function RoutinesTab({ userId }) {
  const [view, setView] = useState('gallery')      // 'gallery' | 'card' | 'editor'
  const [routines, setRoutines] = useState(null)
  const [currentId, setCurrentId] = useState(null)
  const [editBand, setEditBand] = useState('green')
  const [busy, setBusy] = useState(false)

  const refreshGallery = useCallback(() => {
    loadRoutines().then(setRoutines).catch(err => {
      console.error('[Regulation] failed to load routines', err)
      setRoutines([])
    })
  }, [])
  useEffect(() => { refreshGallery() }, [refreshGallery])

  const openRoutine = (id) => { setCurrentId(id); setView('card') }
  const backToGallery = () => { setView('gallery'); refreshGallery() }
  const openEditor = (band) => { setEditBand(band || 'green'); setView('editor') }

  const newRoutine = async () => {
    if (busy) return
    setBusy(true)
    try {
      const id = await createRoutine(userId)
      setCurrentId(id)
      setEditBand('green')
      setView('editor')
    } catch (err) {
      console.error('[Regulation] failed to create routine', err)
    } finally {
      setBusy(false)
    }
  }

  if (view === 'card' && currentId != null) {
    return <RoutineCard routineId={currentId} onBack={backToGallery} onEdit={openEditor} flat />
  }
  if (view === 'editor' && currentId != null) {
    return <RoutineEditor routineId={currentId} initialBand={editBand} onDone={() => setView('card')} onDeleted={backToGallery} flat />
  }
  return (
    <>
      <p className="reg-lede">your regulation routines — browse, read, and tend them here.<br />
        a one-face skeleton is fully usable; finishing one just adds reach and warmth.</p>
      {routines === null ? (
        <div className="reg-loading">…</div>
      ) : (
        <div className="reg-gallery">
          {routines.map(r => <RoutineTile key={r.id} routine={r} onOpen={openRoutine} />)}
          <button className="reg-tile reg-tile-new" onClick={newRoutine} disabled={busy}>
            <span className="reg-plus">+</span>
            <span className="reg-tile-name">new routine</span>
            <span className="reg-tile-span">add one as you think of it</span>
          </button>
        </div>
      )}
    </>
  )
}

const TABS = [
  ['shelf', 'The Shelf'],
  ['routines', 'Routines'],
  ['actions', 'Actions'],
]

export default function RegulationRoom({ onSettings, session, initActionId = null, onConsumedInitAction }) {
  // Arriving from the Tracker's "edit in the Regulation room" link lands on the
  // Actions tab with that action's card already open.
  const [tab, setTab] = useState(initActionId != null ? 'actions' : 'shelf')
  // Prefer the app's in-memory session (same source every other room uses);
  // fall back to an auth lookup if a session wasn't handed down.
  const [authUserId, setAuthUserId] = useState(null)
  const userId = session?.user?.id ?? authUserId
  const [focusAction, setFocusAction] = useState(initActionId != null ? initActionId : null)
  const [focusTool, setFocusTool]     = useState(null)   // action card → its backing shelf card

  useEffect(() => {
    if (session?.user?.id) return
    supabase.auth.getUser().then(({ data }) => setAuthUserId(data?.user?.id ?? null))
  }, [session?.user?.id])

  // Consume the one-shot deep-link so re-entering the room later doesn't re-focus.
  useEffect(() => { if (initActionId != null) onConsumedInitAction?.() }, [])

  // Deep-link from a shelf card to the specific action that uses it.
  const jumpToAction = (actionId) => { setFocusAction(actionId); setTab('actions') }
  // Deep-link from an action card to its backing shelf card.
  const openShelfCard = (toolId) => { setFocusTool(toolId); setTab('shelf') }

  return (
    <div className="reg-room">
      <style>{REG_STYLES}</style>

      <div className="room-header-wrap">
        <div className="room-head">
          <h2 className="room-title">regulation</h2>
          <RoomMark date={todayDisplayStr()} onSettings={onSettings} />
        </div>
      </div>

      <div className="reg-body">
        <div className="rr-tabs">
          {TABS.map(([key, label]) => (
            <button key={key} className={`rr-tab ${tab === key ? 'on' : ''}`} onClick={() => setTab(key)}>{label}</button>
          ))}
        </div>

        {tab === 'shelf'    && <ShelfTab userId={userId} onJumpToActions={jumpToAction}
                                 focusToolId={focusTool} onConsumedFocus={() => setFocusTool(null)} />}
        {tab === 'routines' && <RoutinesTab userId={userId} />}
        {tab === 'actions'  && <ActionsTab userId={userId}
                                 focusActionId={focusAction} onConsumedFocus={() => setFocusAction(null)}
                                 onOpenShelf={openShelfCard} />}
      </div>
    </div>
  )
}
