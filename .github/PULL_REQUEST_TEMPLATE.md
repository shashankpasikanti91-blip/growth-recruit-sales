## Summary
<!-- Describe what this PR does in 1-3 sentences -->

## Type of change
- [ ] Bug fix
- [ ] New feature
- [ ] Refactor / code cleanup
- [ ] Performance improvement
- [ ] Security fix
- [ ] Documentation update
- [ ] CI/CD / infrastructure

## Changes made
<!-- List the key files/modules changed -->

## Testing
- [ ] Tested locally (`docker compose up`)
- [ ] Tested against staging (`https://staging.srpailabs.com`)
- [ ] Added / updated unit tests
- [ ] Added / updated E2E tests
- [ ] No test applicable (docs-only change)

## Database migrations
- [ ] No migrations
- [ ] Migration added at `backend/prisma/migrations/` — safe to run on production
- [ ] Migration has destructive changes (requires downtime window)

## Checklist
- [ ] Code follows existing patterns (no over-engineering)
- [ ] All queries are scoped by `tenantId` (no cross-tenant risk)
- [ ] No secrets or API keys committed
- [ ] Swagger/OpenAPI docs updated if endpoints changed
- [ ] `CHANGELOG.md` updated

## Screenshots (if UI change)
<!-- Add before/after screenshots or skip if backend-only -->
