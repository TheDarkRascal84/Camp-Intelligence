# Camp Intelligence — Code Review & Proxmox Setup Guide

---

## 1. Project Overview

**Camp Intelligence** is a full-stack campsite availability platform built with:

- **Frontend:** React 19, Vite, Tailwind CSS v4, TanStack Query, tRPC, Wouter
- **Backend:** Node.js, Express, tRPC, Drizzle ORM, MySQL 8
- **Intelligence Layer:** ML-style prediction models for cancellation probability, booking urgency, demand heatmaps, and price trends
- **Background Jobs:** BullMQ + Redis for async prediction workers
- **Auth:** JWT session tokens, Manus OAuth (adapter present)
- **Storage:** Manus Forge proxy (needs replacement for local use — see below)

---

## 2. Issues Found & Fixes Applied

### 🔴 Critical (Security)

#### 2.1 `sameSite: "none"` without conditional Secure check
**File:** `server/_core/cookies.ts`
**Problem:** `sameSite: "none"` requires `Secure: true`. On HTTP (local dev), this causes browsers to silently reject the session cookie, breaking all authentication.
**Fix Applied:** Now conditionally sets `sameSite: "lax"` on HTTP and `sameSite: "none"` only when the connection is HTTPS.

#### 2.2 User PII leaked to localStorage
**File:** `client/src/_core/hooks/useAuth.ts`
**Problem:** The `useAuth` hook was writing full user info (name, email, openId) to `localStorage` under the key `manus-runtime-user-info`. This is a Manus platform artifact, unnecessary for your app, and a privacy risk since any JS on the page can read `localStorage`.
**Fix Applied:** Removed the `localStorage.setItem` call entirely.

#### 2.3 Empty JWT_SECRET silently accepted
**File:** `server/_core/env.ts`
**Problem:** If `JWT_SECRET` is not set, the secret falls back to an empty string `""`. All sessions signed with an empty secret are trivially forgeable.
**Fix Applied:** Added a startup warning log. You should also add a hard exit — see recommendation below.

#### 2.4 Hardcoded LLM model and thinking budget
**File:** `server/_core/llm.ts`
**Problem:** Model was hardcoded to `"gemini-2.5-flash"` and a non-standard `thinking.budget_tokens` field was added to every request. The model is gone from local, and the `thinking` field will cause errors on standard OpenAI-compatible APIs.
**Fix Applied:** Model is now configurable via `LLM_MODEL` env var, defaulting to `gpt-4o-mini`. The `thinking` field has been removed.

#### 2.5 LLM fallback URL pointed to Manus servers
**File:** `server/_core/llm.ts`
**Problem:** When `BUILT_IN_FORGE_API_URL` was not set, requests fell back silently to `https://forge.manus.im` which won't work locally.
**Fix Applied:** Fallback now points to `https://api.openai.com` (standard) and is clearly documented in `.env.example`.

---

### 🟡 Medium (Functional Issues)

#### 2.6 Manus-specific Vite plugins included in build
**File:** `vite.config.ts`
**Problem:** `vite-plugin-manus-runtime` and `@builder.io/vite-plugin-jsx-loc` were loaded unconditionally. The Manus plugin communicates with the Manus cloud platform and adds telemetry. The jsx-loc plugin adds metadata to JSX for Manus's agent tools.
**Fix Applied:** Both removed. The debug collector plugin and all `/__manus__/` endpoints have also been removed. The `allowedHosts` no longer includes Manus cloud domains.

#### 2.7 Manus debug collector script injected into HTML
**File:** `client/public/__manus__/debug-collector.js`
**Problem:** This script captured all browser console logs, network requests, and user interactions and sent them to `/__manus__/logs`. Not appropriate outside the Manus environment.
**Fix Applied:** The entire `client/public/__manus__/` directory has been removed.

