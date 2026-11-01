// Portal-specific inputs for the shared contract and live tests.
export const config = {
  liveQuery: "senior product manager",
  liveArgs: [] as string[],
  detailId: "2db3ef16e449b631779c2abe54c28752",
  fixtures: [
    { match: "/v2/jobs/2db3ef16e449b631779c2abe54c28752", file: "detail.json", contentType: "application/json" },
    { match: "/v2/jobs?", file: "search.json", contentType: "application/json" },
  ],
  env: {} as Record<string, string>,
}
