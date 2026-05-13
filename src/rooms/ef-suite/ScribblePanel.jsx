import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../shared/lib/supabase.js'
import Anthropic from '@anthropic-ai/sdk'

console.log('[Scribble] API key defined:', !!import.meta.env.VITE_ANTHROPIC_API_KEY)

const client = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
})

const FALLBACK_SYSTEM_PROMPT = "You are Scribble, Cat's warm and bookish AI library companion. You live in her personal book pile and help her explore, remember, and think about her reading. You're enthusiastic about books but not over the top — more like a well-read friend than a librarian. Keep responses concise and conversational."

const SUMMARY_SYSTEM_PROMPT = `You are summarising a conversation between Cat and her book companion Scribble. Write a concise summary (150 words max) in second person as if writing to Scribble: "In this session, Cat and you discussed..." Include: authors or series discussed, any recommendations made, anything Cat mentioned about her reading mood or preferences, any books identified as missing from her library, and anything personal Cat shared. Write it as memory, not a report.`

// ── Tools ─────────────────────────────────────────────────────────────────────

const TOOLS = [
  {
    type: 'web_search_20250305',
    name: 'web_search',
  },
  {
    name: 'search_library',
    description: "Search Cat's book library. Use this whenever Cat asks about her books, authors, ratings, series, recommendations, or anything related to her reading history. Always use this tool rather than guessing — it returns real data from her actual library.",
    input_schema: {
      type: 'object',
      properties: {
        query_type: {
          type: 'string',
          enum: ['by_author', 'by_series', 'by_rating', 'by_status', 'by_genre', 'by_trope', 'top_authors', 'full_stats', 'recommendations', 'by_low_confidence'],
          description: 'What kind of search to run. Use by_low_confidence to find books where AI-enriched data may be uncertain.',
        },
        search_term: {
          type: 'string',
          description: 'The author name, series name, genre, trope, or other search term. Not needed for top_authors, full_stats, or recommendations.',
        },
        rating_min: {
          type: 'number',
          description: 'Minimum rating filter (1–5). Optional.',
        },
        status: {
          type: 'string',
          enum: ['to_read', 'read', 'reading', 'dnf'],
          description: 'Filter by read status. Optional.',
        },
      },
      required: ['query_type'],
    },
  },
]

// ── Module-level: save summary after unmount (fire-and-forget) ────────────────

