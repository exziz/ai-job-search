// MinaJobs (cameroun.minajobs.net), Cameroon's job board. A SimpleJobScript
// site: GET /search/<keywords>/ returns up to 100 results on one page (the
// www host 500s on it; the cameroun subdomain answers). Cards carry the age as
// "Publiée depuis N" (days). Detail pages have no JSON-LD. Ids are the numeric
// offer ids.
import { absUrl, clean, cleanOrNull, CliError, extractElement, htmlToText, normalizeDate, type JobCard, type JobDetail } from "./helpers.js"
import type { Portal, SearchOpts } from "./types.js"

const BASE = "https://cameroun.minajobs.net"
/** The portal returns everything on one page; --page slices it client-side. */
const PAGE_SIZE = 25

/** "yaounde-region-centre-cameroun" -> "Yaounde, Centre". */
export function humanLocation(slug: string | null | undefined): string | null {
  const s = clean(slug)
  if (!s) return null
  if (!/^[a-z0-9-]+$/i.test(s)) return s
  const words = s
    .replace(/-cameroun$|-cameroon$/i, "")
    .split("-region-")
    .map((part) => part.split("-").filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(" "))
    .filter(Boolean)
  return words.join(", ") || null
}

function daysAgo(n: number, today: Date): string {
  return new Date(today.getTime() - n * 86400000).toISOString().slice(0, 10)
}

export const portal: Portal = {
  cliName: "minajobs-cli",
  summary: "search jobs on MinaJobs (cameroun.minajobs.net, Cameroon)",
  flags: {},
  jobageServerSide: false,
  examples: [
    'bun run src/cli.ts search -q "manager" --format table',
    'bun run src/cli.ts search -q "directeur" --jobage 14 --format table',
    "bun run src/cli.ts detail 45570 --format plain",
  ],

  searchRequest(opts: SearchOpts) {
    // The path form tolerates spaces as %20; slashes would change the route.
    const kw = encodeURIComponent(opts.query.replace(/\//g, " ").trim())
    return { url: `${BASE}/search/${kw}/` }
  },

  parseSearch(body: string, opts: SearchOpts): JobCard[] {
    if (!/id="job-listings"|class="listings-block"/.test(body)) {
      // An empty search renders the listing shell too; its absence is markup drift.
      throw new CliError("MinaJobs result list not found in the page - the markup may have changed", "PARSE_FAILED")
    }
    const today = new Date()
    const cards: JobCard[] = []
    const seen = new Set<string>()
    // Each result renders twice (mobile + desktop); parse the desktop blocks only.
    for (const chunk of body.split(/<div class="desktop-listing-content">/).slice(1)) {
      try {
        const block = chunk.split(/<\/li>/)[0]
        const link = block.match(/<a href="(\/emplois-stage-recrutement\/(\d+)\/[^"]*)"\s*>\s*<div class="listing-title">([\s\S]*?)<\/div>/)
        if (!link || seen.has(link[2])) continue
        const title = clean(link[3])
        if (!title) continue
        const spans = [...block.matchAll(/<span class="opaque"[^>]*>([\s\S]*?)<\/span>/g)].map((m) => clean(m[1]))
        const age = block.match(/Publi[ée]+e? depuis\s*(\d+)/i)?.[1]
        seen.add(link[2])
        cards.push({
          id: link[2],
          title,
          company: spans[0] || null,
          location: humanLocation(spans[1]),
          date: age !== undefined ? daysAgo(Number(age), today) : null,
          url: absUrl(link[1], BASE),
        })
      } catch {
        // Skip a malformed card.
      }
    }
    return cards.slice((opts.page - 1) * PAGE_SIZE, opts.page * PAGE_SIZE)
  },

  normalizeId(input: string): string | null {
    const s = input.trim()
    if (/^\d{3,}$/.test(s)) return s
    if (/^https?:\/\//i.test(s) || /^www\./i.test(s) || /^cameroun\./i.test(s)) {
      let u: URL
      try {
        u = new URL(/^https?:/i.test(s) ? s : `https://${s}`)
      } catch {
        return null
      }
      if (!/(^|\.)minajobs\.net$/i.test(u.hostname)) return null
      return u.pathname.match(/^\/emplois-stage-recrutement\/(\d+)(?:\/|$)/)?.[1] ?? null
    }
    return null
  },

  detailRequest(id: string) {
    // The slug after the id is cosmetic.
    return { url: `${BASE}/emplois-stage-recrutement/${id}/offre` }
  },

  parseDetail(body: string, id: string): JobDetail {
    const title = cleanOrNull(body.match(/<h4 class="job-detail-headline"\s*>([\s\S]*?)<\/h4>/)?.[1])
    if (!title) throw new CliError("MinaJobs offer not found - it may have been removed or the markup changed", "PARSE_FAILED")
    const icons = extractElement(body, "div", 'class="job-detail-icons') ?? ""
    const location = icons.match(/Localisation\s*:\s*([^<]+)/)?.[1]
    const published = icons.match(/Date de publication\s*:\s*(\d{2}\/\d{2}\/\d{4})/)?.[1]
    const category = icons.match(/Cat[ée]gorie\s*:\s*([^<]+)/)?.[1]
    const salary = icons.match(/Salaire\s*:\s*([^<]+)/)?.[1]
    // The share link's title reads "<job title> at <company>".
    const company = body.match(/shareArticle\?[^"]*?&amp;title=[^"]*? at ([^"&]+?)&amp;/)?.[1]
    const description = htmlToText(extractElement(body, "div", 'class="detail-font"'))
    const salaryLine = salary && clean(salary) ? `Salaire : ${clean(salary)}` : null
    return {
      id,
      title,
      company: cleanOrNull(company),
      location: humanLocation(location),
      date: normalizeDate(published),
      url: `${BASE}/emplois-stage-recrutement/${id}/offre`,
      description: description ? (salaryLine ? `${salaryLine}\n\n${description}` : description) : null,
      employmentType: category ? clean(category).toLowerCase() || null : null,
      deadline: null,
      applyUrl: null,
    }
  },
}
