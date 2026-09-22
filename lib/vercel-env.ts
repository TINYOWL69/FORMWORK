// Vercel demo data lives in IndexedDB. Research remains a server operation.
export const env = {
  DB: undefined as D1Database | undefined,
  BUCKET: undefined as R2Bucket | undefined,
  RESEARCH_PROVIDER_URL: process.env.RESEARCH_PROVIDER_URL,
  RESEARCH_PROVIDER_KEY: process.env.RESEARCH_PROVIDER_KEY,
};
