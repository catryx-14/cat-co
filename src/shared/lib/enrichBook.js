import Anthropic from '@anthropic-ai/sdk'
import { supabase } from './supabase.js'

const client = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
})

export async function enrichBook(bookId, { title, author, series_name = '' }) {
  const { data: rows } = await supabase
    .from('engine_room')
    .select('id, content')
    .in('id', [67, 68, 71, 74])

  const fullContent  = rows?.find(r => r.id === 68)?.content ?? ''
  const tropeContent = rows?.find(r => r.id === 67)?.content ?? ''
  const vibeContent  = rows?.find(r => r.id === 71)?.content ?? ''
  const model        = rows?.find(r => r.id === 74)?.content?.trim() ?? 'claude-sonnet-4-6'

  // Extract the actual prompt text (between ## The prompt and ## Notes)
  const promptMatch = fullContent.match(/## The prompt\s*\n+([\s\S]*?)\n+---\s*\n+## Notes/)
  const basePrompt  = promptMatch?.[1]?.trim() ?? fullContent.trim()

  // Parse approved vibe tags from id=71
  const vibeLineMatch = vibeContent.match(/^(slow burn[\s\S]*?)$/m)
  const vibeTagsStr = vibeLineMatch?.[1]
    ?.split('·').map(v => v.trim()).join(', ')
    ?? 'slow burn, dark, emotional, lighthearted, tense, witty, cozy, angsty, heartwarming, rich world-building, magical, dangerous, forbidden, possessive, funny'

  const prompt = basePrompt
    .replace('(injected at runtime from Engine Room id=66)', tropeContent.trim())
    .replace(
      /"mood_tags": \["pick any that apply:[^"]*"\]/,
      `"vibe_tags": ["pick from: ${vibeTagsStr}"]`,
    )
    .replace('{title}', title)
    .replace('{author}', author)
    .replace('{series_name}', series_name || 'none')
    .replace('{shelves}', '')

  try {
    const res = await client.messages.create({
      model,
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text      = res.content.find(b => b.type === 'text')?.text ?? ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')

    const data = JSON.parse(jsonMatch[0])

    const { data: current } = await supabase
      .from('inventory_items')
      .select('attributes')
      .eq('id', bookId)
      .single()

    const enriched = {
      ...(current?.attributes ?? {}),
      summary:          data.summary          ?? null,
      primary_genre:    data.primary_genre    ?? null,
      sub_genres:       Array.isArray(data.sub_genres)  ? data.sub_genres  : [],
      tropes:           Array.isArray(data.tropes)      ? data.tropes      : [],
      series_status:    data.series_status    ?? null,
      cliffhanger_type: data.cliffhanger_type ?? null,
      vibe_tags:        Array.isArray(data.vibe_tags)  ? data.vibe_tags
                      : Array.isArray(data.mood_tags)  ? data.mood_tags   : [],
      heat_level:       data.heat_level       ?? null,
      story_structure:  data.story_structure  ?? null,
      low_confidence:   data.low_confidence   ?? false,
      ai_enriched:      true,
    }

    await supabase
      .from('inventory_items')
      .update({ attributes: enriched, needs_review: false })
      .eq('id', bookId)

    return { success: true, attrs: enriched }
  } catch (err) {
    console.error('[enrichBook] failed for book', bookId, err)
    const { data: current } = await supabase
      .from('inventory_items')
      .select('attributes')
      .eq('id', bookId)
      .single()
    await supabase
      .from('inventory_items')
      .update({ attributes: { ...(current?.attributes ?? {}), low_confidence: true } })
      .eq('id', bookId)
    return { success: false }
  }
}
