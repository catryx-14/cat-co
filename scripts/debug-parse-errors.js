import 'dotenv/config'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are enriching a personal book database for a romance and fantasy reader. Your job is to return accurate, spoiler-free metadata for the book provided. Return a JSON object only — no preamble, no explanation, no markdown code fences. Raw JSON only.

Rules:
- Everything must be spoiler-free. The summary must not reveal plot twists, endings, or character deaths.
- Cliffhanger field describes ending structure only, not what happens. Cliffhanger = this specific story arc does not resolve, reader left in active suspense. Resolved-but-continues = story wraps up satisfyingly but characters continue in future books. Standalone = entirely self-contained.
- If you are not confident you have reliable knowledge of this specific book, set low_confidence to true. Do not invent details.
- If you have no reliable knowledge of this specific book at all, still return the full JSON structure with low_confidence set to true. Infer what you can from the title, author, and series name alone — make a reasonable genre guess, leave tropes minimal, and write a summary that acknowledges limited knowledge.
- For tropes, pick only from the provided trope list. Pick every trope that genuinely applies — typically 3–8 for a romance novel.
- MMC = male main character. FMC = female main character.`

function buildUserMessage(book) {
  return `Enrich this book:
Title: ${book.title || 'Unknown'}
Author: ${book.author || 'Unknown'}
Series: ${book.series_name || 'N/A'}
Goodreads shelves: ${book.bookshelves || ''}

Return this exact JSON structure:
{
  "summary": "2-3 sentence spoiler-free premise",
  "primary_genre": "one from: contemporary romance / historical romance / dark romance / romantasy / urban fantasy / paranormal romance / romantic suspense / M/M romance / mystery / thriller / sci-fi / fantasy / horror / non-fiction / other",
  "sub_genres": [],
  "tropes": [],
  "series_status": "complete / ongoing / standalone / unknown",
  "cliffhanger_type": "standalone / cliffhanger / resolved-but-continues / unknown",
  "mood_tags": [],
  "heat_level": "none / sweet / warm / steamy / explicit",
  "story_structure": "plot-driven / character-driven / balanced",
  "low_confidence": false
}

Approved trope list:
Enemies to lovers, Forced proximity, Fake dating, Second chance, Forbidden love, Grumpy / sunshine, Age gap, Slow burn, Love triangle, One bed, Best friends to lovers, Brother's best friend, Boss / employee, Bodyguard romance, Arranged / marriage of convenience, Secret identity, Childhood sweethearts reunited, Protector / protected, Opposites attract, Insta-love, Dark romance, Morally grey MMC, Alpha male, Soft hero, Villain love interest, Found family, Single parent, Chosen one, Dark / brooding MMC, Sunshine FMC, Strong FMC, Anti-hero, Reluctant hero, Mentor / student, Rivals, Redemption arc, Broken hero, Obsessive / possessive MMC, Revenge plot, Heist, Chosen one prophecy, Secret society, Hidden identity, Missing memory / amnesia, Time loop, Portal fantasy, Quest, Political intrigue, Reverse harem, Dual POV, Unreliable narrator, Slow reveal, Dark secret, Trapped together, Road trip, Tournament / competition, Kidnapping / captive, Mistaken identity, Small town, Academy / school setting, Royal court, Mafia / crime world, Military / spec ops, Supernatural world, Fae court, Pack dynamics / shifters, Vampire society, Witch / magic user, Dystopian, Post-apocalyptic, Space opera, Regency / historical, Small-town cowboys, Sports romance, Office / workplace, Medical setting, Rock star / celebrity, Billionaire world, Hurt / comfort, Found family feels, Grief and loss, Trauma healing, Identity crisis, Protective rage, Jealousy, Pining, Longing, Bittersweet, Chosen family over blood, Dark past revealed, Learning to trust, Vulnerability, Hope after devastation, Rage to tenderness, Letting go, Earned happiness`
}

async function run() {
  const { data: books } = await supabase
    .from('inventory_items')
    .select('id, title, attributes')
    .or('attributes->>ai_enriched.is.null,attributes->>ai_enriched.eq.false')
    .limit(5)

  for (const record of books) {
    const attrs = record.attributes ?? {}
    const title = attrs.title || record.title || 'Unknown Title'
    const author = attrs.author || 'Unknown Author'
    console.log(`\n${'─'.repeat(60)}`)
    console.log(`Book: ${title} — ${author}`)
    console.log('─'.repeat(60))

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserMessage({
        title,
        author,
        series_name: attrs.series_name || null,
        bookshelves: attrs.bookshelves || null,
      })}],
    })

    const raw = message.content[0]?.text ?? ''
    console.log('RAW RESPONSE:')
    console.log(raw)
    console.log()

    try {
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
      JSON.parse(cleaned)
      console.log('→ Parses OK')
    } catch {
      console.log('→ PARSE FAILURE')
    }
  }
}

run().catch(console.error)
