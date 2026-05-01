# Phase 08 — SRP Connect: Global Outreach Channels

**Status:** ✅ DONE  
**Priority:** HIGH — Unlocks direct email + messaging outreach from inside SRP  
**Depends on:** Phase 01 (Outreach module complete), Phase 07 (My Profile has Connect Email option)

---

## Goal

Connect SRP AI Growth to the world's most-used communication channels so outreach to leads and candidates happens directly from inside the platform — no copy-pasting, no switching tools.

> **Platform Advantage:** Every outreach message (email, WhatsApp, Telegram) is tracked in the `Activity` log and linked to the Lead / Candidate / Submission record. Replies are pulled in. Full conversation history lives in SRP.

---

## What Is Already Built (Current State)

| Provider | Status | What It Does |
|----------|--------|-------------|
| SMTP | ✅ Built | Send email via App Password (e.g. Gmail SMTP). No OAuth. No reply tracking. |
| Slack | ✅ Built | Team notifications via Slack Bot Token |
| LinkedIn | ✅ Built | API key stored — profile lookup, Sales Navigator |
| Apollo | ✅ Built | B2B contact enrichment + lead generation |
| Hunter | ✅ Built | Email finder by domain |
| Clearbit | ✅ Built | Company + person enrichment |
| Indeed | ✅ Built | Job posting + applicant import |
| Webhook | ✅ Built | Push events to external URL (Zapier, Make, n8n) |

---

## What Was Added (Phase 08)

| Provider | Channel | Priority | Use Case |
|----------|---------|----------|---------|
| **Gmail OAuth** | Email | 🔴 HIGH | Outreach emails sent from user's real Gmail account (not App Password). Reply tracking via Gmail API. |
| **Outlook / Microsoft 365** | Email | 🔴 HIGH | Outreach emails sent via Microsoft Graph API. Full corporate email support. |
| **WhatsApp Business API** | Messaging | 🔴 HIGH | Send WhatsApp messages to leads and candidates. Template + free-form messages. |
| **Telegram Bot API** | Messaging | 🟡 MEDIUM | Outreach to candidates via Telegram. Team internal alerts. |
| **Microsoft Teams** | Team comms | 🟡 MEDIUM | Internal notifications to Teams channels (new lead, new submission, placement won) |

---

## Integration 1 — Gmail OAuth

### Why OAuth instead of SMTP App Password?
- SMTP App Password requires "Less Secure Apps" or 2FA App Password — deprecated by Google
- OAuth2 uses official Google Sign-In — professional, supported, no 2FA workaround
- OAuth2 enables **reply tracking**: read incoming replies via Gmail API
- Emails arrive in the user's actual Gmail Sent folder — no separate account needed
- Each team member connects **their own Gmail** → outreach is sent from their account address

### How It Works

```
User clicks "Connect Gmail" in My Hub → Profile
  ↓
OAuth2 redirect → Google consent screen
  ↓
SRP receives access_token + refresh_token
  ↓
Tokens stored ENCRYPTED in integrations table (credentialsEnc, AES-256-GCM — already in use)
  ↓
When sending outreach email:
  → Backend retrieves tokens from integrations table
  → Sends via Gmail API (googleapis/nodemailer-gmail-api)
  → Email lands in user's Gmail Sent
  ↓
Reply tracking (Phase 08b / future):
  → Gmail API watches inbox for replies to outreach thread_id
  → Replies pulled into Activity log + linked to Lead/Candidate
```

### DB Change: No new model needed

Use existing `Integration` model. New `type` value: `GMAIL_OAUTH`.

```
integrations row:
  type = 'GMAIL_OAUTH'
  name = 'Gmail — user@company.com'
  credentialsEnc = encrypted({ access_token, refresh_token, email, expiry_date })
  config = { email: 'user@company.com', scopes: ['gmail.send', 'gmail.readonly'] }
  isActive = true / false
  status = ACTIVE / ERROR
```

### API Changes