#### 2.8 `as any` type casts in routers.ts
**File:** `server/routers.ts`
**Problem:** `db.insert(savedSearches).values({...} as any)` suppresses TypeScript type checking on DB inserts, potentially masking schema mismatches.
**Recommendation:** Define a proper `InsertSavedSearch` typed variable and remove the `as any`.

#### 2.9 Storage module tightly coupled to Manus Forge
**File:** `server/storage.ts`
**Problem:** `storagePut` / `storageGet` only work via the Manus Forge proxy. If this is called locally without `BUILT_IN_FORGE_API_URL`, it will throw immediately.
**Recommendation:** For local use, replace with AWS S3 (already a dependency), a local MinIO instance, or simple filesystem storage. See Section 5 for a MinIO setup option.

#### 2.10 `OAUTH_SERVER_URL` dependency for authentication
**File:** `server/_core/sdk.ts`
**Problem:** The entire auth flow depends on Manus OAuth. Without a running `OAUTH_SERVER_URL`, no user can log in.
**Recommendation:** For local testing, you have two options: (A) run a local OAuth2 server like `dex` or `authentik`, or (B) add a local dev bypass — see Section 4.

#### 2.11 Port discovery loop could mask configuration errors
**File:** `server/_core/index.ts`
**Problem:** If port 3000 is taken, the server silently tries 3001–3019. In a container, this means the exposed port and the actual port can diverge silently.
**Recommendation:** In Docker/production, set `PORT` explicitly and remove the port-scan fallback.

---

### 🟢 Low (Code Quality)

