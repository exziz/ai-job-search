// Novojob (novojob.com), French-language job board for West Africa. A Joomla
// site: search is /<country>/offres-d-emploi/<keywords>?start=<offset>, one
// <li class="separator-bot"> per result. Detail pages carry a schema.org
// JobPosting. Ids are Novojob's numeric offer ids, which are global: the
// detail URL resolves (via redirect) whatever country prefix it carries.
import { absUrl, clean, cleanOrNull, CliError, dayMonthToIso, jobPostingFromLd, type JobCard, type JobDetail } from "./helpers.js"
import type { Portal, SearchOpts } from "./types.js"

const BASE = "https://www.novojob.com"
const PAGE_SIZE = 40

const COUNTRIES: Record<string, string> = {
  ci: "cote-d-ivoire",
  sn: "senegal",
}

/** Novojob prefixes some titles with ": " (an empty reference field). */
function tidyTitle(raw: string): string {
  return clean(raw).replace(/^[\s:–—-]+/, "").trim()
}

export const portal: Portal = {
  cliName: "novojob-cli",
  summary: "search jobs on Novojob (novojob.com) in Côte d'Ivoire and Senegal",
  flags: {
    country: "ci (Côte d'Ivoire, default) | sn (Senegal).",
  },
  countries: { values: Object.keys(COUNTRIES), default: "ci" },
  jobageServerSide: false,
  examples: [
    'bun run src/cli.ts search -q "product manager" --format table',
    'bun run src/cli.ts search -q "directeur" -c ci --jobage 30 --format table',
    'bun run src/cli.ts search -q "manager" -c sn --format table',
    "bun run src/cli.ts detail 136876 --format plain",
  ],

  searchRequest(opts: SearchOpts) {
    const country = COUNTRIES[opts.country ?? "ci"]
    const params = new URLSearchParams()
    if (opts.page > 1) params.set("start", String((opts.page - 1) * PAGE_SIZE))
    const qs = params.toString()
    return { url: `${BASE}/${country}/offres-d-emploi/${encodeURIComponent(opts.query)}${qs ? `?${qs}` : ""}` }
  },

  parseSearch(body: string): JobCard[] {
    if (!/data-search-result/.test(body)) {
      throw new CliError("Novojob results list not found in the page - the markup may have changed", "PARSE_FAILED")
    }
    const today = new Date()
    const cards: JobCard[] = []
    for (const chunk of body.split(/<li class="separator-bot">/).slice(1)) {
      try {
        // The share menu at the top of each card is commented out; parse the visible card only.
        const card = chunk.replace(/<!--[\s\S]*?-->/g, "")
        const link = card.match(/<a title="[^"]*" href="([^"]+\/(\d+)-[^"]*)">\s*<h2 class="ellipsis row-fluid">([\s\S]*?)<\/h2>/)
        if (!link) continue
        const title = tidyTitle(link[3])
        if (!title) continue
        const company = card.match(/<div class="contact">[\s\S]*?<span>([\s\S]*?)<\/span>/)?.[1]
        const location = card.match(/fa-map-marker icon-left"><\/i>([\s\S]*?)<\/span>/)?.[1]
        const posted = card.match(/fa-clock-o icon-left"><\/i>\s*([^<]+)</)?.[1]
        const level = card.match(/fa-bookmark icon-left"><\/i>([\s\S]*?)<\/span>\s*<\/div>/)?.[1]
        cards.push({
          id: link[2],
          title,
          company: cleanOrNull(company),
          location: cleanOrNull(location),
          // "30 Septembre": no year on the card, so the latest such date not in the future.
          date: posted ? dayMonthToIso(clean(posted), today) : null,
          url: absUrl(link[1], BASE),
          snippet: cleanOrNull(level),
        })
      } catch {
        // Skip a malformed card.
      }
    }
    // Sponsored cards can repeat a result; keep the first of each id.
    const seen = new Set<string>()
    return cards.filter((c) => {
      if (seen.has(c.id)) return false
      seen.add(c.id)
      return true
    })
  },

  normalizeId(input: string): string | null {
    const s = input.trim()
    if (/^\d{4,}$/.test(s)) return s
    if (/^https?:\/\//i.test(s) || /^www\./i.test(s)) {
      let u: URL
      try {
        u = new URL(/^https?:/i.test(s) ? s : `https://${s}`)
      } catch {
        return null
      }
      if (!/(^|\.)novojob\.com$/i.test(u.hostname)) return null
      return u.pathname.match(/\/offre-d-emploi\/(?:[^/]+\/)?(\d{4,})(?:-[^/]*)?\/?$/)?.[1] ?? null
    }
    return null
  },

  detailRequest(id: string) {
    return { url: `${BASE}/cote-d-ivoire/offres-d-emploi/offre-d-emploi/cote-d-ivoire/${id}` }
  },

  parseDetail(body: string, id: string): JobDetail {
    const ld = jobPostingFromLd(body)
    if (!ld) throw new CliError("Novojob posting data not found - the offer may have been removed or the markup changed", "PARSE_FAILED")
    const canonical = body.match(/<link[^>]*rel="canonical"[^>]*href="([^"]+)"/)?.[1]
    return {
      id,
      title: ld.title ? tidyTitle(ld.title) : "(untitled)",
      company: ld.company ?? null,
      location: ld.location ?? null,
      date: ld.date ?? null,
      url: canonical ? absUrl(canonical, BASE) : ld.url ?? `${BASE}/cote-d-ivoire/offres-d-emploi/offre-d-emploi/cote-d-ivoire/${id}`,
      description: ld.description ?? null,
      employmentType: ld.employmentType ?? null,
      deadline: ld.deadline ?? null,
      applyUrl: null,
    }
  },
}