```
GET  /api/v1/integrations/gmail/auth-url    — returns Google OAuth2 URL for redirect
GET  /api/v1/integrations/gmail/callback    — receives code, exchanges for tokens, stores
GET  /api/v1/integrations/gmail/status      — check if connected, which email address
DELETE /api/v1/integrations/gmail           — disconnect (delete tokens)
POST /api/v1/outreach/send-email           — send via Gmail API if GMAIL_OAUTH active, else SMTP
```

### Frontend Changes

- My Hub → My Profile → **"Connect Gmail"** button
- Shows: connected email address + green status when OAuth is done
- Settings → Integrations: Gmail card shows as "OAuth Connected" vs old SMTP card

### Required Credentials (stored in `.env`)

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://your-domain.com/api/v1/integrations/gmail/callback
```

---

## Integration 2 — Outlook / Microsoft 365 OAuth

### Why Microsoft 365?
- Many enterprise clients and candidates use Outlook / Office 365
- Microsoft Graph API is the correct way to send email from company Outlook accounts
- Supports both personal Outlook.com and corporate Microsoft 365 tenants
- Personal email + calendar access via Microsoft Graph

### How It Works

```
User clicks "Connect Outlook" in My Hub → Profile
  ↓
OAuth2 redirect → Microsoft login (MSAL flow)
  ↓
SRP receives access_token + refresh_token via MSAL
  ↓
Tokens stored encrypted in integrations table
  ↓
Send email: POST /v1.0/me/sendMail via Microsoft Graph API
  ↓
Email appears in user's Outlook Sent Items
```

### DB Change: No new model needed

```
integrations row:
  type = 'OUTLOOK_OAUTH'
  name = 'Outlook — user@company.com'
  credentialsEnc = encrypted({ access_token, refresh_token, account_id, email, expiry_date })
  config = { email: 'user@company.com', tenant: 'common|<tenantId>' }
```

### API Changes

```
GET  /api/v1/integrations/outlook/auth-url   — returns MSAL OAuth2 URL
GET  /api/v1/integrations/outlook/callback   — code exchange, store tokens
GET  /api/v1/integrations/outlook/status     — connected email address
DELETE /api/v1/integrations/outlook          — disconnect
```

### Required Credentials

```env
AZURE_AD_CLIENT_ID=
AZURE_AD_CLIENT_SECRET=
AZURE_AD_REDIRECT_URI=https://your-domain.com/api/v1/integrations/outlook/callback
AZURE_AD_TENANT=common   # or your specific tenant ID
```

### Microsoft Teams (bonus — same Azure App)

Since the Azure App is registered for Microsoft 365, Teams channel notifications can be added:
- New lead scored above threshold → Teams alert
- Placement confirmed (Submission = JOINED) → Teams channel message
- Uses **Incoming Webhooks** (no OAuth needed — just a webhook URL per Teams channel)

```
integrations row for Teams:
  type = 'MS_TEAMS'
  credentialsEnc = encrypted({ webhook_url: 'https://...' })
  config = { channel: '#placements', events: ['PLACEMENT_WON', 'NEW_LEAD_HIGH_SCORE'] }
```

---

## Integration 3 — WhatsApp Business API (Meta)

### Why WhatsApp?
- WhatsApp is the primary business communication channel in South-East Asia, Middle East, India, and UK (SRP's target markets)
- Candidates and clients both use WhatsApp — email open rates are far lower
- Auto-sequences for candidate outreach ("Hi [Name], we have a [Job Title] role in [Location]...")
- Follow-up on leads that don't respond to email

### How It Works (Meta Cloud API)

```
SRP Admin connects WhatsApp Business Account:
  → Goes to Meta Business Manager
  → Creates App → Add WhatsApp product
  → Provides: Phone Number ID + Permanent Access Token from Meta dashboard
  → Saves in SRP Settings → Integrations → WhatsApp

When sending outreach:
  1. First contact: Must use a Meta-approved Template message
  2. Within 24h window of reply: Free-form message allowed
  3. POST to https://graph.facebook.com/v18.0/{phone_number_id}/messages
  4. Message linked to lead/candidate Activity log
