---
name: pnet-search
version: 1.0.0
description: >
  Search live job listings on PNet (pnet.co.za), one of South Africa's largest
  job boards. Use whenever the user wants jobs, vacancies or openings in South
  Africa - Johannesburg, Sandton, Cape Town, Pretoria, Durban - or wants the
  full text of a PNet posting. Trigger phrases: jobs in South Africa, SA jobs,
  vacancies in Johannesburg, Cape Town jobs, PNet, "are there any X jobs in
  Sandton", look up this PNet job.
context: fork
enabled: true  # set to false to keep this portal installed but have /scrape skip it
allowed-tools: Bash(bun run .agents/skills/pnet-search/cli/src/cli.ts *)
---

# PNet Search Skill

Searches **PNet** (pnet.co.za), a large South African job board, from its public search
and listing pages. No login, no API key, **zero runtime dependencies**.

## When to use this skill

- Find openings in South Africa by keyword, optionally in one city or area
- Limit to recent postings (last 1 or 7 days are filtered by PNet itself; longer windows client-side)
- Read the full description of a PNet posting

## Commands

### Search

```bash
bun run .agents/skills/pnet-search/cli/src/cli.ts search --query "<keywords>" [flags]
```

- `--query <text>` / `-q` - **required.** Job title or skill, e.g. `"senior product manager"`.
- `--location <text>` / `-l` - city or area: `"Johannesburg"`, `"Cape Town"`, `"Sandton"`, `"Pretoria"`, `"Durban"`.
- `--jobage <days>` - posted within N days.
- `--page <n>` - results page (1-indexed, about 25 per page).
- `--limit <n>` / `-n` - cap results emitted.
- `--format json|table|plain` - default `json`.

### Detail

```bash
bun run .agents/skills/pnet-search/cli/src/cli.ts detail <id|url> [--format json|plain]
```

The `id` is the slug printed by `search` (e.g. `Product-Manager-Cape-Town-Takealot-Group-Pty-Ltd--4298284`)
or the full `pnet.co.za/jobs--...-inline.html` URL. A bare number does not work: PNet answers
listing pages only on their full slug URL.

## Usage examples

```bash
# Senior product roles across South Africa
bun run .agents/skills/pnet-search/cli/src/cli.ts search -q "senior product manager" --format table

# Head of Product in Johannesburg, last 7 days
bun run .agents/skills/pnet-search/cli/src/cli.ts search -q "head of product" -l "Johannesburg" --jobage 7 --format table

# Growth leadership in Cape Town
bun run .agents/skills/pnet-search/cli/src/cli.ts search -q "head of growth" -l "Cape Town" --format table

# Full posting
bun run .agents/skills/pnet-search/cli/src/cli.ts detail Product-Manager-Cape-Town-Takealot-Group-Pty-Ltd--4298284 --format plain
```

## Output formats

| Format | Best for |
|--------|----------|
| `json` | Default - programmatic use, passing ids to `detail` |
| `table` | Quick scanning |
| `plain` | Reading one posting (`detail`) |

Each search result has `id`, `title`, `company`, `location`, `date` (ISO timestamp), `url`, plus
`deadline` and a short `snippet`. Errors go to **stderr** as `{ "error": "...", "code": "..." }` with exit code `1`.

## Notes

- PNet's search is keyword-based and loose: "senior product manager" also returns product owner
  and adjacent roles. Read titles before ranking.
- PNet's own age filter only has "new" (1 day) and "last week" (7 days). `--jobage` above 7 fetches
  everything and filters on each result's date.
- A `BLOCKED` error means PNet's bot protection refused the request. Wait before retrying; don't loop.
- Endpoint details and parsing anchors: [url-reference.md](url-reference.md).
