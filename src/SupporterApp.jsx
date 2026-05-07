import { useState } from 'react'
import SupporterDashboard from './rooms/supporter/SupporterDashboard.jsx'
import SupporterTree from './rooms/supporter/SupporterTree.jsx'
import SupporterLibrary from './rooms/supporter/SupporterLibrary.jsx'
import FirstAidRoom from './rooms/first-aid/FirstAidRoom.jsx'

export default function SupporterApp({ profile }) {
  const [view, setView] = useState('dashboard')
  const [libraryOrigin, setLibraryOrigin] = useState('dashboard')
  const [directMechanism, setDirectMechanism] = useState(null)

  function goLibrary(origin = 'dashboard') {
    setLibraryOrigin(origin)
    setView('library')
  }

  function goSupporterFirstAid(mechanism = null) {
    setDirectMechanism(mechanism)
    setView('supporterFirstAid')
  }

  if (view === 'tree') {
    return (
      <SupporterTree
        profile={profile}
        onBack={() => setView('dashboard')}
        onLibrary={() => goLibrary('tree')}
        onSupporterFirstAid={goSupporterFirstAid}
      />
    )
  }
  if (view === 'library') {
    return (
      <SupporterLibrary
        profile={profile}
        onBack={() => setView(libraryOrigin)}
      />
    )
  }
  if (view === 'supporterFirstAid') {
    return (
      <FirstAidRoom
        supporterMode
        catUserId={profile.linked_user_id}
        directMechanism={directMechanism}
        onBack={() => setView('tree')}
      />
    )
  }
  return (
    <SupporterDashboard
      profile={profile}
      onTree={() => setView('tree')}
      onLibrary={() => goLibrary('dashboard')}
    />
  )
}
