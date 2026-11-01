// Portal-specific inputs for the shared contract and live tests.
// The live query is broad on purpose: the portal matches titles only and Rwanda's
// market is small, so "senior product manager" is often empty.
export const config = {
  liveQuery: "manager",
  liveArgs: [] as string[],
  detailId: "graphic-designers-0",
  fixtures: [
    { match: "/job/", file: "detail.html" },
    { match: "/jobs/search-result", file: "search.html" },
  ],
  env: {} as Record<string, string>,
}
