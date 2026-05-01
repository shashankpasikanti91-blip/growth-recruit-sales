# Phase 06 — SRP Cross-Team Alerts & QA

**Status:** ✅ DONE  
**Goal:** Ensure no work falls through the cracks. Automated alerts cross-team, notification centre, and a QA gate on submissions.

---

## Features Built

| Task | Status | Notes |
|------|--------|-------|
| Notification center UI (bell icon + unread count) | ✅ | Dropdown with mark-as-read |
| Recruiter notified: JD assigned | ✅ | EventEmitter2 → notification record |
| Sales notified: submission received | ✅ | `submission.created` event |
| Sales notified: interview scheduled | ✅ | EventEmitter2 listener |
| Client feedback reminder | ✅ | Cron: fires if no feedback after 3 days |
| QA gate: submission without CV blocked | ✅ | Validation in `submissions.service` |

## Backend

| Module | Notes |
|--------|-------|
| `NotificationsModule` | CRUD + mark-read endpoint |
| `NotificationsService` | `create()`, `findAll()`, `markRead()`, `markAllRead()` |
| `Notification` Prisma model | userId, tenantId, type, title, message, entityType, entityId, read |
| Migration `20260501000003_notifications` | DDL: `notifications` table |
| Cron job: `FeedbackReminderProcessor` | `@Cron(CronExpression.EVERY_DAY_AT_9AM)` |

## Frontend

| Component | Notes |
|-----------|-------|
| `NotificationBell` in header | Real-time unread count badge |
| Notifications dropdown | List + mark all read button |
| `/notifications` page | Full list with filters |
