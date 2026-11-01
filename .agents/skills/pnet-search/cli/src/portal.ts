// PNet (pnet.co.za, South Africa). Search pages embed the result list as JSON in
// window.__PRELOADED_STATE__["app-unifiedResultlist"]; detail pages carry a
// schema.org JobPosting. Detail pages answer only on the full slug URL (the
// bare /jobs--<number>-inline.html form returns 403), so the id is the slug.
import { CliError, absUrl, cleanOrNull, jobPostingFromLd, type JobCard, type JobDetail } from "./helpers.js"
import type { Portal, SearchOpts } from "./types.js"

const BASE = "https://www.pnet.co.za"

/** "Senior Product Manager" -> "senior-product-manager", the path form PNet's own search uses. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

interface PnetItem {
  id?: number | string
  title?: string
  url?: string
  location?: string
  companyName?: string
  datePosted?: string
  publishToDate?: string
  textSnippet?: string
}

function stateItems(html: string): PnetItem[] {
  const m = html.match(/window\.__PRELOADED_STATE__\["app-unifiedResultlist"\]\s*=\s*(\{[\s\S]*?\});\s*<\/script>/)
  if (!m) {
    // A page with no result-list state is markup drift or a block page, not "zero jobs".
    if (/Access denied/i.test(html)) throw new CliError("PNet refused the request (access denied page)", "BLOCKED")
    throw new CliError("PNet result-list data not found in the page - the markup may have changed", "PARSE_FAILED")
  }
  let state: { searchResults?: { items?: PnetItem[] } }
  try {
    state = JSON.parse(m[1])
  } catch {
    throw new CliError("PNet result-list data is not valid JSON", "PARSE_FAILED")
  }
  return state.searchResults?.items ?? []
}

/** Slug id ("Product-Manager-Cape-Town-Acme--4298284") from a listing URL. */
function slugFromUrl(url: string): string | null {
  return url.match(/\/jobs--(.+?--\d+)-inline\.html/)?.[1] ?? null
}

export const portal: Portal = {
  cliName: "pnet-cli",
  summary: "search jobs on PNet (pnet.co.za, South Africa)",
  flags: {
    location: 'City or area, e.g. "Johannesburg", "Cape Town", "Sandton", "Durban".',
  },
  jobageServerSide: true,
  examples: [
    'bun run src/cli.ts search -q "senior product manager" --format table',
    'bun run src/cli.ts search -q "head of product" -l "Johannesburg" --jobage 7 --format table',
    "bun run src/cli.ts detail Product-Manager-Cape-Town-Takealot-Group-Pty-Ltd--4298284 --format plain",
  ],

  searchRequest(opts: SearchOpts) {
    const query = slugify(opts.query)
    if (!query) throw new CliError("--query has no searchable letters or digits", "BAD_ARG")
    let path = `/jobs/${query}`
    if (opts.location) {
      const loc = slugify(opts.location)
      if (!loc) throw new CliError("--location has no searchable letters or digits", "BAD_ARG")
      path += `/in-${loc}`
    }
    const params = new URLSearchParams()
    // PNet's age facet offers only "new" (1 day) and "last week" (7 days);
    // longer windows fetch everything and the CLI filters on datePosted.
    if (opts.jobage !== undefined && opts.jobage <= 7) params.set("ag", opts.jobage <= 1 ? "age_1" : "age_7")
    if (opts.page > 1) params.set("page", String(opts.page))
    const qs = params.toString()
    return { url: `${BASE}${path}${qs ? `?${qs}` : ""}` }
  },

  parseSearch(body: string): JobCard[] {
    const cards: JobCard[] = []
    for (const item of stateItems(body)) {
      try {
        const url = item.url ? absUrl(item.url, BASE).split("?")[0] : null
        const id = url ? slugFromUrl(url) : null
        const title = cleanOrNull(item.title)
        if (!id || !title || !url) continue
        cards.push({
          id,
          title,
          company: cleanOrNull(item.companyName),
          location: cleanOrNull(item.location),
          date: item.datePosted ?? null,
          url,
          deadline: item.publishToDate ? item.publishToDate.slice(0, 10) : null,
          snippet: cleanOrNull(item.textSnippet),
        })
      } catch {
        // One malformed item never breaks the rest.
      }
    }
    return cards
  },

  normalizeId(input: string): string | null {
    const s = input.trim()
    if (/^https?:\/\//i.test(s) || /^www\./i.test(s)) {
      let u: URL
      try {
        u = new URL(/^https?:/i.test(s) ? s : `https://${s}`)
      } catch {
        return null
      }
      if (!/(^|\.)pnet\.co\.za$/i.test(u.hostname)) return null
      return slugFromUrl(u.pathname)
    }
    // A slug id as printed by search.
    return /^[A-Za-z0-9-]+--\d+$/.test(s) ? s : null
  },

  detailRequest(id: string) {
    return { url: `${BASE}/jobs--${id}-inline.html` }
  },

  parseDetail(body: string, id: string): JobDetail {
    const ld = jobPostingFromLd(body)
    const title = ld?.title ?? cleanOrNull(body.match(/<title>([^<]*)<\/title>/i)?.[1]?.split(" - Job with")[0])
    if (!ld && /Access denied/i.test(body)) throw new CliError("PNet refused the request (access denied page)", "BLOCKED")
    return {
      id,
      title: title ?? "(untitled)",
      company: ld?.company ?? null,
      location: ld?.location ?? null,
      date: ld?.date ?? null,
      url: `${BASE}/jobs--${id}-inline.html`,
      description: ld?.description ?? null,
      employmentType: ld?.employmentType ?? null,
      deadline: ld?.deadline ?? null,
      applyUrl: null,
    }
  },
}
