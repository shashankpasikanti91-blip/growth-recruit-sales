# n8n Integration Guide

This guide covers how to set up n8n, import the bundled workflows, and configure them to work with the platform.

---

## What is n8n?

n8n is the automation backbone of this platform. It handles:
- Importing candidates and leads from external sources (LinkedIn, Apollo, etc.)
- Triggering AI screening after a candidate is created
- Dispatching outreach emails and LinkedIn messages
- Enriching leads and running auto-outreach for qualified leads

n8n **never accesses the database directly**. All interactions go through the NestJS backend API using authenticated webhook endpoints.

---

## Accessing n8n

After `docker compose up`, n8n is available at:

```
http://localhost:5678
```

First-run setup will ask you to create an owner account. Use a strong password and keep it separate from your platform admin credentials.

---

## Configure Variables in n8n

n8n has a Variables feature (`Settings → Variables`) where you can store values used across all workflows. Set these before importing any workflow:

| Variable Name | Where to find it | Example |
|---------------|-----------------|---------|
| `BACKEND_URL` | Internal Docker URL | `http://backend:4000` |
| `N8N_WEBHOOK_SECRET` | Your `.env` → `N8N_WEBHOOK_SECRET` | `your-secret-here` |
| `BACKEND_SERVICE_TOKEN` | Generate once (see below) | `eyJhbGci...` |
| `APOLLO_API_KEY` | Apollo.io dashboard | `sk_...` |
| `CLEARBIT_KEY` | Clearbit dashboard | `sk_...` |
| `LINKEDIN_TOKEN` | LinkedIn App OAuth | `AQVN...` |
| `LINKEDIN_SEARCH_URL` | LinkedIn search API URL | `https://...` |
| `LINKEDIN_MESSAGING_URL` | LinkedIn messaging API URL | `https://...` |

### Generating a Backend Service Token

The service token is a long-lived JWT used by n8n to call authenticated backend endpoints (e.g., fetching open jobs). Generate it by logging in as admin and copying the access token, or better — create a dedicated service account:

```bash
# Via Swagger UI at http://localhost:4000/api/docs
# POST /api/v1/auth/login
{
  "email": "admin@srp-ai-labs.com",
  "password": "Admin@123",
  "tenantSlug": "srp-ai-labs"
}
# Copy the accessToken from the response
```

> **Note:** Access tokens expire in 15 minutes. For a permanent service token, extend the `JWT_ACCESS_EXPIRY` for a service-only account, or implement a long-lived token mechanism.

---

## Importing Workflows

1. In n8n, go to **Workflows** → **Import from File**
2. Import each JSON file from `n8n/workflows/` in order:
   - `01-candidate-import.json`
   - `02-lead-import.json`
   - `03-auto-screening.json`
   - `04-outreach-sequence.json`
   - `05-lead-enrichment.json`
3. After importing, open each workflow and click **Activate** (toggle in top-right)

---

## Workflow Reference

### 01 — Candidate Import

**Trigger:** Schedule (every 6 hours)

**What it does:**
1. Calls your configured LinkedIn or Indeed search endpoint
2. Normalises the response into a flat candidate object
3. POSTs to `POST /api/v1/webhooks/candidate-imported`

**Required variables:** `LINKEDIN_SEARCH_URL`, `LINKEDIN_TOKEN`

**Backend handler:** `WebhooksController.candidateImported()` → creates/updates Candidate record → emits `candidate.imported`

---

### 02 — Lead Import

**Trigger:** Schedule (every 12 hours) OR Webhook (CSV upload)

**What it does:**
1. Fetches leads from Apollo.io people search
2. Normalises into lead + company payload
3. POSTs to `POST /api/v1/webhooks/lead-imported`

**Required variables:** `APOLLO_API_KEY`

**Backend handler:** `WebhooksController.leadImported()` → creates Lead + Company records → emits `lead.imported`

---

### 03 — Auto AI Screening

**Trigger:** Webhook (`/webhook/on-candidate-imported`) — called by the backend after a candidate is imported

**What it does:**
1. Waits 2 seconds for DB commit
2. Fetches all open jobs for the tenant
3. Creates a screening request for each matching job
4. POSTs to `POST /api/v1/webhooks/trigger-screening`

**Backend handler:** Runs the full 6-step AI screening pipeline → saves `AiAnalysisResult`, `Scorecard` → updates `Application.stage`

**How to wire up the backend → n8n trigger:**

In your `.env`, set:
```
N8N_BASE_URL=http://n8n:5678
```

Then in the backend `candidates.service.ts` (or via `EventEmitter2` listener in a dedicated service), emit:
```typescript
await this.httpService.post(
  `${n8nUrl}/webhook/on-candidate-imported`,
  { candidateId: candidate.id },
  { headers: { 'X-N8N-Secret': secret } }
).toPromise();
```

Or configure n8n to poll the backend for new candidates instead of using the push model.

---

### 04 — Outreach Sequence Executor

**Trigger:** Schedule (every 30 minutes)

**What it does:**
1. Fetches up to 10 `PENDING` outreach messages from the backend
2. Routes by channel: Email → SMTP node, LinkedIn → HTTP Request
3. Marks each message `SENT` via `PATCH /api/v1/webhooks/message-status`

**Required nodes config:**
- **Email (SMTP):** Add SMTP credentials in n8n `Settings → Credentials → SMTP`
- **LinkedIn:** Configure your LinkedIn OAuth app credentials

---

### 05 — Lead Enrichment & Auto-Outreach

**Trigger:** Webhook (`/webhook/on-lead-imported`)

**What it does:**
1. Calls `POST /api/v1/webhooks/score-lead` to run AI ICP scoring
2. If score ≥ 70: enriches company via Clearbit, then triggers 3-step outreach sequence
3. If score < 70: skips silently

**Required variables:** `CLEARBIT_KEY`

---

## Webhook Security

Every endpoint under `/api/v1/webhooks/` requires the `X-N8N-Secret` header. The backend verifies it against `N8N_WEBHOOK_SECRET` from the environment. If the header is missing or invalid, the request is rejected with `401 Unauthorized`.

Always set n8n variables to match `.env`:
```
# .env
N8N_WEBHOOK_SECRET=my-super-secret-32-chars

# n8n variable
N8N_WEBHOOK_SECRET = my-super-secret-32-chars
```

---

## Testing Workflows Manually

You can test any webhook endpoint using the Swagger UI at `http://localhost:4000/api/docs`:

1. Authenticate via `POST /auth/login`
2. Click **Authorize** and paste the JWT
3. Call any `/webhooks/*` endpoint directly

Or use curl:

```bash
# Test trigger-screening manually
curl -X POST http://localhost:4000/api/v1/webhooks/trigger-screening \
  -H "X-N8N-Secret: your-secret-here" \
  -H "Content-Type: application/json" \
  -d '{"candidateId": "<uuid>", "jobId": "<uuid>"}'
```

---

## Troubleshooting

| Issue | Solution |
|-------|---------|
| Workflow can't reach backend | Use `http://backend:4000`, not `http://localhost:4000` — both are on the same Docker network |
| `401 Unauthorized` on webhook | Check `N8N_WEBHOOK_SECRET` matches exactly between n8n variable and `.env` |
| SMTP node fails | Verify SMTP credentials in n8n are active; test with a simple email workflow first |
| Lead scoring returns 0 | Ensure the tenant has an active `IcpProfile` — create one via the backend API first |
| n8n workflows deactivate on restart | This is a Docker volume issue — ensure `n8n_data` volume is persisted |
| Candidate not found after import | Add a longer wait to Workflow 03 (increase from 2s to 5s) |