#### 2.12 `jsonwebtoken` and `jose` both imported
**Files:** `package.json`, `server/_core/sdk.ts`
**Problem:** Both `jsonwebtoken` and `jose` are present. The code uses `jose` exclusively (correct, as it's the modern ESM-compatible library). `jsonwebtoken` appears to be an unused leftover.
**Recommendation:** Remove `jsonwebtoken` from `package.json`.

#### 2.13 `axios` imported for OAuth client but `fetch` used everywhere else
**File:** `server/_core/sdk.ts`
**Problem:** The OAuth HTTP client uses `axios`, while the rest of the server uses native `fetch`. Minor inconsistency and an extra dependency.
**Recommendation:** Migrate the OAuth calls to `fetch` to remove the `axios` dependency from server code.

#### 2.14 Prediction models use no persistence for warm-up data
**Files:** `server/lib/intelligence/`
**Problem:** The prediction models use heuristics and fall back to default values when there's no historical data. On first boot with an empty DB this is fine, but results will be meaningless until real data accumulates.
**Recommendation:** The existing seed script (`scripts/seed-demo-data.ts`) should be run after first deployment to get meaningful UI state.

#### 2.15 `siteTypes` stored as JSON string in `savedSearches`
**File:** `drizzle/schema.ts` + `server/routers.ts`
**Problem:** `siteTypes` is stored as `text` (a JSON-stringified array). This means you can't query or filter by site type at the DB level.
**Recommendation:** Consider a separate `savedSearchSiteTypes` junction table, or use MySQL JSON column type for better queryability.

---

## 3. Proxmox Setup — Docker Compose (Recommended)

This is the fastest path to running locally on a Proxmox LXC or VM.

### Prerequisites
- Proxmox LXC (Ubuntu 22.04+) or VM with Docker installed
- At least 2 CPU cores, 2GB RAM, 10GB disk

### Step 1: Install Docker on your LXC/VM
```bash
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker
```

### Step 2: Clone / Copy Project
```bash
# If using git
git clone https://your-repo.git /opt/camp-intelligence
cd /opt/camp-intelligence

# Or upload the ZIP and extract
unzip Camp-Intelligence-main.zip -d /opt/camp-intelligence
cd /opt/camp-intelligence
```

### Step 3: Configure Environment
```bash
cp .env.example .env
nano .env   # Fill in JWT_SECRET (required!), LLM key, etc.

# Generate a secure JWT secret:
openssl rand -hex 32
```

### Step 4: Build and Start
```bash
docker compose up -d --build
```

### Step 5: Run Database Migrations (first time only)
```bash
docker compose exec app pnpm run db:push
```

### Step 6: Seed Demo Data (optional but recommended)
```bash
docker compose exec app pnpm tsx scripts/seed-demo-data.ts
```

### Step 7: Access
Open your browser to `http://<proxmox-ip>:3000`

---

## 4. Local Dev Auth Bypass (No OAuth Server)

Since the app requires Manus OAuth to log in, here's a pragmatic local bypass for development. Add this to `server/_core/sdk.ts` inside `authenticateRequest()`:

```typescript
// LOCAL DEV BYPASS — remove before any production use
if (process.env.NODE_ENV === 'development' && process.env.DEV_BYPASS_AUTH === 'true') {
  const devUser = await db.getUserByOpenId('dev-local-user');
  if (devUser) return devUser;
  await db.upsertUser({
    openId: 'dev-local-user',
    name: 'Local Dev User',
    email: 'dev@localhost',
    loginMethod: 'local',
    lastSignedIn: new Date(),
    role: 'admin',
  });
  return (await db.getUserByOpenId('dev-local-user'))!;
}
```

Then add to your `.env`:
```
DEV_BYPASS_AUTH=true
```

---

## 5. Optional: Local File Storage with MinIO (replaces Manus Forge storage)

If your app uses `storagePut` / `storageGet` (image uploads, etc.), run a local MinIO instance:

```bash
# Add to docker-compose.yml services:
#
# minio:
#   image: minio/minio
#   container_name: camp-minio
#   command: server /data --console-address ":9001"
#   ports:
#     - "9000:9000"
#     - "9001:9001"
#   environment:
#     MINIO_ROOT_USER: minioadmin
#     MINIO_ROOT_PASSWORD: minioadmin
#   volumes:
#     - minio_data:/data
#   networks:
#     - campnet
```

Then update `server/storage.ts` to use `@aws-sdk/client-s3` (already a dependency) pointing to `http://minio:9000`.

---

## 6. Recommended Next Steps (Priority Order)

1. **Hard-fail on empty JWT_SECRET** — add `if (!ENV.cookieSecret) { process.exit(1); }` to `server/_core/env.ts`
2. **Implement local auth** — add the dev bypass above and/or wire up a real OAuth2 server (Authentik, Dex, Keycloak)
3. **Replace Manus storage** — swap `server/storage.ts` with local S3/MinIO or filesystem
4. **Remove unused deps** — `jsonwebtoken`, `vite-plugin-manus-runtime`, `@builder.io/vite-plugin-jsx-loc`
5. **Fix `as any` DB inserts** — properly type the `savedSearches` insert in `server/routers.ts`
6. **Run seed data** — populate demo campgrounds and availability for a useful UI on first boot
7. **Set up HTTPS** — use Nginx + Let's Encrypt (or Proxmox's built-in Traefik) in front of the app for cookie security

---

## 7. Files Changed in This Version

| File | Change |
|---|---|
| `vite.config.ts` | Removed Manus plugins, debug collector, Manus allowedHosts |
| `server/_core/env.ts` | Added startup warnings, LLM_API_URL alias, OPENAI_API_KEY alias |
| `server/_core/llm.ts` | Configurable model via LLM_MODEL, removed Manus forge fallback, removed `thinking` field, fixed max_tokens |
| `server/_core/cookies.ts` | Fixed sameSite: conditional lax/none based on HTTPS |
| `client/src/_core/hooks/useAuth.ts` | Removed Manus localStorage write |
| `client/public/__manus__/` | Deleted entirely |
| `.env.example` | New file — all env vars documented |
| `docker-compose.yml` | New file — Proxmox-ready stack (app + MySQL + Redis) |
| `Dockerfile` | New file — multi-stage production build |
| `.dockerignore` | New file |
| `.gitignore` | Added `.manus-logs/` |
