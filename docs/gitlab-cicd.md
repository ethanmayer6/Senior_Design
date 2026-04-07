# GitLab CI/CD for CourseFlow

## Recommended model

For this repository, the cleanest automation setup is:

- GitLab hosts the source of truth and runs the validation pipeline in `.gitlab-ci.yml`
- Render handles backend continuous deployment directly from the GitLab repo using `render.yaml`
- Vercel handles frontend continuous deployment directly from the GitLab repo using `vercel.json`

This is usually better than pushing both deploys from a GitLab runner because it keeps the deployment logic close to each hosting platform, reduces secret sprawl, and preserves platform-native preview and rollback features.

## What the GitLab pipeline does

The current pipeline has four jobs:

- `backend-verify`: runs `./mvnw -B --no-transfer-progress -P!frontend verify`
- `frontend-unit`: runs `npm run test:run -- --coverage`
- `frontend-e2e`: runs `npm run test:e2e` in a Playwright image
- `frontend-build`: runs `npm run build`

Artifacts are retained for one week so the team can inspect:

- backend test reports
- backend JaCoCo coverage output
- the packaged backend jar
- frontend coverage output
- Playwright reports
- the frontend `dist` build

## Why this split is recommended

- Render already knows how to build this backend from `Dockerfile.render`
- Vercel already knows how to build this frontend from `vercel.json`
- Vercel preview deployments work best when Vercel is connected to the GitLab repo directly
- Render Blueprint updates are simpler when Render is watching the same GitLab branch

In other words, GitLab CI should answer "is this commit safe to ship?" and Render/Vercel should answer "ship it."

## One-time setup

1. Connect the GitLab repository to Render.
2. Create the backend service from `render.yaml`.
3. Enable Render auto-deploys from your production branch, typically `main`.
4. Connect the same GitLab repository to Vercel.
5. Import the repo root in Vercel so `vercel.json` is used.
6. In Vercel, set `VITE_API_BASE_URL` to your Render backend URL, for example `https://courseflow-api.onrender.com/api`.
7. In GitLab, protect `main` and require the pipeline to pass before merge.

## Environment notes

Backend runtime configuration is environment-driven:

- `SPRING_DATASOURCE_URL`
- `SPRING_DATASOURCE_USERNAME`
- `SPRING_DATASOURCE_PASSWORD`
- `APP_JWT_SECRET`
- `APP_CORS_ALLOWED_ORIGIN_PATTERNS`

Render already populates the database-related values through `render.yaml`.

Frontend production builds use:

- `VITE_API_BASE_URL`

That variable should be managed in Vercel, not committed.

## If your course requires deploys to start from GitLab CI

The native Git integration flow above is still the recommended default. If you specifically need GitLab to initiate deployments, the next step would be:

- add a Render deploy-hook job that calls a protected deploy URL
- add a Vercel CLI job that uses `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID`

That is possible, but it is more complex and usually not necessary unless the requirement explicitly says the deploy must be launched by the CI runner itself.
