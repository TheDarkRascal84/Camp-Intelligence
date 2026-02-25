export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  // LLM API configuration - set FORGE_API_URL to your LLM proxy or use OpenAI-compatible endpoint
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? process.env.LLM_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? process.env.OPENAI_API_KEY ?? "",
};

// Warn on startup about missing critical config
if (!ENV.cookieSecret) {
  console.warn("[Config] WARNING: JWT_SECRET is not set. Sessions will be insecure!");
}
if (!ENV.databaseUrl) {
  console.warn("[Config] WARNING: DATABASE_URL is not set. Database features will be unavailable.");
}
