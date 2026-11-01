---
name: jobinrwanda-search
version: 1.0.0
description: >
  Search live job listings on Job in Rwanda (jobinrwanda.com), Rwanda's main
  job board. Use whenever the user wants jobs, vacancies, openings or
  consultancies in Rwanda or Kigali, or the full text of a Job in Rwanda
  posting. Trigger phrases: jobs in Rwanda, Kigali jobs, Rwanda
  vacancies, offres d'emploi au Rwanda, Job in Rwanda, "any X jobs in Kigali",
  look up this jobinrwanda job.
context: fork
enabled: true  # set to false to keep this portal installed but have /scrape skip it
allowed-tools: Bash(bun run .agents/skills/jobinrwanda-search/cli/src/cli.ts *)
---

# Job in Rwanda Search Skill

Searches **Job in Rwanda** (jobinrwanda.com) from its public pages. No login, no API key,
**zero runtime dependencies**. Postings are in English or French.

## When to use this skill

- Find openings in Rwanda (mostly Kigali) by job-title keywords
- See the application deadline and seniority band of each posting
- Read the full text of a posting

## Commands

### Search

```bash
bun run .agents/skills/jobinrwanda-search/cli/src/cli.ts search --query "<title keywords>" [flags]
```

- `--query <text>` / `-q` - **required.** Matched against job **titles** only.
- `--jobage <days>` - posted within N days (client-side on each result's date).
- `--page <n>` - results page (1-indexed).
- `--limit <n>` / `-n` - cap results emitted.
- `--format json|table|plain` - default `json`.

### Detail

```bash
bun run .agents/skills/jobinrwanda-search/cli/src/cli.ts detail <id|url> [--format json|plain]
```

`id` is the slug from `search` (e.g. `conservation-research-manager-0`), or a `jobinrwanda.com/job/...` URL.

## Usage examples

```bash
# Management roles
bun run .agents/skills/jobinrwanda-search/cli/src/cli.ts search -q "manager" --format table

# Anything with "product" in the title
bun run .agents/skills/jobinrwanda-search/cli/src/cli.ts search -q "product" --format table

# Heads of department posted in the last 14 days
bun run .agents/skills/jobinrwanda-search/cli/src/cli.ts search -q "head" --jobage 14 --format table

# Full posting
bun run .agents/skills/jobinrwanda-search/cli/src/cli.ts detail conservation-research-manager-0 --format plain
```

## Output formats

| Format | Best for |
|--------|----------|
| `json` | Default - programmatic use, passing ids to `detail` |
| `table` | Quick scanning |
| `plain` | Reading one posting (`detail`) |

Each result has `id`, `title`, `company`, `location`, `date`, `url`, plus `deadline` and `snippet`
(the seniority band, e.g. "Senior (5+ years of experience)"). Errors go to **stderr** as
`{ "error": "...", "code": "..." }` with exit code `1`.

## Notes

- The search matches **titles**, all words: "senior product manager" is often empty in Rwanda's
  small market. Use one or two broad words ("product", "manager", "head") and filter the titles.
- Detail pages give no posting date (`date: null`); use the search result's date.
- Endpoint details and parsing anchors: [url-reference.md](url-reference.md).
