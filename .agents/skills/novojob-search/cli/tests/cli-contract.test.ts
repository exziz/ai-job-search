// The portal-skill contract, checked offline against saved fixtures.
// Identical across the portal CLIs in this fork; portal specifics come from ./portal.config.ts.
import { describe, expect, test } from "bun:test"
import { config } from "./portal.config"
import { parseError, parseJSON, runCLI, runWithFixtures } from "./helpers"

interface Card {
  id: string
  title: string
  company: string | null
  location: string | null
  date: string | null
  url: string
}

describe("argument validation", () => {
  test("a bogus flag exits 1 with a JSON error on stderr", async () => {
    const r = await runCLI(["search", "-q", "manager", "--bogus", "x"])
    expect(r.exitCode).toBe(1)
    expect(r.stdout).toBe("")
    expect(parseError(r).code).toBe("UNKNOWN_FLAG")
  })

  test("search without --query exits 1", async () => {
    const r = await runCLI(["search"])
    expect(r.exitCode).toBe(1)
    expect(parseError(r).code).toBe("NO_QUERY")
  })

  test("an empty --query exits 1", async () => {
    const r = await runCLI(["search", "-q", ""])
    expect(r.exitCode).toBe(1)
  })

  test("a fractional --jobage exits 1", async () => {
    const r = await runCLI(["search", "-q", "manager", "--jobage", "0.5"])
    expect(r.exitCode).toBe(1)
    expect(parseError(r).code).toBe("BAD_ARG")
  })

  test("an unknown --format exits 1", async () => {
    const r = await runCLI(["search", "-q", "manager", "--format", "xml"])
    expect(r.exitCode).toBe(1)
  })

  test("detail without an id exits 1", async () => {
    const r = await runCLI(["detail"])
    expect(r.exitCode).toBe(1)
    expect(parseError(r).code).toBe("NO_ID")
  })

  test("detail rejects a URL on another host", async () => {
    const r = await runCLI(["detail", "https://jobs.lever.co/acme/123456"])
    expect(r.exitCode).toBe(1)
    expect(parseError(r).code).toBe("BAD_ID")
  })

  test("an unknown command exits 1", async () => {
    const r = await runCLI(["frobnicate"])
    expect(r.exitCode).toBe(1)
    expect(parseError(r).code).toBe("BAD_CMD")
  })
})

describe("search output (offline fixture)", () => {
  test("returns the contract shape with populated fields", async () => {
    const { result } = await runWithFixtures(["search", "-q", config.liveQuery], config.fixtures, config.env)
    const out = parseJSON<{ meta: { count: number; page: number }; results: Card[] }>(result)
    expect(out.meta.page).toBe(1)
    expect(out.results.length).toBeGreaterThan(0)
    expect(out.meta.count).toBe(out.results.length)
    for (const c of out.results) {
      expect(c.id).toBeTruthy()
      expect(c.title).toBeTruthy()
      expect(c.title).not.toMatch(/<[a-z/]/i)
      expect(c.url).toMatch(/^https:\/\//)
      for (const key of ["company", "location", "date"] as const) expect(key in c).toBe(true)
    }
    expect(out.results.some((c) => c.company)).toBe(true)
    expect(out.results.some((c) => c.date)).toBe(true)
  })

  test("--limit caps the results", async () => {
    const { result } = await runWithFixtures(["search", "-q", config.liveQuery, "--limit", "2"], config.fixtures, config.env)
    expect(parseJSON<{ results: Card[] }>(result).results.length).toBeLessThanOrEqual(2)
  })

  test("--format table renders a header", async () => {
    const { result } = await runWithFixtures(["search", "-q", config.liveQuery, "--format", "table"], config.fixtures, config.env)
    expect(result.exitCode).toBe(0)
    expect(result.stdout.split("\n")[0]).toContain("TITLE")
  })

  test("the query reaches the request", async () => {
    const { urls } = await runWithFixtures(["search", "-q", "zzqueryzz"], config.fixtures, config.env)
    expect(urls.some((u) => decodeURIComponent(u.replace(/\+/g, " ")).toLowerCase().includes("zzqueryzz"))).toBe(true)
  })
})

describe("detail output (offline fixture)", () => {
  test("returns readable description text", async () => {
    const { result } = await runWithFixtures(["detail", config.detailId], config.fixtures, config.env)
    const job = parseJSON<{ title: string; description: string | null; url: string }>(result)
    expect(job.title).toBeTruthy()
    expect(job.description).toBeTruthy()
    expect(job.description!).not.toMatch(/<\/?(p|div|br|li)\b/i)
    expect(job.description!).not.toMatch(/&(amp|nbsp|lt|gt|#\d+);/)
    expect(job.url).toMatch(/^https:\/\//)
  })
})
