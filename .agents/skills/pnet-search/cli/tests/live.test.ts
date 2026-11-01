// Live smoke test against the real portal. Skipped unless PORTAL_LIVE_TESTS=1,
// so CI stays deterministic; run it by hand after a portal changes its markup:
//   PORTAL_LIVE_TESTS=1 bun test tests/live.test.ts
import { describe, expect, test } from "bun:test"
import { config } from "./portal.config"
import { parseJSON, runCLI } from "./helpers"

const live = process.env.PORTAL_LIVE_TESTS === "1"

describe.skipIf(!live)("live portal", () => {
  test("search returns real results, and detail reads one of them", async () => {
    const r = await runCLI(["search", "-q", config.liveQuery, ...(config.liveArgs ?? []), "--limit", "5"])
    const out = parseJSON<{ results: { id: string; title: string; url: string }[] }>(r)
    expect(out.results.length).toBeGreaterThan(0)
    for (const c of out.results) {
      expect(c.id).toBeTruthy()
      expect(c.title).toBeTruthy()
      expect(c.url).toMatch(/^https:\/\//)
    }
    const d = await runCLI(["detail", out.results[0].id])
    const job = parseJSON<{ description: string | null }>(d)
    expect(job.description).toBeTruthy()
  }, 60000)
})
