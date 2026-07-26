# CLAUDE.md

Instructions for Claude working on the **cat-co** project. Claude Code reads this file
automatically at the start of every session.

## Working with Cat

**Cat is the project owner and web administrator.** She makes all decisions about what gets built and how.

- Use plain, everyday language. Explain any unavoidable technical term in one short sentence.
- Go one step at a time. Don't dump every step at once; check in as you go.
- **"Stick that"** — if Cat says to capture something, save it to the engine room
  immediately, no fuss.
- Full working-style guide: read the engine room doc **"Working Style — How Cat and Claude
  Collaborate"** (category `reference`).

## The engine room is the source of truth

Project knowledge lives in the **`engine_room` table** in Supabase (project
`esllldyazoxrqcmdpwyq`). Cat can see it in her app, and it works across every Claude
conversation — not just this computer.

👉 **At the start of any project or database work, read the engine room first.** The
`config` doc there ("Project Config — Where Everything Lives") has the current stack
details, IDs, and repo.

### Categories — every row is tagged with exactly one

| Category | What goes here |
|----------|----------------|
| `architecture` | Why it's built this way; the big-picture how the pieces fit |
| `schema` | The database structure — tables and columns |
| `reference` | How things work in practice; operating knowledge; locked specs |
| `design` | Visual design, UI specs, theming |
| `config` | IDs, repo links, settings, "where things live" |
| `todo` | Things to do or follow up |
| `session` | Dated session summaries |
| `ideas` | Ideas not yet ready to build |

The category is the **type** of doc — not the part of the app. Put the wing name
(First Aid, Book Pile, Capacity Tracker, etc.) in the **title** instead.

### Status — keep it honest

- `active` — current and relevant
- `done` — finished (shipped features, completed todos)
- `archived` — no longer current, kept for history

When a feature ships or a todo is finished, **mark it `done`** — don't leave it `active`.

Always pull status when scanning — navigate by status, never on title/category alone.
When you mark a row done, tidy its body so the text agrees with the status.

### Reading the engine room — always filter out archived and session rows

**Never include `archived` rows when reading for context.** Archived docs are history only — they must not influence decisions or be treated as current knowledge.

**Never load `session` rows as part of the regular context read.** Session summaries are a historical log — they are useful if Cat asks about a past session, but they don't need to be loaded every time. Always query with:

```sql
WHERE status != 'archived' AND category != 'session'
```

A previous Claude was confused by an archived doc and treated a completed project as still active. Don't repeat this mistake.

## Working rules

1. **At the start of any Hub session, `git pull` first.** Cat works from two laptops —
   the local copy may be behind whatever was last pushed from the other one.
2. Before touching the database, read the engine room (categories `schema` and
   `architecture`) to understand the structure.
3. After a meaningful change or decision, record it in the engine room under the right
   category — and set the right status.
4. Never delete data or run a destructive change without explaining it to Cat and
   getting an OK.
5. **At the end of every session**, tidy the engine room:
   - Mark completed todos as `done`
   - Create a session summary (category `session`) with the date and what was built or decided
   - Update any `schema` or `architecture` docs that changed
   - Don't leave the engine room stale — it's only useful if it's current