```

### Message Types

| Type | When | SRP Use Case |
|------|------|-------------|
| Template | First contact / > 24h since last reply | Job opportunity intro, follow-up reminder |
| Free-form | After lead replies (within 24h) | Conversation continuation |
| Buttons | With template | "Interested" / "Not Now" / "See Job" quick-reply buttons |

### DB Change: `OutreachMessage` model already exists — add `channel` field

```prisma
enum OutreachChannel {
  EMAIL
  WHATSAPP    // ← add
  TELEGRAM    // ← add
}

model OutreachMessage {
  ...existing fields...
  channel  OutreachChannel @default(EMAIL)   // ← add
  externalMessageId  String?                // WhatsApp message ID from Meta response
}
```

### API Changes

```
GET  /api/v1/integrations/whatsapp/status     — check if connected
POST /api/v1/integrations/whatsapp            — save phone_number_id + access_token
POST /api/v1/outreach/send-whatsapp           — send template or free-form message
POST /api/v1/integrations/whatsapp/webhook    — receive incoming WhatsApp replies (Meta sends here)
```

### Required Credentials

```env
META_WA_PHONE_NUMBER_ID=
META_WA_ACCESS_TOKEN=          # Permanent token from Meta Business Manager
META_WA_WEBHOOK_VERIFY_TOKEN=  # Custom token to verify Meta webhook callbacks
META_WA_APP_SECRET=            # For webhook signature verification
```

### Frontend Changes

- Settings → Integrations → **WhatsApp Business** card
- Admin enters: Phone Number ID + Access Token
- Test sends a "Hello from SRP" to a test number
- Outreach composer: channel selector dropdown → Email / WhatsApp / Telegram
- Lead 360 / Candidate 360: WhatsApp message history in Activity tab

---

## Integration 4 — Telegram Bot API

### How It Works

```
Admin creates a Telegram Bot via @BotFather
  → Receives Bot Token
  → Saves in SRP Settings → Integrations → Telegram

Two use cases:
  A. Outreach to candidates/leads who share their Telegram @username or chat ID
  B. Internal team notifications (new lead, new submission, placement won)
```

### Use Case A: Outreach

```
Candidate/Lead has Telegram username stored in profile
  ↓
Outreach message drafted in SRP
  ↓
POST https://api.telegram.org/bot{token}/sendMessage
  Body: { chat_id: '@username' or numeric chat_id, text: '...' }
  ↓
Message delivered
  ↓
Linked to Activity log on Lead or Candidate record
```

### Use Case B: Internal Alerts

```
Event fires in backend (e.g. new lead with ICP score > 80)
  ↓
Telegram notification service sends message to configured admin channel
  POST /bot{token}/sendMessage to a Telegram Channel or Group
  ↓
Team sees instant alert in their Telegram
```

### DB Change

Same as WhatsApp — use `OutreachChannel.TELEGRAM` on `OutreachMessage`.

For internal alerts: use existing integration config:
```
integrations row:
  type = 'TELEGRAM'
  credentialsEnc = encrypted({ bot_token: '...' })
  config = { team_chat_id: '-100...', outreach_enabled: true, events: ['NEW_HIGH_SCORE_LEAD','PLACEMENT_WON'] }
```

### Required Credentials

```env
TELEGRAM_BOT_TOKEN=
```

### API Changes

```
GET  /api/v1/integrations/telegram/status      — check if connected
POST /api/v1/integrations/telegram             — save bot token
POST /api/v1/outreach/send-telegram            — send message to contact
POST /api/v1/integrations/telegram/webhook     — receive Telegram updates (optional polling alt)
```

---

## Updated `IntegrationProvider` Enum (Backend)

Current in `integrations.service.ts`:
```typescript
export enum IntegrationProvider {
  LINKEDIN = 'LINKEDIN',
  INDEED = 'INDEED',
  APOLLO = 'APOLLO',
  HUNTER = 'HUNTER',
  CLEARBIT = 'CLEARBIT',
  SMTP = 'SMTP',
  SLACK = 'SLACK',
  WEBHOOK = 'WEBHOOK',
}
```

**After Phase 08**, add:
```typescript
  GMAIL_OAUTH = 'GMAIL_OAUTH',
  OUTLOOK_OAUTH = 'OUTLOOK_OAUTH',
  MS_TEAMS = 'MS_TEAMS',
  WHATSAPP = 'WHATSAPP',
  TELEGRAM = 'TELEGRAM',
