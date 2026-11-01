// Portal-specific inputs for the shared contract and live tests.
export const config = {
  liveQuery: "product manager",
  liveArgs: [] as string[],
  detailId: "head-of-product-development-and-diversification-ktda-holdings",
  fixtures: [
    { match: "/job/", file: "detail.html" },
    { match: "feed=rss2", file: "search.xml", contentType: "application/rss+xml" },
  ],
  env: {} as Record<string, string>,
}
