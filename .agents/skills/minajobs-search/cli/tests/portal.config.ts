// Portal-specific inputs for the shared contract and live tests.
export const config = {
  liveQuery: "manager",
  liveArgs: [] as string[],
  detailId: "45570",
  fixtures: [
    { match: "/emplois-stage-recrutement/", file: "detail.html" },
    { match: "/search/", file: "search.html" },
  ],
  env: {} as Record<string, string>,
}