async function generateAndSaveSummary(displayMessages, userId, model = 'claude-sonnet-4-6') {
  if (!userId) return
  const conversationText = displayMessages
    .map(m => `${m.role === 'user' ? 'Cat' : 'Scribble'}: ${m.content}`)
    .join('\n\n')
  if (!conversationText.trim()) return

  try {
    const res = await client.messages.create({
      model,
      max_tokens: 300,
      system: SUMMARY_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Please summarise this conversation:\n\n${conversationText}` }],
    })
    const summary = res.content.filter(b => b.type === 'text').map(b => b.text).join('').trim()
    if (!summary) return

    const today = new Date().toISOString().split('T')[0]
    await supabase.from('scribble_memory').insert({
      user_id: userId,
      summary,
      conversation_date: today,
      message_count: displayMessages.length,
    })

    // Keep only the 10 most recent rows
    const { data: allRows } = await supabase
      .from('scribble_memory')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (allRows && allRows.length > 10) {
      const toDelete = allRows.slice(10).map(r => r.id)
      await supabase.from('scribble_memory').delete().in('id', toDelete)
    }
  } catch (err) {
    console.error('[Scribble] summary save failed:', err)
  }
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function ScribbleAvatar({ size = 48 }) {
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: 'linear-gradient(145deg, #0e2d4a 0%, #0a2438 50%, #0f3545 100%)',
      border: `${size >= 40 ? 2 : 1.5}px solid rgba(110,192,191,0.5)`,
      boxShadow: '0 0 16px rgba(110,192,191,0.2), inset 0 0 8px rgba(110,192,191,0.05)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}>
      <span style={{
        fontFamily: "'Cagliostro', serif",
        fontSize: Math.round(size * 0.42),
        color: '#6ec0bf',
        letterSpacing: '0.02em',
        textShadow: '0 0 10px rgba(110,192,191,0.5)',
        userSelect: 'none',
        lineHeight: 1,
      }}>S</span>
    </div>
  )
}

// ── Message bubble ────────────────────────────────────────────────────────────

function ChatMessage({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 10,
    }}>
      <div style={{
        maxWidth: '86%',
        padding: '9px 13px',
        borderRadius: isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
        background: isUser ? 'rgba(232,201,140,0.08)' : 'rgba(110,192,191,0.07)',
        border: `1px solid ${isUser ? 'rgba(232,201,140,0.18)' : 'rgba(110,192,191,0.15)'}`,
        fontFamily: "'Crimson Pro', Georgia, serif",
        fontSize: 15,
        lineHeight: 1.6,
        color: '#f2f0e6',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {msg.content}
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getTimeOfDay() {
  const h = new Date().getHours()
  if (h < 6)  return 'the middle of the night'
  if (h < 12) return 'the morning'
  if (h < 17) return 'the afternoon'
  if (h < 21) return 'the evening'
  return 'late at night'
}

// ── ScribblePanel ─────────────────────────────────────────────────────────────

export default function ScribblePanel({ open, onToggle, books, filteredCount }) {
  const [displayMessages, setDisplayMessages] = useState([])
  const [conversation,    setConversation]    = useState([])
  const [input,           setInput]           = useState('')
  const [isLoading,       setIsLoading]       = useState(false)
  const [basePromptText,  setBasePromptText]  = useState(null)   // raw from engine_room
  const [systemPrompt,    setSystemPrompt]    = useState(null)   // base + memories
  const [model,           setModel]           = useState('claude-sonnet-4-6')
  const [userId,          setUserId]          = useState(undefined) // undefined=loading, null=no user
  const [chatKey,         setChatKey]         = useState(0)

  const messagesEndRef     = useRef(null)
  const hasGreeted         = useRef(false)
  const inputRef           = useRef(null)
  // Refs for cleanup (can't read state in unmount cleanup)
  const displayMessagesRef = useRef([])
  const userIdRef          = useRef(undefined)
  const modelRef           = useRef('claude-sonnet-4-6')

  useEffect(() => { displayMessagesRef.current = displayMessages }, [displayMessages])
  useEffect(() => { userIdRef.current = userId }, [userId])
  useEffect(() => { modelRef.current = model }, [model])

  // ── Initialisation ──────────────────────────────────────────────────────────

  // Fetch base system prompt + model from engine_room
  useEffect(() => {
    supabase
      .from('engine_room')
      .select('id, content')
      .in('id', [72, 74])
      .then(({ data, error }) => {
        const promptRow = data?.find(r => r.id === 72)
        const modelRow  = data?.find(r => r.id === 74)
        if (promptRow?.content) {
          setBasePromptText(promptRow.content)
        } else {
          console.warn('[Scribble] engine_room id=72 not found, using fallback. Error:', error?.message)
          setBasePromptText(FALLBACK_SYSTEM_PROMPT)
        }
        if (modelRow?.content) setModel(modelRow.content)
      })
  }, [])

  // Fetch current user ID
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data?.session?.user?.id ?? null)
    })
  }, [])

  // Save summary on unmount (user navigated away from Book Pile)
  useEffect(() => {
    return () => {
      const msgs = displayMessagesRef.current
      const userMessageCount = msgs.filter(m => m.role === 'user').length
      if (userMessageCount >= 3 && userIdRef.current) {
        generateAndSaveSummary(msgs, userIdRef.current, modelRef.current)
      }
    }
  }, [])

  // ── System prompt + memory ──────────────────────────────────────────────────

  // Build full system prompt (base + recent memories) when panel opens or new chat starts.
  // Runs when: panel opens, base prompt loads, userId resolves, or chatKey increments.
  // Skips if systemPrompt is already set (keeps existing session alive on close/reopen).
  useEffect(() => {
    if (!open || !basePromptText || userId === undefined || systemPrompt !== null) return
    buildSystemPrompt()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, basePromptText, userId, systemPrompt, chatKey])

  async function buildSystemPrompt() {
    let fullPrompt = basePromptText

    if (userId) {
      const { data } = await supabase
        .from('scribble_memory')
        .select('summary, conversation_date')
        .eq('user_id', userId)
        .order('conversation_date', { ascending: false })
        .limit(3)

      if (data && data.length > 0) {
        const sorted = [...data].reverse() // oldest → newest for natural context flow
        const memBlock = [
          '## What you remember from recent conversations',
          '',
          ...sorted.map(r => `${r.conversation_date}\n${r.summary}`),
          '',
          "Treat this as things you simply know — don't reference it as notes or say \"last time you mentioned.\" You just remember.",
        ].join('\n')
        fullPrompt = `${basePromptText}\n\n${memBlock}`
      }
    }

    setSystemPrompt(fullPrompt)
  }

  // ── Session lifecycle ───────────────────────────────────────────────────────

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [displayMessages, isLoading])

  // Greet when the system prompt is ready and panel is open (once per chat session)
  useEffect(() => {
    if (!open || systemPrompt === null || hasGreeted.current) return
    hasGreeted.current = true
    sendGreeting()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, systemPrompt])

  // Focus input when panel opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 350)
  }, [open])

  function handleNewChat() {
    setDisplayMessages([])
    setConversation([])
    setSystemPrompt(null)   // triggers rebuild with fresh memories
    hasGreeted.current = false
    setChatKey(k => k + 1) // ensures the build effect re-fires even if systemPrompt was already null
  }

  // ── Library tool execution ──────────────────────────────────────────────────

  function executeLibraryTool({ query_type, search_term = '', rating_min = 5, status }) {
    // DB: 1=reading, 2=read, 3=to-read, 4=dnf
    const statusIntMap = { to_read: 3, read: 2, reading: 1, dnf: 4 }
    const statusLabel  = { 1: 'reading', 2: 'read', 3: 'to-read', 4: 'dnf' }
    const term = search_term.toLowerCase()

    switch (query_type) {
      case 'by_author': {
        const results = books
          .filter(b => b.attributes?.author?.toLowerCase().includes(term))
          .sort((a, b) => {
            const sA = a.attributes?.series_name || ''
            const sB = b.attributes?.series_name || ''
            if (sA !== sB) return sA.localeCompare(sB)
            return (Number(a.attributes?.series_number) || 0) - (Number(b.attributes?.series_number) || 0)
          })
          .map(b => ({
            title:      b.title,
            status:     statusLabel[b.status] ?? b.status,
            rating:     b.attributes?.goodreads_rating ?? null,
            series:     b.attributes?.series_name ?? null,
            series_num: b.attributes?.series_number ?? null,
          }))
        return JSON.stringify({ count: results.length, results })
      }

      case 'by_series': {
        const results = books
          .filter(b => b.attributes?.series_name?.toLowerCase().includes(term))
          .sort((a, b) => (Number(a.attributes?.series_number) || 0) - (Number(b.attributes?.series_number) || 0))
          .map(b => ({
            title:      b.title,
            author:     b.attributes?.author ?? null,
            status:     statusLabel[b.status] ?? b.status,
            rating:     b.attributes?.goodreads_rating ?? null,
            series_num: b.attributes?.series_number ?? null,
          }))
        return JSON.stringify({ count: results.length, results })
      }

      case 'by_rating': {
        const min = Number(rating_min) || 5
        const results = books
          .filter(b => b.status === 2 && Number(b.attributes?.goodreads_rating) >= min)
          .sort((a, b) => {
            const ac = (a.attributes?.author || '').localeCompare(b.attributes?.author || '')
            return ac !== 0 ? ac : (a.title || '').localeCompare(b.title || '')
          })
          .map(b => ({
            title:  b.title,
            author: b.attributes?.author ?? null,
            rating: b.attributes?.goodreads_rating ?? null,
            genre:  b.attributes?.primary_genre ?? null,
          }))
        return JSON.stringify({ count: results.length, results })
      }

      case 'by_status': {
        const statusInt = statusIntMap[status] ?? 2
        const results = books
          .filter(b => b.status === statusInt)
          .sort((a, b) => {
            const ac = (a.attributes?.author || '').localeCompare(b.attributes?.author || '')
            return ac !== 0 ? ac : (a.title || '').localeCompare(b.title || '')
          })
          .map(b => ({
            title:  b.title,
            author: b.attributes?.author ?? null,
            series: b.attributes?.series_name ?? null,
          }))
        return JSON.stringify({ count: results.length, results })
      }

      case 'by_genre': {
        const results = books
          .filter(b => b.status === 2 && b.attributes?.primary_genre?.toLowerCase().includes(term))
          .sort((a, b) => Number(b.attributes?.goodreads_rating || 0) - Number(a.attributes?.goodreads_rating || 0))
          .slice(0, 30)
          .map(b => ({
            title:  b.title,
            author: b.attributes?.author ?? null,
            rating: b.attributes?.goodreads_rating ?? null,
          }))
        return JSON.stringify({ count: results.length, results })
      }

      case 'by_trope': {
        const results = books
          .filter(b => b.status === 2 && (b.attributes?.tropes || []).some(t => t.toLowerCase() === term))
          .sort((a, b) => Number(b.attributes?.goodreads_rating || 0) - Number(a.attributes?.goodreads_rating || 0))
          .slice(0, 30)
          .map(b => ({
            title:  b.title,
            author: b.attributes?.author ?? null,
            rating: b.attributes?.goodreads_rating ?? null,
          }))
        return JSON.stringify({ count: results.length, results })
      }

      case 'top_authors': {
        const stats = {}
        books
          .filter(b => b.status === 2 && b.attributes?.author)
          .forEach(b => {
            const a = b.attributes.author
            if (!stats[a]) stats[a] = { count: 0, rSum: 0, rCount: 0 }
            stats[a].count++
            const r = Number(b.attributes?.goodreads_rating)
            if (r > 0) { stats[a].rSum += r; stats[a].rCount++ }
          })
        const results = Object.entries(stats)
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 15)
          .map(([author, s]) => ({
            author,
            book_count: s.count,
            avg_rating: s.rCount > 0 ? Math.round((s.rSum / s.rCount) * 10) / 10 : null,
          }))
        return JSON.stringify({ count: results.length, results })
      }

      case 'full_stats': {
        return JSON.stringify({
          total:   books.length,
          read:    books.filter(b => b.status === 2).length,
          to_read: books.filter(b => b.status === 3).length,
          reading: books.filter(b => b.status === 1).length,
          dnf:     books.filter(b => b.status === 4).length,
        })
      }

      case 'recommendations': {
        const results = books
          .filter(b => b.status === 2 && Number(b.attributes?.goodreads_rating) >= 4)
          .sort((a, b) => Number(b.attributes?.goodreads_rating || 0) - Number(a.attributes?.goodreads_rating || 0))
          .slice(0, 40)
          .map(b => ({
            title:  b.title,
            author: b.attributes?.author ?? null,
            rating: b.attributes?.goodreads_rating ?? null,
            genre:  b.attributes?.primary_genre ?? null,
            tropes: b.attributes?.tropes ?? [],
            vibes:  b.attributes?.vibe_tags ?? [],
            heat:   b.attributes?.heat_level ?? null,
            series: b.attributes?.series_name ?? null,
          }))
        return JSON.stringify({ count: results.length, results })
      }

      case 'by_low_confidence': {
        const results = books
          .filter(b => b.attributes?.low_confidence === true || b.attributes?.low_confidence === 'true')
          .sort((a, b) => {
            const ac = (a.attributes?.author || '').localeCompare(b.attributes?.author || '')
            return ac !== 0 ? ac : (a.title || '').localeCompare(b.title || '')
          })
          .map(b => ({
            title:  b.title,
            author: b.attributes?.author ?? null,
            genre:  b.attributes?.primary_genre ?? null,
          }))
        return JSON.stringify({ count: results.length, results })
      }

      default:
        return JSON.stringify({ error: 'Unknown query_type', query_type })
    }
  }

  // ── Tool-use conversation loop ──────────────────────────────────────────────

  async function runConversationTurn(messages, maxTokens = 1024) {
    const MAX_ROUNDS = 5
    let current = messages

    for (let round = 0; round < MAX_ROUNDS; round++) {
      const res = await client.messages.create({
        model,
        max_tokens: maxTokens,
        system: systemPrompt,
        tools: TOOLS,
        messages: current,
      })

      const libraryToolCalls = res.content.filter(b => b.type === 'tool_use' && b.name === 'search_library')

      if (libraryToolCalls.length === 0) {
        const text = res.content.filter(b => b.type === 'text').map(b => b.text).join('').trim()
        return { text, finalMessages: [...current, { role: 'assistant', content: res.content }] }
      }

      const toolResults = libraryToolCalls.map(block => ({
        type: 'tool_result',
        tool_use_id: block.id,
        content: executeLibraryTool(block.input),
      }))

      current = [
        ...current,
        { role: 'assistant', content: res.content },
        { role: 'user',      content: toolResults },
      ]
    }

    return { text: 'Something went quiet for a moment — try again?', finalMessages: current }
  }

  // ── API calls ───────────────────────────────────────────────────────────────

  async function sendGreeting() {
    if (!systemPrompt) return
    setIsLoading(true)

    const total   = books.length
    const read    = books.filter(b => b.status === 2).length
    const toRead  = books.filter(b => b.status === 3).length
    const reading = books.filter(b => b.status === 1).length

    const greetingPrompt = `It is ${getTimeOfDay()}. Cat's library: ${total} books total — ${read} read, ${toRead} to-read, ${reading} currently reading. Filtered view: ${filteredCount} book${filteredCount !== 1 ? 's' : ''}. Give Cat a short, warm, spontaneous opening greeting — 1-2 sentences. Vary it each time. You can use the search_library tool if you want to pull something interesting to mention, but keep it brief.`

    try {
      const { text, finalMessages } = await runConversationTurn(
        [{ role: 'user', content: greetingPrompt }],
        300
      )
      if (text) {
        setDisplayMessages([{ role: 'assistant', content: text }])
        setConversation(finalMessages)
      }
    } catch (err) {
      console.error('[Scribble] greeting failed — status:', err?.status, 'message:', err?.message, err)
      setDisplayMessages([{ role: 'assistant', content: "Hey, you're here! What are we reading today?" }])
    }
    setIsLoading(false)
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || isLoading || !systemPrompt) return
    setInput('')

    setDisplayMessages(prev => [...prev, { role: 'user', content: text }])
    const updatedConversation = [...conversation, { role: 'user', content: text }]
    setIsLoading(true)

    try {
      const { text: reply, finalMessages } = await runConversationTurn(updatedConversation)
      setDisplayMessages(prev => [...prev, { role: 'assistant', content: reply || 'Something went quiet for a moment — try again?' }])
      setConversation(finalMessages)
    } catch (err) {
      console.error('[Scribble] send failed — status:', err?.status, 'message:', err?.message, err)
      setDisplayMessages(prev => [...prev, { role: 'assistant', content: 'Something went quiet — try again?' }])
    }
    setIsLoading(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Persistent avatar tab — always visible when panel is closed */}
      <button
        onClick={onToggle}
        title="Open Scribble"
        aria-label="Open Scribble chat"
        style={{
          position: 'fixed',
          right: open ? -60 : 16,
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'none',
          border: 'none',
          padding: 4,
          cursor: 'pointer',
          zIndex: 201,
          transition: 'right 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          borderRadius: '50%',
        }}
      >
        <ScribbleAvatar size={44} />
      </button>

      {/* Slide-in panel */}
      <div
        role="dialog"
        aria-label="Scribble chat panel"
        style={{
          position: 'fixed',
          top: 0,
          right: open ? 0 : -420,
          width: 400,
          height: '100dvh',
          background: 'linear-gradient(180deg, #08102a 0%, #0f1a3a 25%, #16204a 50%, #14233f 75%, #0a1530 100%)',
          borderLeft: '1px solid rgba(110,192,191,0.18)',
          boxShadow: open ? '-8px 0 32px rgba(0,0,0,0.5)' : 'none',
          transition: 'right 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 200,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 18px 14px',
          borderBottom: '1px solid rgba(110,192,191,0.12)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexShrink: 0,
        }}>
          <ScribbleAvatar size={46} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: "'Cagliostro', serif",
              fontSize: 21,
              color: '#6ec0bf',
              letterSpacing: '0.04em',
              lineHeight: 1.2,
              textShadow: '0 0 14px rgba(110,192,191,0.25)',
            }}>Scribble</div>
          </div>
          {/* New chat — unobtrusive */}
          <button
            onClick={handleNewChat}
            title="Start a new chat"
            disabled={isLoading}
            style={{
              background: 'none',
              border: 'none',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              color: 'rgba(255,255,255,0.2)',
              fontSize: 12,
              fontFamily: "'Outfit', sans-serif",
              letterSpacing: '0.04em',
              padding: '4px 6px',
              transition: 'color 0.15s',
              flexShrink: 0,
            }}
            onMouseEnter={e => { if (!isLoading) e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.2)'}
          >↺ new chat</button>
          {/* Close */}
          <button
            onClick={onToggle}
            aria-label="Close Scribble"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.25)',
              fontSize: 24,
              lineHeight: 1,
              padding: '4px 6px',
              transition: 'color 0.15s',
              flexShrink: 0,
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.65)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.25)'}
          >×</button>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {displayMessages.length === 0 && !isLoading && (
            <div style={{
              fontFamily: "'Crimson Pro', Georgia, serif",
              fontSize: 14,
              fontStyle: 'italic',
              color: 'rgba(255,255,255,0.15)',
              textAlign: 'center',
              marginTop: 48,
            }}>…</div>
          )}
          {displayMessages.map((msg, i) => (
            <ChatMessage key={i} msg={msg} />
          ))}
          {isLoading && (
            <div style={{
              fontFamily: "'Crimson Pro', Georgia, serif",
              fontSize: 14,
              fontStyle: 'italic',
              color: 'rgba(110,192,191,0.35)',
              marginBottom: 8,
              paddingLeft: 2,
            }}>thinking…</div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: '10px 14px 20px',
          borderTop: '1px solid rgba(110,192,191,0.1)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="ask about your library…"
              rows={1}
              disabled={isLoading}
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(110,192,191,0.18)',
                borderRadius: 8,
                color: '#f2f0e6',
                fontFamily: "'Crimson Pro', Georgia, serif",
                fontSize: 14,
                lineHeight: 1.5,
                padding: '9px 12px',
                resize: 'none',
                outline: 'none',
                minHeight: 38,
                maxHeight: 120,
                overflowY: 'auto',
                transition: 'border-color 0.15s',
                boxSizing: 'border-box',
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'rgba(110,192,191,0.38)'}
              onBlur={e => e.currentTarget.style.borderColor = 'rgba(110,192,191,0.18)'}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              style={{
                height: 38,
                padding: '0 14px',
                borderRadius: 8,
                border: '1px solid rgba(110,192,191,0.28)',
                background: isLoading || !input.trim() ? 'transparent' : 'rgba(110,192,191,0.1)',
                color: isLoading || !input.trim() ? 'rgba(110,192,191,0.25)' : 'rgba(110,192,191,0.8)',
                fontFamily: "'Outfit', sans-serif",
                fontSize: 13,
                cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
              onMouseEnter={e => { if (!isLoading && input.trim()) e.currentTarget.style.background = 'rgba(110,192,191,0.18)' }}
              onMouseLeave={e => { if (!isLoading && input.trim()) e.currentTarget.style.background = 'rgba(110,192,191,0.1)' }}
            >send</button>
          </div>
        </div>
      </div>
    </>
  )
}
