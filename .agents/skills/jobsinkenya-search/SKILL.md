---
name: jobsinkenya-search
version: 1.0.0
description: >
  Search live job listings on Jobs in Kenya (jobsinkenya.co.ke). Use whenever
  the user wants jobs, vacancies or openings in Kenya - Nairobi, Mombasa,
  Kisumu - or the full text of a Jobs in Kenya posting. Trigger phrases: jobs
  in Kenya, Nairobi jobs, Kenya vacancies, Jobs in Kenya, "any X jobs in
  Nairobi", look up this jobsinkenya job.
context: fork
enabled: true  # set to false to keep this portal installed but have /scrape skip it
allowed-tools: Bash(bun run .agents/skills/jobsinkenya-search/cli/src/cli.ts *)
---

# Jobs in Kenya Search Skill

Searches **Jobs in Kenya** (jobsinkenya.co.ke) through the site's search RSS feed, and reads
postings from their public pages. No login, no API key, **zero runtime dependencies**.

## When to use this skill

- Find openings in Kenya by keyword, newest first, with exact posting times
- Read the full text of a posting, with its company, location, expiry date and job type

## Commands

### Search

```bash
bun run .agents/skills/jobsinkenya-search/cli/src/cli.ts search --query "<keywords>" [flags]
```

- `--query <text>` / `-q` - **required.** Keywords.
- `--jobage <days>` - posted within N days (client-side on each result's exact date).
- `--page <n>` - results page (1-indexed, 50 per page).
- `--limit <n>` / `-n` - cap results emitted.
- `--format json|table|plain` - default `json`.

### Detail

```bash
bun run .agents/skills/jobsinkenya-search/cli/src/cli.ts detail <id|url> [--format json|plain]
```

`id` is the post slug from `search` (e.g. `head-of-product-development-and-diversification-ktda-holdings`),
or a `jobsinkenya.co.ke/job/...` URL.

## Usage examples

```bash
# Product roles, newest first
bun run .agents/skills/jobsinkenya-search/cli/src/cli.ts search -q "product manager" --format table

# Head-of roles posted in the last 14 days
bun run .agents/skills/jobsinkenya-search/cli/src/cli.ts search -q "head of" --jobage 14 --format table

# Growth roles
bun run .agents/skills/jobsinkenya-search/cli/src/cli.ts search -q "growth" --format table

# Full posting
bun run .agents/skills/jobsinkenya-search/cli/src/cli.ts detail head-of-product-development-and-diversification-ktda-holdings --format plain
```

## Output formats

| Format | Best for |
|--------|----------|
| `json` | Default - programmatic use, passing ids to `detail` |
| `table` | Quick scanning |
| `plain` | Reading one posting (`detail`) |

Errors go to **stderr** as `{ "error": "...", "code": "..." }` with exit code `1`.

## Notes

- WordPress search matches any of the words, in title or text, so results are broad; read titles.
- Search results have no location (`location: null`) and the company is a best guess from the
  posting's opening line; `detail` gives both reliably.
- Endpoint details and parsing anchors: [url-reference.md](url-reference.md).
