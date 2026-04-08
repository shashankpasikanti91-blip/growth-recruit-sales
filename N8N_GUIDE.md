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

n8n is already running in production at:

```
https://n8n.srpailabs.com
```

Log in with your n8n owner account. If you haven't set one up, go to the URL above and follow the first-run setup wizard.

---

## Configure Variables in n8n

n8n has a Variables feature (`Settings → Variables`) where you can store values used across all workflows. Set these before importing any workflow:

| Variable Name | Where to find it | Production Value |
|---------------|-----------------|---------|
| `BACKEND_URL` | Server host → backend port | `http://host.docker.internal:8020` |
| `N8N_WEBHOOK_SECRET` | Server `.env` → `N8N_WEBHOOK_SECRET` | `srp_n8n_growth_wh_2026` |
| `BACKEND_SERVICE_TOKEN` | Generate via login (see below) | `eyJhbGci...` |
| `APOLLO_API_KEY` | Apollo.io dashboard | `sk_...` |
| `CLEARBIT_KEY` | Clearbit dashboard | `sk_...` |
| `LINKEDIN_TOKEN` | LinkedIn App OAuth | `AQVN...` |
| `LINKEDIN_SEARCH_URL` | LinkedIn search API URL | `https://...` |
| `LINKEDIN_MESSAGING_URL` | LinkedIn messaging API URL | `https://...` |

### Generating a Backend Service Token

The service token is a long-lived JWT used by n8n to call authenticated backend endpoints. Generate one by logging in as the platform owner:

```bash
curl -X POST https://growth.srpailabs.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "pasikantishashank24@gmail.com", "password": "SRP@Owner2026!"}'
# Copy the accessToken from the response and set it as BACKEND_SERVICE_TOKEN in n8n
```

Or use the Swagger UI at `https://growth.srpailabs.com/api/v1/docs` → `POST /auth/login` → Authorize → copy token.

> **Note:** Access tokens expire in 15 minutes. For n8n workflows that run on a schedule, use the `POST /auth/login` node at the start of each workflow to refresh the token before making backend calls.

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

The backend is already configured to call n8n. In the server `.env`:
```
N8N_BASE_URL=http://host.docker.internal:5678
N8N_WEBHOOK_SECRET=srp_n8n_growth_wh_2026
```

The n8n webhook URL for this workflow is:
```
https://n8n.srpailabs.com/webhook/on-candidate-imported
```

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

The production secret is already set. In n8n, set the variable `N8N_WEBHOOK_SECRET` to match:
```
N8N_WEBHOOK_SECRET = srp_n8n_growth_wh_2026
```

---

## Testing Workflows Manually

You can test any webhook endpoint using the Swagger UI at `https://growth.srpailabs.com/api/v1/docs`:

1. Authenticate via `POST /auth/login`
2. Click **Authorize** and paste the JWT
3. Call any `/webhooks/*` endpoint directly

Or use curl:

```bash
# Test trigger-screening manually
curl -X POST https://growth.srpailabs.com/api/v1/webhooks/trigger-screening \
  -H "X-N8N-Secret: srp_n8n_growth_wh_2026" \
  -H "Content-Type: application/json" \
  -d '{"candidateId": "<uuid>", "jobId": "<uuid>"}'
```

---

## Troubleshooting

| Issue | Solution |
|-------|---------|
| Workflow can't reach backend | Use `http://host.docker.internal:8020` as the backend URL — n8n runs on the host network, not inside the growth Docker network |
| `401 Unauthorized` on webhook | Check `N8N_WEBHOOK_SECRET` in n8n variables matches `srp_n8n_growth_wh_2026` |
| SMTP node fails | Verify SMTP credentials in n8n are active (`smtp.gmail.com`, port 587); test with a simple email workflow first |
| Lead scoring returns 0 | Ensure the tenant has an active `IcpProfile` — create one in the platform UI under Settings → ICP Profile |
| n8n workflows deactivate on restart | This is expected if the n8n Docker volume is not persisted — the `n8n` container on this server already has a persistent volume |
| Candidate not found after import | Add a longer wait to Workflow 03 (increase from 2s to 5s) |
