---
name: novojob-search
version: 1.0.0
description: >
  Search live job listings on Novojob (novojob.com), a French-language job
  board for West Africa, in Côte d'Ivoire (Abidjan) and Senegal (Dakar). Use
  whenever the user wants jobs or vacancies in Ivory Coast or Senegal, or the
  full text of a Novojob offer. Trigger phrases: jobs in Ivory Coast, Côte
  d'Ivoire jobs, Abidjan jobs, Senegal jobs, Dakar jobs, offres d'emploi,
  recrutement Abidjan, emploi Côte d'Ivoire, emploi Sénégal, Novojob.
context: fork
enabled: true  # set to false to keep this portal installed but have /scrape skip it
allowed-tools: Bash(bun run .agents/skills/novojob-search/cli/src/cli.ts *)
---

# Novojob Search Skill

Searches **Novojob** (novojob.com), a French-language job board for West Africa, from its public
pages. No login, no API key, **zero runtime dependencies**. Postings are mostly in French.

## When to use this skill

- Find openings in **Côte d'Ivoire** (most listings) or **Senegal** (few listings) by keyword
- Read the full text of a Novojob offer

## Commands

### Search

```bash
bun run .agents/skills/novojob-search/cli/src/cli.ts search --query "<mots-clés>" [flags]
```

- `--query <text>` / `-q` - **required.** Keywords, French or English (`"product manager"`, `"directeur commercial"`).
- `--country <code>` / `-c` - `ci` (Côte d'Ivoire, default) or `sn` (Senegal).
- `--jobage <days>` - posted within N days (client-side on each result's date).
- `--page <n>` - results page (1-indexed, 40 per page).
- `--limit <n>` / `-n` - cap results emitted.
- `--format json|table|plain` - default `json`.

### Detail

```bash
bun run .agents/skills/novojob-search/cli/src/cli.ts detail <id|url> [--format json|plain]
```

`id` is the numeric offer id from `search` (e.g. `136876`), or a `novojob.com/.../offre-d-emploi/...` URL.

## Usage examples

```bash
# Product roles in Côte d'Ivoire
bun run .agents/skills/novojob-search/cli/src/cli.ts search -q "product manager" --format table

# Director-level roles in Abidjan, last 30 days
bun run .agents/skills/novojob-search/cli/src/cli.ts search -q "directeur" --jobage 30 --format table

# Anything "manager" in Senegal
bun run .agents/skills/novojob-search/cli/src/cli.ts search -q "manager" -c sn --format table

# Full offer
bun run .agents/skills/novojob-search/cli/src/cli.ts detail 136876 --format plain
```

## Output formats

| Format | Best for |
|--------|----------|
| `json` | Default - programmatic use, passing ids to `detail` |
| `table` | Quick scanning |
| `plain` | Reading one offer (`detail`) |

Each result has `id`, `title`, `company`, `location`, `date`, `url`, plus `snippet` (the experience
band, e.g. "Confirmé / Expérimenté (3 à 5 ans)"). Errors go to **stderr** as
`{ "error": "...", "code": "..." }` with exit code `1`.

## Notes

- Coverage checked 2026-11-01: Côte d'Ivoire has hundreds of offers; Senegal had 3; Togo, Cameroon,
  Congo and other country sections were empty, so the CLI offers only `ci` and `sn`.
- Search cards show day and month only ("30 Septembre"); the CLI fills in the year as the most
  recent such date that is not in the future. The detail page's `date` is exact.
- The search is loose ("product" also matches "production"); read titles before ranking.
- Endpoint details and parsing anchors: [url-reference.md](url-reference.md).