```

---

## Updated Frontend — Integrations Page

Currently only shows: data sources + ATS connectors.  
**Add a new section: "Communication Channels"**

| Provider | Card Status | Notes |
|----------|------------|-------|
| Gmail OAuth | 🔲 To build | "Connect Gmail" OAuth button |
| Outlook / Microsoft 365 | 🔲 To build | "Connect Outlook" OAuth button |
| Microsoft Teams | 🔲 To build | Webhook URL input |
| WhatsApp Business | 🔲 To build | Phone Number ID + Token |
| Telegram | 🔲 To build | Bot Token |
| SMTP | ✅ Exists | Keep for manual/legacy config |
| Slack | ✅ Exists | Keep |

---

## Outreach Composer Changes (Phase 08)

When composing an outreach message (from Lead 360, Candidate 360, or Outreach page), add:

```
[Channel]  ○ Email (Gmail / Outlook / SMTP)  ○ WhatsApp  ○ Telegram
```

System automatically uses:
1. Gmail OAuth if connected for this user
2. Else Outlook OAuth if connected for this user
3. Else SMTP (fallback)

For WhatsApp/Telegram: only shown if admin has connected the integration.

---

## Security Notes

| Rule | Detail |
|------|--------|
| All tokens stored encrypted | AES-256-GCM already in place via `IntegrationsService.encrypt()` |
| OAuth tokens refreshed automatically | Access tokens expire — backend must refresh using `refresh_token` before sending |
| WhatsApp webhook signature MUST be verified | `X-Hub-Signature-256` header from Meta must be validated using `META_WA_APP_SECRET` |
| Telegram webhook: validate source IP or use `secretToken` | Pass `secret_token` when registering webhook, validate in handler |
| Never log raw access tokens | Existing `sanitizeForResponse()` strips `credentialsEnc` already |
| Gmail reply read scope: user must explicitly grant `gmail.readonly` | Prompt shown in consent screen |

---

## Phase 08 Build Order

1. **Gmail OAuth** — highest-usage email provider, most team members use Gmail
   - Register Google Cloud OAuth app → get client ID/secret
   - Implement `/gmail/auth-url` + `/gmail/callback` endpoints
   - My Hub → Profile → "Connect Gmail" button
   - Update outreach service to use Gmail API when `GMAIL_OAUTH` is active

2. **Outlook OAuth** — corporate accounts
   - Register Azure App → get client ID/secret
   - Implement `/outlook/auth-url` + `/outlook/callback`
   - My Hub → Profile → "Connect Outlook" button

3. **WhatsApp Business** — outreach channel
   - Register Meta App → WhatsApp product
   - Implement webhook receive + send endpoints
   - Outreach composer channel selector

4. **Telegram** — alert channel + candidate outreach
   - Create bot via @BotFather
   - Implement send + webhook

5. **Microsoft Teams** — internal notifications (lowest priority, same Azure App as Outlook)
   - Add Teams Incoming Webhook URL input in Settings
   - Fire notifications on key events

---

## Full Integration Inventory (After Phase 08)

| Category | Provider | Purpose |
|----------|----------|---------|
| **Lead Generation** | Apollo | B2B contact + company enrichment |
| | Apify | Google Maps / web scraping (via n8n) |
| | Hunter | Email finder by domain |
| | Clearbit | Company + person enrichment |
| **Job Boards** | LinkedIn | Profile lookup + Sales Navigator |
| | Indeed | Job posting + applicant import |
| **Email** | Gmail OAuth | ← Phase 08 — outreach from Gmail |
| | Outlook / MS 365 | ← Phase 08 — outreach from Outlook |
| | SMTP | Existing — fallback / manual config |
| **Messaging** | WhatsApp Business | ← Phase 08 — lead + candidate outreach |
| | Telegram | ← Phase 08 — outreach + team alerts |
| **Team Comms** | Slack | Team notifications (existing) |
| | Microsoft Teams | ← Phase 08 — channel notifications |
| **Automation** | n8n Webhook | Internal workflow trigger (existing) |
| | Webhook (generic) | Zapier / Make / custom (existing) |
