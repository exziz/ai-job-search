---
name: careers24-search
version: 1.0.0
description: >
  Search live job listings on Careers24 (careers24.com), a major South African
  job board. Use whenever the user wants jobs, vacancies or openings in South
  Africa - Gauteng, Johannesburg, Cape Town, Western Cape, Durban, Pretoria -
  or the full text of a Careers24 advert. Trigger phrases: jobs in South
  Africa, Gauteng vacancies, Cape Town jobs, Careers24, "any X jobs in
  Johannesburg", look up this Careers24 job.
context: fork
enabled: true  # set to false to keep this portal installed but have /scrape skip it
allowed-tools: Bash(bun run .agents/skills/careers24-search/cli/src/cli.ts *)
---

# Careers24 Search Skill

Searches **Careers24** (careers24.com), a large South African job board, from its public
search and advert pages. No login, no API key, **zero runtime dependencies**.

## When to use this skill

- Find openings in South Africa by keyword, optionally in one province or city
- Read the full text of a Careers24 advert

## Commands

### Search

```bash
bun run .agents/skills/careers24-search/cli/src/cli.ts search --query "<keywords>" [flags]
```

- `--query <text>` / `-q` - **required.** Job title or skill.
- `--location <text>` / `-l` - province or city: `"Gauteng"`, `"Western Cape"`, `"Johannesburg"`, `"Cape Town"`, `"Durban"`.
- `--jobage <days>` - posted within N days. Careers24 has no age parameter, so this filters each result's date client-side (on the page fetched).
- `--page <n>` - results page (1-indexed, 10 per page).
- `--limit <n>` / `-n` - cap results emitted.
- `--format json|table|plain` - default `json`.

### Detail

```bash
bun run .agents/skills/careers24-search/cli/src/cli.ts detail <id|url> [--format json|plain]
```

`id` is the numeric advert id from `search` (e.g. `2395880`), or a `careers24.com/jobs/adverts/...` URL.

## Usage examples

```bash
# Product managers anywhere in South Africa
bun run .agents/skills/careers24-search/cli/src/cli.ts search -q "product manager" --format table

# Head of Product in Gauteng
bun run .agents/skills/careers24-search/cli/src/cli.ts search -q "head of product" -l "Gauteng" --format table

# Growth roles in Cape Town posted in the last 14 days
bun run .agents/skills/careers24-search/cli/src/cli.ts search -q "growth" -l "Cape Town" --jobage 14 --format table

# Full advert
bun run .agents/skills/careers24-search/cli/src/cli.ts detail 2395880 --format plain
```

## Output formats

| Format | Best for |
|--------|----------|
| `json` | Default - programmatic use, passing ids to `detail` |
| `table` | Quick scanning |
| `plain` | Reading one advert (`detail`) |

Errors go to **stderr** as `{ "error": "...", "code": "..." }` with exit code `1`.

## Notes

- Recruiter-posted adverts often show no company on the search card (`company: null`); the detail
  page usually names the agency.
- Multi-word searches are strict: "senior product manager" can return far fewer results than
  "product manager". Search broad, then filter titles.
- Endpoint details and parsing anchors: [url-reference.md](url-reference.md).
