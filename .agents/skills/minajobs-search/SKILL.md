---
name: minajobs-search
version: 1.0.0
description: >
  Search live job listings on MinaJobs (cameroun.minajobs.net), Cameroon's
  main job board. Use whenever the user wants jobs, vacancies, internships or
  recruitment notices in Cameroon - Douala, Yaoundé - or the full text of a
  MinaJobs offer. Trigger phrases: jobs in Cameroon, Douala jobs, Yaoundé jobs,
  offres d'emploi Cameroun, avis de recrutement, emploi Douala, MinaJobs,
  "any X jobs in Cameroon".
context: fork
enabled: true  # set to false to keep this portal installed but have /scrape skip it
allowed-tools: Bash(bun run .agents/skills/minajobs-search/cli/src/cli.ts *)
---

# MinaJobs Search Skill

Searches **MinaJobs** (cameroun.minajobs.net), Cameroon's main job board, from its public pages.
No login, no API key, **zero runtime dependencies**. Postings are in French or English.

## When to use this skill

- Find openings in Cameroon (mostly Douala and Yaoundé) by keyword
- Read the full text of a MinaJobs offer

## Commands

### Search

```bash
bun run .agents/skills/minajobs-search/cli/src/cli.ts search --query "<keywords>" [flags]
```

- `--query <text>` / `-q` - **required.** Keywords, French or English.
- `--jobage <days>` - posted within N days (client-side; cards show the age in days).
- `--page <n>` - slice of 25 results (the site returns up to 100 at once).
- `--limit <n>` / `-n` - cap results emitted.
- `--format json|table|plain` - default `json`.

### Detail

```bash
bun run .agents/skills/minajobs-search/cli/src/cli.ts detail <id|url> [--format json|plain]
```

`id` is the numeric offer id from `search` (e.g. `45570`), or a `minajobs.net/emplois-stage-recrutement/...` URL.

## Usage examples

```bash
# Management roles
bun run .agents/skills/minajobs-search/cli/src/cli.ts search -q "manager" --format table

# Product roles
bun run .agents/skills/minajobs-search/cli/src/cli.ts search -q "product manager" --format table

# Directors posted in the last 14 days
bun run .agents/skills/minajobs-search/cli/src/cli.ts search -q "directeur" --jobage 14 --format table

# Full offer
bun run .agents/skills/minajobs-search/cli/src/cli.ts detail 45570 --format plain
```

## Output formats

| Format | Best for |
|--------|----------|
| `json` | Default - programmatic use, passing ids to `detail` |
| `table` | Quick scanning |
| `plain` | Reading one offer (`detail`) |

Errors go to **stderr** as `{ "error": "...", "code": "..." }` with exit code `1`.

## Notes

- Search `date` is computed from the card's "Publiée depuis N" (days); detail gives the exact date.
- The search is loose and includes broad notices ("Avis de recrutement : 05 postes ..."); read titles.
- Many offers name their deadline only inside the description text, so `deadline` is null.
- The `www.minajobs.net` host returns 500 on search; the CLI uses the `cameroun.` subdomain it redirects to.
- Endpoint details and parsing anchors: [url-reference.md](url-reference.md).
