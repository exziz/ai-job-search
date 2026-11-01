// Portal-specific inputs for the shared contract and live tests.
export const config = {
  liveQuery: "product manager",
  liveArgs: [] as string[],
  detailId: "2395880",
  fixtures: [
    { match: "/jobs/adverts/", file: "detail.html" },
    { match: "careers24.com/jobs/", file: "search.html" },
  ],
  env: {} as Record<string, string>,
}
