import { useState, useEffect } from 'react'
import { supabase } from '../../shared/lib/supabase.js'
import { loadAllVocab } from './lib/lostFoundDb.js'
import RoomMark from '../../shared/components/RoomMark.jsx'
import { todayDisplayStr } from '../../shared/lib/dates.js'
import LayItDownTab from './LayItDownTab.jsx'
import CollectionTab from './CollectionTab.jsx'

const TABS = [
  { key: 'lay', label: 'lay it down' },
  { key: 'collection', label: 'collection' },
  { key: 'patterns', label: 'patterns' },
]

export default function LostFoundRoom({ onSettings }) {
  const [activeTab, setActiveTab] = useState('lay')
  const [vocab, setVocab] = useState(null)
  const [vocabError, setVocabError] = useState(null)
  const [userId, setUserId] = useState(null)
  const [collectionTrigger, setCollectionTrigger] = useState(0)
  const [editingEntry, setEditingEntry] = useState(null)

  // Load auth + vocab in parallel on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data?.user?.id ?? null)
    })
    loadAllVocab()
      .then(setVocab)
      .catch(err => {
        console.error('vocab load error', err)
        setVocabError('Could not load the word library. Try refreshing.')
      })
  }, [])

  function handleSaved(entryId) {
    setEditingEntry(null)
    setCollectionTrigger(n => n + 1)
    setActiveTab('collection')
  }

  function handleEdit(entry) {
    setEditingEntry(entry)
    setActiveTab('lay')
  }

  // Merge a newly-created personal word into the loaded vocab so it resolves
  // (in the cloud, bouquet, and collection) without a full reload.
  function addVocabWord(kind, row) {
    setVocab(prev => {
      if (!prev) return prev
      if (kind === 'emotion') {
        const bySlug = { ...prev.emotions.bySlug, [row.slug]: row }
        const families = { ...prev.emotions.families }
        families[row.family] = [...(families[row.family] || []), row]
        return { ...prev, emotions: { ...prev.emotions, bySlug, families } }
      }
      if (kind === 'meaning') {
        const bySlug = { ...prev.meanings.bySlug, [row.slug]: row }
        const byParent = { ...prev.meanings.byParent }
        if (row.parent_slug) {
          byParent[row.parent_slug] = [...(byParent[row.parent_slug] || []), row]
        }
        return { ...prev, meanings: { ...prev.meanings, bySlug, byParent } }
      }
      return prev
    })
  }

  return (
    <div>
      {/* Standard room header — sticky, bleeds to view-fade edges */}
      <div className="room-header-wrap">
        <div className="room-head">
          <h2 className="room-title">lost + found</h2>
          <RoomMark date={todayDisplayStr()} onSettings={onSettings} />
        </div>
        <div className="room-tabs">
          {TABS.map(tab => (
            <button
              key={tab.key}
              className={`room-tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => {
                if (tab.key === 'patterns') return
                if (tab.key === 'lay') setEditingEntry(null) // clicking the tab starts a fresh entry
                setActiveTab(tab.key)
              }}
              style={tab.key === 'patterns' ? { cursor: 'default', opacity: 0.65 } : undefined}
            >
              {tab.label}
              {tab.key === 'patterns' && (
                <span style={{ fontSize: 11, marginLeft: 5 }}>(later)</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content — constrained width so the cloud stays proportionate */}
      <div style={{ maxWidth: 860 }}>

        {/* Vocab error */}
        {vocabError && (
          <div style={{
            marginBottom: 16, padding: '10px 14px', borderRadius: 10,
            background: 'rgba(200,80,60,.08)', border: '0.5px solid rgba(200,80,60,.3)',
            fontSize: 13, color: 'var(--color-text-primary)',
          }}>
            {vocabError}
          </div>
        )}

        {/* Loading vocab */}
        {!vocab && !vocabError && (
          <div style={{ fontSize: 14, color: 'var(--color-text-tertiary)', fontStyle: 'italic', padding: '20px 0' }}>
            loading…
          </div>
        )}

        {/* Tab content */}
        {vocab && (
          <>
            {activeTab === 'lay' && (
              <LayItDownTab
                key={editingEntry ? `edit-${editingEntry.id}` : 'new'}
                vocab={vocab}
                userId={userId}
                onSaved={handleSaved}
                addVocabWord={addVocabWord}
                initialEntry={editingEntry}
                onCancelEdit={() => { setEditingEntry(null); setActiveTab('collection') }}
              />
            )}
            {activeTab === 'collection' && (
              <CollectionTab
                userId={userId}
                vocab={vocab}
                refreshTrigger={collectionTrigger}
                onEdit={handleEdit}
              />
            )}
            {activeTab === 'patterns' && (
              <div style={{
                padding: '40px 0', textAlign: 'center',
                fontSize: 14, color: 'var(--color-text-tertiary)', fontStyle: 'italic',
              }}>
                patterns are coming — collect a few entries first
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
