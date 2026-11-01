// The contract each portal.ts fulfils. Identical across the portal CLIs in this fork.
import type { FetchOpts, JobCard, JobDetail } from "./helpers.js"

export interface SearchOpts {
  query: string
  location?: string
  country?: string
  /** Posting age in days; undefined for all postings. */
  jobage?: number
  page: number
  limit?: number
  format: "json" | "table" | "plain"
}

export interface Request {
  url: string
  init?: FetchOpts
}

export interface Portal {
  /** CLI name used in the User-Agent and help, e.g. "pnet-cli". */
  cliName: string
  /** One-line description for --help. */
  summary: string
  /** Optional search flags this portal supports, beyond query/jobage/page/limit/format. */
  flags: { location?: string; country?: string }
  /** Allowed --country values (lowercase) and the default, when the portal is multi-country. */
  countries?: { values: string[]; default: string }
  /** Whether --jobage is applied by the portal itself (true) or only client-side on `date` (false). */
  jobageServerSide: boolean
  examples: string[]
  /** Build the search request(s). */
  searchRequest(opts: SearchOpts): Promise<Request> | Request
  parseSearch(body: string, opts: SearchOpts): JobCard[]
  /** Reduce an id or a portal URL to the canonical id; null when it is not this portal's. */
  normalizeId(input: string): string | null
  detailRequest(id: string): Promise<Request> | Request
  parseDetail(body: string, id: string): JobDetail
}
