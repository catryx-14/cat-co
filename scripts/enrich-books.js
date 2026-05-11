import 'dotenv/config'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
  process.exit(1)
}
if (!ANTHROPIC_KEY) {
  console.error('Missing ANTHROPIC_API_KEY in .env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY })

const SYSTEM_PROMPT = `You are enriching a personal book database for a romance and fantasy reader. Your job is to return accurate, spoiler-free metadata for the book provided. Return a JSON object only — no preamble, no explanation, no markdown code fences. Raw JSON only.

Rules:
- Everything must be spoiler-free. The summary must not reveal plot twists, endings, or character deaths.
- Cliffhanger field describes ending structure only, not what happens. Cliffhanger = this specific story arc does not resolve, reader left in active suspense. Resolved-but-continues = story wraps up satisfyingly but characters continue in future books. Standalone = entirely self-contained.
- If you are not confident you have reliable knowledge of this specific book, set low_confidence to true. Do not invent details.
- If you have no reliable knowledge of this specific book at all, still return the full JSON structure with low_confidence set to true. Infer what you can from the title, author, and series name alone — make a reasonable genre guess, leave tropes minimal, and write a summary that acknowledges limited knowledge.
- For tropes, pick only from the provided trope list. Pick every trope that genuinely applies — typically 3–8 for a romance novel.
- MMC = male main character. FMC = female main character.`

function buildUserMessage(book) {
  const { title, author, series_name, bookshelves } = book
  return `Enrich this book:
Title: ${title || 'Unknown'}
Author: ${author || 'Unknown'}
Series: ${series_name || 'N/A'}
Goodreads shelves: ${bookshelves || ''}

Return this exact JSON structure:
{
  "summary": "2-3 sentence spoiler-free premise",
  "primary_genre": "one from: contemporary romance / historical romance / dark romance / romantasy / urban fantasy / paranormal romance / romantic suspense / M/M romance / mystery / thriller / sci-fi / fantasy / horror / non-fiction / other",
  "sub_genres": [],
  "tropes": [],
  "series_status": "complete / ongoing / standalone / unknown",
  "cliffhanger_type": "standalone / cliffhanger / resolved-but-continues / unknown",
  "vibe_tags": ["pick only from: slow burn, dark, emotional, lighthearted, tense, witty, cozy, angsty, heartwarming, rich world-building, magical, dangerous, forbidden, possessive, funny"],
  "heat_level": "none / sweet / warm / steamy / explicit",
  "story_structure": "plot-driven / character-driven / balanced",
  "low_confidence": false
}

Approved trope list:
Enemies to lovers, Forced proximity, Fake dating, Second chance, Forbidden love, Grumpy / sunshine, Age gap, Slow burn, Love triangle, One bed, Best friends to lovers, Brother's best friend, Boss / employee, Bodyguard romance, Arranged / marriage of convenience, Secret identity, Childhood sweethearts reunited, Protector / protected, Opposites attract, Insta-love, Dark romance, Morally grey MMC, Alpha male, Soft hero, Villain love interest, Found family, Single parent, Chosen one, Dark / brooding MMC, Sunshine FMC, Strong FMC, Anti-hero, Reluctant hero, Mentor / student, Rivals, Redemption arc, Broken hero, Obsessive / possessive MMC, Revenge plot, Heist, Chosen one prophecy, Secret society, Hidden identity, Missing memory / amnesia, Time loop, Portal fantasy, Quest, Political intrigue, Reverse harem, Dual POV, Unreliable narrator, Slow reveal, Dark secret, Trapped together, Road trip, Tournament / competition, Kidnapping / captive, Mistaken identity, Small town, Academy / school setting, Royal court, Mafia / crime world, Military / spec ops, Supernatural world, Fae court, Pack dynamics / shifters, Vampire society, Witch / magic user, Dystopian, Post-apocalyptic, Space opera, Regency / historical, Small-town cowboys, Sports romance, Office / workplace, Medical setting, Rock star / celebrity, Billionaire world, Hurt / comfort, Found family feels, Grief and loss, Trauma healing, Identity crisis, Protective rage, Jealousy, Pining, Longing, Bittersweet, Chosen family over blood, Dark past revealed, Learning to trust, Vulnerability, Hope after devastation, Rage to tenderness, Letting go, Earned happiness`
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function enrichBook(book) {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserMessage(book) }],
  })

  const raw = message.content[0]?.text ?? ''
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new SyntaxError('No JSON object found in response')
  return JSON.parse(jsonMatch[0])
}

async function run() {
  console.log('Fetching unenriched books from Supabase...')

  const { data: books, error: fetchErr } = await supabase
    .from('inventory_items')
    .select('id, title, attributes')
    .or('attributes->>ai_enriched.is.null,attributes->>ai_enriched.eq.false')

  if (fetchErr) {
    console.error('Failed to fetch books:', fetchErr.message)
    process.exit(1)
  }

  const total = books.length
  console.log(`Found ${total} unenriched book(s).\n`)

  let succeeded = 0
  let skipped = 0
  let lowConfidence = 0

  for (let i = 0; i < books.length; i++) {
    const record = books[i]
    const attrs = record.attributes ?? {}
    const title = attrs.title || record.title || 'Unknown Title'
    const author = attrs.author || 'Unknown Author'
    const prefix = `[${i + 1}/${total}] ${title} — ${author}`

    try {
      const enrichment = await enrichBook({
        title,
        author,
        series_name: attrs.series_name || null,
        bookshelves: attrs.bookshelves || null,
      })

      const isLowConfidence = enrichment.low_confidence === true

      const mergedAttributes = {
        ...attrs,
        ...enrichment,
        ai_enriched: true,
      }

      const { error: updateErr } = await supabase
        .from('inventory_items')
        .update({ attributes: mergedAttributes })
        .eq('id', record.id)

      if (updateErr) {
        console.log(`${prefix} ⚠ skipped (save error: ${updateErr.message})`)
        skipped++
      } else {
        succeeded++
        if (isLowConfidence) {
          lowConfidence++
          console.log(`${prefix} ✓ (low confidence)`)
        } else {
          console.log(`${prefix} ✓`)
        }
      }
    } catch (err) {
      if (err instanceof SyntaxError) {
        console.log(`${prefix} ⚠ skipped (parse error)`)
      } else {
        console.log(`${prefix} ⚠ skipped (${err.message})`)
      }
      skipped++
    }

    if (i < books.length - 1) {
      await sleep(200)
    }
  }

  console.log('\n── Summary ─────────────────────────────')
  console.log(`  Total processed:    ${total}`)
  console.log(`  Succeeded:          ${succeeded}`)
  console.log(`  Skipped:            ${skipped}`)
  console.log(`  Low confidence:     ${lowConfidence}`)
  console.log('────────────────────────────────────────')
}

run().catch(err => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
