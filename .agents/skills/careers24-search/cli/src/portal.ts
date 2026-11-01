// Careers24 (careers24.com, South Africa). Search returns server-rendered HTML
// job cards (div[data-control="job-card"]); detail pages carry a schema.org
// JobPosting. Ids are the numeric advert ids.
import {
  absUrl,
  clean,
  cleanOrNull,
  CliError,
  extractElement,
  htmlToText,
  jobPostingFromLd,
  normalizeDate,
  type JobCard,
  type JobDetail,
} from "./helpers.js"
import type { Portal, SearchOpts } from "./types.js"

const BASE = "https://www.careers24.com"

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export const portal: Portal = {
  cliName: "careers24-cli",
  summary: "search jobs on Careers24 (careers24.com, South Africa)",
  flags: {
    location: 'Province or city, e.g. "Gauteng", "Western Cape", "Johannesburg", "Cape Town".',
  },
  jobageServerSide: false,
  examples: [
    'bun run src/cli.ts search -q "product manager" --format table',
    'bun run src/cli.ts search -q "head of product" -l "Gauteng" --jobage 14 --format table',
    "bun run src/cli.ts detail 2395880 --format plain",
  ],

  searchRequest(opts: SearchOpts) {
    const kw = slugify(opts.query)
    if (!kw) throw new CliError("--query has no searchable letters or digits", "BAD_ARG")
    let path = "/jobs/"
    if (opts.location) {
      const lc = slugify(opts.location)
      if (!lc) throw new CliError("--location has no searchable letters or digits", "BAD_ARG")
      path += `lc-${lc}/`
    }
    path += `kw-${kw}/`
    return { url: `${BASE}${path}${opts.page > 1 ? `?page=${opts.page}` : ""}` }
  },

  parseSearch(body: string): JobCard[] {
    if (!/id="divSearchResults"/.test(body)) {
      throw new CliError("Careers24 results block not found in the page - the markup may have changed", "PARSE_FAILED")
    }
    const cards: JobCard[] = []
    // One chunk per card, so a malformed card cannot break the rest.
    for (const chunk of body.split(/<div class="job-card"[^>]*data-control="job-card"/).slice(1)) {
      try {
        const id = chunk.match(/^\s*data-id="(\d+)"/)?.[1]
        const link = chunk.match(/<a href="([^"]+)"[^>]*data-control="vacancy-title"[^>]*>([\s\S]*?)<\/a>/)
        if (!id || !link) continue
        const title = clean(link[2])
        if (!title) continue
        const items = [...(chunk.match(/class="col-6 job-card-left">\s*<ul>([\s\S]*?)<\/ul>/)?.[1] ?? "").matchAll(/<li>([\s\S]*?)<\/li>/g)].map(
          (m) => m[1],
        )
        const location = items.find((li) => !/Job Type:|Posted:/.test(li))
        const posted = items.find((li) => /Posted:/.test(li))?.match(/Posted:\s*([0-9]{1,2}\s+[A-Za-z]+\s+\d{4})/)?.[1]
        const company = chunk.match(/<a href="\/now-hiring\/[^"]*"><img[^>]*alt="([^"]*)"/)?.[1]
        cards.push({
          id,
          title,
          company: cleanOrNull(company),
          location: cleanOrNull(location),
          date: normalizeDate(posted),
          url: absUrl(link[1], BASE).split("?")[0],
        })
      } catch {
        // Skip a malformed card.
      }
    }
    return cards
  },

  normalizeId(input: string): string | null {
    const s = input.trim()
    if (/^\d{5,}$/.test(s)) return s
    if (/^https?:\/\//i.test(s) || /^www\./i.test(s)) {
      let u: URL
      try {
        u = new URL(/^https?:/i.test(s) ? s : `https://${s}`)
      } catch {
        return null
      }
      if (!/(^|\.)careers24\.com$/i.test(u.hostname)) return null
      return u.pathname.match(/\/jobs\/adverts\/(\d+)/)?.[1] ?? null
    }
    return null
  },

  detailRequest(id: string) {
    // Careers24 resolves the advert by its number; the slug after it is cosmetic.
    return { url: `${BASE}/jobs/adverts/${id}-x/` }
  },

  parseDetail(body: string, id: string): JobDetail {
    const ld = jobPostingFromLd(body)
    const canonical = body.match(/<link rel="canonical" href="([^"]+)"/)?.[1]
    return {
      id,
      title: ld?.title ?? cleanOrNull(body.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1]) ?? "(untitled)",
      company: ld?.company ?? null,
      location: ld?.location ?? null,
      date: ld?.date ?? null,
      url: canonical ? absUrl(canonical, BASE) : ld?.url ?? `${BASE}/jobs/adverts/${id}/`,
      // The JSON-LD description is a truncated teaser; the page's v-descrip block has the full text.
      description: htmlToText(extractElement(body, "div", 'class="v-descrip"')) ?? ld?.description ?? null,
      employmentType: ld?.employmentType ?? null,
      deadline: ld?.deadline ?? null,
      applyUrl: null,
    }
  },
}
