// MyCareersFuture (mycareersfuture.gov.sg), Singapore's government job portal.
// Public JSON API at api.mycareersfuture.gov.sg - no key needed, no robots.txt
// on the API host. Ids are the 32-hex-character job uuids.
import { CliError, cleanOrNull, htmlToText, type JobCard, type JobDetail } from "./helpers.js"
import type { Portal, SearchOpts } from "./types.js"

const API = "https://api.mycareersfuture.gov.sg/v2/jobs"
const PAGE_SIZE = 20

interface McfJob {
  uuid?: string
  title?: string
  description?: string
  postedCompany?: { name?: string } | null
  hiringCompany?: { name?: string } | null
  address?: {
    isOverseas?: boolean
    overseasCountry?: string | null
    districts?: { location?: string; region?: string }[]
    street?: string | null
    building?: string | null
  } | null
  metadata?: { newPostingDate?: string; originalPostingDate?: string; expiryDate?: string; jobDetailsUrl?: string }
  salary?: { minimum?: number; maximum?: number; type?: { salaryType?: string } } | null
  employmentTypes?: { employmentType?: string }[]
  positionLevels?: { position?: string }[]
  minimumYearsExperience?: number | null
}

function location(job: McfJob): string | null {
  const a = job.address
  if (!a) return null
  if (a.isOverseas) return cleanOrNull(a.overseasCountry ?? "Overseas")
  const region = a.districts?.find((d) => d.region)?.region
  return region ? `${region}, Singapore` : "Singapore"
}

function salary(job: McfJob): string | null {
  const s = job.salary
  if (!s || (s.minimum == null && s.maximum == null)) return null
  const range = s.minimum != null && s.maximum != null && s.minimum !== s.maximum ? `${s.minimum}-${s.maximum}` : String(s.maximum ?? s.minimum)
  return `SGD ${range}${s.type?.salaryType ? ` ${s.type.salaryType}` : ""}`
}

function toCard(job: McfJob): JobCard | null {
  const id = job.uuid
  const title = cleanOrNull(job.title)
  if (!id || !title) return null
  return {
    id,
    title,
    company: cleanOrNull(job.hiringCompany?.name ?? job.postedCompany?.name),
    location: location(job),
    date: job.metadata?.newPostingDate ?? job.metadata?.originalPostingDate ?? null,
    url: job.metadata?.jobDetailsUrl ?? `https://www.mycareersfuture.gov.sg/job/${id}`,
    deadline: job.metadata?.expiryDate ?? null,
    salary: salary(job),
  }
}

function parseJson<T>(body: string): T {
  try {
    return JSON.parse(body) as T
  } catch {
    throw new CliError("MyCareersFuture returned a response that is not JSON - the API may have changed", "PARSE_FAILED")
  }
}

export const portal: Portal = {
  cliName: "mycareersfuture-cli",
  summary: "search jobs on MyCareersFuture (mycareersfuture.gov.sg, Singapore's government job portal)",
  flags: {},
  jobageServerSide: false,
  examples: [
    'bun run src/cli.ts search -q "senior product manager" --format table',
    'bun run src/cli.ts search -q "head of growth" --jobage 14 --format table',
    "bun run src/cli.ts detail 2db3ef16e449b631779c2abe54c28752 --format plain",
  ],

  searchRequest(opts: SearchOpts) {
    const params = new URLSearchParams({ search: opts.query, limit: String(PAGE_SIZE), page: String(opts.page - 1) })
    return { url: `${API}?${params.toString()}`, init: { accept: "application/json" } }
  },

  parseSearch(body: string): JobCard[] {
    const data = parseJson<{ results?: McfJob[] }>(body)
    if (!Array.isArray(data.results)) throw new CliError("MyCareersFuture response has no results array", "PARSE_FAILED")
    const cards: JobCard[] = []
    for (const job of data.results) {
      try {
        const card = toCard(job)
        if (card) cards.push(card)
      } catch {
        // One malformed record never breaks the rest.
      }
    }
    return cards
  },

  normalizeId(input: string): string | null {
    const s = input.trim()
    if (/^[0-9a-f]{32}$/i.test(s)) return s.toLowerCase()
    if (/^https?:\/\//i.test(s) || /^www\./i.test(s)) {
      let u: URL
      try {
        u = new URL(/^https?:/i.test(s) ? s : `https://${s}`)
      } catch {
        return null
      }
      if (!/(^|\.)mycareersfuture\.gov\.sg$/i.test(u.hostname)) return null
      return u.pathname.match(/([0-9a-f]{32})\/?$/i)?.[1]?.toLowerCase() ?? null
    }
    return null
  },

  detailRequest(id: string) {
    return { url: `${API}/${id}`, init: { accept: "application/json" } }
  },

  parseDetail(body: string, id: string): JobDetail {
    const job = parseJson<McfJob>(body)
    const card = toCard({ ...job, uuid: job.uuid ?? id })
    if (!card) throw new CliError("MyCareersFuture job record has no title", "PARSE_FAILED")
    const level = job.positionLevels?.map((p) => p.position).filter(Boolean).join(", ")
    const years = job.minimumYearsExperience != null ? `${job.minimumYearsExperience}+ years experience` : null
    const header = [level ? `Level: ${level}` : null, years, card.salary ? `Salary: ${card.salary}` : null].filter(Boolean).join("\n")
    const text = htmlToText(job.description)
    return {
      ...card,
      description: text ? (header ? `${header}\n\n${text}` : text) : null,
      employmentType: job.employmentTypes?.map((e) => e.employmentType).filter(Boolean).join(", ").toLowerCase() || null,
      deadline: card.deadline ?? null,
      applyUrl: card.url,
    }
  },
}
