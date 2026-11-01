---
name: mycareersfuture-search
version: 1.0.0
description: >
  Search live job listings on MyCareersFuture (mycareersfuture.gov.sg),
  Singapore's official government job portal, through its public JSON API.
  Use whenever the user wants jobs, vacancies or openings in Singapore, or the
  full text and salary range of a MyCareersFuture posting. Trigger phrases:
  jobs in Singapore, Singapore vacancies, SG jobs, MyCareersFuture, MCF,
  "any X jobs in Singapore", look up this MyCareersFuture job.
context: fork
enabled: true  # set to false to keep this portal installed but have /scrape skip it
allowed-tools: Bash(bun run .agents/skills/mycareersfuture-search/cli/src/cli.ts *)
---

# MyCareersFuture Search Skill

Searches **MyCareersFuture**, Singapore's government-run job portal, through its public JSON
API. No login, no API key, **zero runtime dependencies**. Most postings include a salary range,
which Singapore requires on this portal.

## When to use this skill

- Find openings in Singapore by keyword
- See the advertised salary range, seniority level and minimum experience
- Read the full description of a posting

## Commands

### Search

```bash
bun run .agents/skills/mycareersfuture-search/cli/src/cli.ts search --query "<keywords>" [flags]
```

- `--query <text>` / `-q` - **required.** Job title or skill.
- `--jobage <days>` - posted within N days. Filters the fetched page client-side on `date`
  (the API has no age parameter; results are ranked by relevance).
- `--page <n>` - results page (1-indexed, 20 per page).
- `--limit <n>` / `-n` - cap results emitted.
- `--format json|table|plain` - default `json`.

No `--location`: the portal covers Singapore only, and each result's `location` names the region
(Central, East, North, ...).

### Detail

```bash
bun run .agents/skills/mycareersfuture-search/cli/src/cli.ts detail <id|url> [--format json|plain]
```

`id` is the 32-character job id from `search`, or a `mycareersfuture.gov.sg/job/...` URL.

## Usage examples

```bash
# Senior product roles
bun run .agents/skills/mycareersfuture-search/cli/src/cli.ts search -q "senior product manager" --format table

# Head of Product, second page
bun run .agents/skills/mycareersfuture-search/cli/src/cli.ts search -q "head of product" --page 2 --format table

# Growth leadership posted in the last 14 days
bun run .agents/skills/mycareersfuture-search/cli/src/cli.ts search -q "head of growth" --jobage 14 --format table

# Full posting with salary
bun run .agents/skills/mycareersfuture-search/cli/src/cli.ts detail 2db3ef16e449b631779c2abe54c28752 --format plain
```

## Output formats

| Format | Best for |
|--------|----------|
| `json` | Default - programmatic use, passing ids to `detail` |
| `table` | Quick scanning |
| `plain` | Reading one posting (`detail`) |

Each result has `id`, `title`, `company`, `location`, `date`, `url`, plus `deadline` (expiry date)
and `salary` (e.g. `SGD 10000-13000 Monthly`). Errors go to **stderr** as
`{ "error": "...", "code": "..." }` with exit code `1`.

## Notes

- `date` is the latest posting date; reposted jobs show the repost date.
- The search is relevance-ranked and broad ("head of growth" also matches growth-adjacent roles).
- Endpoint details: [url-reference.md](url-reference.md).
