import { useState, useEffect, useCallback } from 'react'
import RoomMark from '../../shared/components/RoomMark.jsx'
import { todayDisplayStr } from '../../shared/lib/dates.js'
import { supabase } from '../../shared/lib/supabase.js'
import { loadRoutines, createRoutine, BAND_COLOR, BAND_LABEL } from './lib/regulationDb.js'
import RoutineCard from './RoutineCard.jsx'
import RoutineEditor from './RoutineEditor.jsx'
import { REG_STYLES } from './regStyles.js'

// Gallery tile: name, subtitle, and the bands this routine spans.
function RoutineTile({ routine, onOpen }) {
  const bands = routine.bands || []
  const spanText = bands.length === 3
    ? 'spans all three'
    : bands.length === 0
      ? 'not built yet'
      : bands.map(b => BAND_LABEL[b]).join(' · ')

  return (
    <button className="reg-tile" onClick={() => onOpen(routine.id)}>
      <div className="reg-tile-dots">
        {['green', 'caution', 'purple'].map(b => (
          <span
            key={b}
            className={`reg-tile-dot ${bands.includes(b) ? 'on' : ''}`}
            style={bands.includes(b) ? { background: BAND_COLOR[b] } : undefined}
          />
        ))}
      </div>
      <div className="reg-tile-name">{routine.name}</div>
      {routine.subtitle && <div className="reg-tile-sub">{routine.subtitle}</div>}
      <div className="reg-tile-span">{spanText}</div>
    </button>
  )
}

export default function RegulationRoom({ onSettings }) {
  const [view, setView] = useState('gallery')      // 'gallery' | 'card' | 'editor'
  const [routines, setRoutines] = useState(null)
  const [currentId, setCurrentId] = useState(null)
  const [editBand, setEditBand] = useState('green')
  const [userId, setUserId] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data?.user?.id ?? null))
  }, [])

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

  return (
    <div className="reg-room">
      <style>{REG_STYLES}</style>

      <div className="room-header-wrap">
        <div className="room-head">
          <h2 className="room-title">regulation plan</h2>
          <RoomMark date={todayDisplayStr()} onSettings={onSettings} />
        </div>
      </div>

      <div className="reg-body">
        {view === 'gallery' && (
          <>
            <p className="reg-lede">your regulation routines — browse, read, and tend them here.<br />
              a one-face skeleton is fully usable; finishing one just adds reach and warmth.</p>

            {routines === null ? (
              <div className="reg-loading">…</div>
            ) : (
              <div className="reg-gallery">
                {routines.map(r => (
                  <RoutineTile key={r.id} routine={r} onOpen={openRoutine} />
                ))}
                <button className="reg-tile reg-tile-new" onClick={newRoutine} disabled={busy}>
                  <span className="reg-plus">+</span>
                  <span className="reg-tile-name">new routine</span>
                  <span className="reg-tile-span">add one as you think of it</span>
                </button>
              </div>
            )}
          </>
        )}

        {view === 'card' && currentId != null && (
          <RoutineCard
            routineId={currentId}
            onBack={backToGallery}
            onEdit={openEditor}
          />
        )}

        {view === 'editor' && currentId != null && (
          <RoutineEditor
            routineId={currentId}
            initialBand={editBand}
            onDone={() => setView('card')}
            onDeleted={backToGallery}
          />
        )}
      </div>
    </div>
  )
}
