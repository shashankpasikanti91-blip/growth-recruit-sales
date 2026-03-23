# Branch Strategy

## Branch Model

```
main          ← production (auto-deploys to growth.srpailabs.com)
 └── staging  ← pre-production (manual deploy)
      └── feature/* | fix/* | chore/*  ← developer branches
```

## Rules

| Branch | Protected | Direct Push | Deploy |
|--------|-----------|-------------|--------|
| `main` | ✅ Yes | ❌ No — PR only | 🚀 Auto (GitHub Actions) |
| `staging` | ✅ Yes | ❌ No — PR only | 🔧 Manual trigger |
| `feature/*` | ❌ No | ✅ Yes | ❌ None |
| `fix/*` | ❌ No | ✅ Yes | ❌ None |

## Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| New feature | `feature/<desc>` | `feature/linkedin-ai` |
| Bug fix | `fix/<desc>` | `fix/billing-nan-display` |
| Chore / infra | `chore/<desc>` | `chore/update-deps` |
| Hotfix (emergency) | `hotfix/<desc>` | `hotfix/login-broken` |

## Workflow

1. Branch off `staging`: `git checkout -b feature/my-feature staging`
2. Make changes, commit with descriptive messages
3. Open PR → `staging` for review
4. After testing on staging, open PR → `main`
5. Merge to `main` triggers auto-deploy via GitHub Actions

## Commit Message Format

```
<type>(<scope>): <subject>

types: feat | fix | chore | docs | refactor | perf | security
```

Examples:
- `feat(leads): add Google Maps import endpoint`
- `fix(billing): prevent NaN% when limit is 0`
- `security(auth): enforce JWT_SECRET minimum length`

## Secrets Required for CI/CD

Set these in GitHub → Settings → Secrets → Actions:

| Secret | Description |
|--------|-------------|
| `DEPLOY_SSH_KEY` | Private SSH key for server access |
| `DEPLOY_HOST` | Server IP (e.g. `5.223.67.236`) |
| `DEPLOY_USER` | SSH user (e.g. `root`) |
