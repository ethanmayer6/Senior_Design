# CourseFlow Deployment Report

Date: March 29, 2026

## What I completed

I prepared the repository for a split deployment:

- Render hosts the Spring Boot backend API
- Vercel hosts the Vite/React frontend

The repo changes made for that deployment path are:

- Added environment-driven backend configuration in `src/main/resources/application.properties`
- Replaced localhost-only CORS settings with configurable origin patterns in `src/main/java/com/sdmay19/courseflow/security/SpringConfiguration.java` and `src/main/java/com/sdmay19/courseflow/config/WebConfig.java`
- Moved the JWT secret to an environment property in `src/main/java/com/sdmay19/courseflow/security/JwtService.java`
- Added a lightweight health endpoint at `GET /api/ping` in `src/main/java/com/sdmay19/courseflow/health/HealthController.java`
- Removed frontend hardcoding to `http://localhost:8080` in `src/main/client/src/api/admin.ts` and `src/main/client/src/pages/CourseCatalog.tsx`
- Removed debug logging from `src/main/client/src/Env.ts`
- Split frontend builds into:
  - `npm run build` for Vercel output to `dist`
  - `npm run build:backend` for the Spring-served static bundle
- Updated `pom.xml` and `Dockerfile` so the existing fullstack build path still works
- Added `render.yaml` for Render Blueprint deployment
- Added `scripts/render-start.sh` so Render's Postgres connection string can be converted into Spring's JDBC format at runtime
- Added `vercel.json` for Vercel deployment from the repo root
- Added `src/main/client/.env.example` as the frontend environment template

## Why these changes were necessary

Before this pass, deployment would have failed or behaved incorrectly for several reasons:

- the backend datasource was hardcoded to a single PostgreSQL host
- CORS only allowed `http://localhost:5173`
- part of the frontend still called `http://localhost:8080` directly
- the admin API client duplicated auth handling and hardcoded its base URL
- Vite's build output was aimed at Spring's static directory instead of a normal Vercel output folder
- there was no health endpoint for a clean Render health check
- there were no Render or Vercel platform config files in the repo

## Files added or updated

### Backend and platform config

- `src/main/resources/application.properties`
- `src/main/java/com/sdmay19/courseflow/security/SpringConfiguration.java`
- `src/main/java/com/sdmay19/courseflow/config/WebConfig.java`
- `src/main/java/com/sdmay19/courseflow/security/JwtService.java`
- `src/main/java/com/sdmay19/courseflow/health/HealthController.java`
- `scripts/render-start.sh`
- `render.yaml`
- `Dockerfile.render`
- `pom.xml`
- `Dockerfile`

### Frontend deployment and API cleanup

- `src/main/client/package.json`
- `src/main/client/vite.config.ts`
- `src/main/client/src/Env.ts`
- `src/main/client/src/api/admin.ts`
- `src/main/client/src/api/admin.test.ts`
- `src/main/client/src/pages/CourseCatalog.tsx`
- `src/main/client/.env.example`
- `vercel.json`

## Render deployment tutorial

### Deployment model

Render is configured to deploy the backend as a Docker-based web service using the root-level `render.yaml` plus `Dockerfile.render`. The same Blueprint also provisions a Render Postgres database named `courseflow-db`.

### What Render will do from this repo

When you create the Blueprint from this repository, Render should:

- create a web service named `courseflow-api`
- create a Postgres database named `courseflow-db`
- build the backend image from `Dockerfile.render`
- start the backend with `./scripts/render-start.sh` inside the container
- health-check the service at `/api/ping`
- generate `APP_JWT_SECRET`
- wire database credentials into the service

### Manual Render steps

1. Push this branch to GitHub/GitLab.
2. In Render, create a new Blueprint deployment from the repo.
3. Confirm that Render detects `render.yaml`.
4. Review the generated resources:
   - Web service: `courseflow-api`
   - Database: `courseflow-db`
5. If Render does not allow the `free` plan in your workspace, change the plan during setup.
6. After the service is created, copy the backend URL, which will look like:
   - `https://courseflow-api.onrender.com`
7. Test the health endpoint:
   - `https://courseflow-api.onrender.com/api/ping`

### Recommended Render environment settings

Most of the required values are already declared in `render.yaml`. After deployment, review these:

- `APP_CORS_ALLOWED_ORIGIN_PATTERNS`
  - Default value already allows local development and `https://*.vercel.app`
  - If you add a custom Vercel domain, append it here
- `SPRING_JPA_HIBERNATE_DDL_AUTO`
  - Default is `update`
  - If you want stricter production migrations later, move to a migration tool such as Flyway
- `FILE_UPLOAD_DIR`
  - Default works, but Render's filesystem is ephemeral
  - Profile-picture uploads will not survive a full redeploy unless you move them to durable object storage

### Important Render caveat

Profile pictures currently use local disk storage. That is acceptable for development and demos, but it is not durable production storage on Render. If persistent uploads matter for your final deployment, the next step is moving profile images to S3, Cloudinary, Supabase Storage, or another managed object store.

## Vercel deployment tutorial

### Deployment model

Vercel is configured to build only the frontend. The root-level `vercel.json` handles:

- installing dependencies from `src/main/client`
- building the Vite app from `src/main/client`
- publishing `src/main/client/dist`
- rewriting SPA routes to `index.html`

### Manual Vercel steps

1. In Vercel, import this repository as a new project.
2. Let Vercel use the repo root.
   - The included `vercel.json` already points to the frontend subdirectory.
3. Add this environment variable in Vercel:
   - `VITE_API_BASE_URL=https://your-render-service.onrender.com/api`
4. Trigger the first deployment.
5. After deploy, open the frontend URL and verify that it can call the Render backend.

### What to test after the first Vercel deploy

- landing page loads
- login page loads
- authenticated requests go to the Render backend
- admin pages no longer try to call `localhost`
- course catalog search/filter/update/delete use the deployed backend URL
- page refreshes on nested routes such as `/courseflow`, `/catalog`, and `/dining` do not 404

## Recommended deployment order

1. Deploy Render first
2. Copy the Render backend URL
3. Set `VITE_API_BASE_URL` in Vercel
4. Deploy Vercel
5. Update Render CORS if you add a custom Vercel domain

## Verification checklist

After both deployments are live, verify the following:

- `GET /api/ping` returns `{"status":"ok"}`
- registration works
- login returns a token
- authenticated pages still redirect correctly after token expiry
- course catalog calls succeed from the Vercel frontend
- admin page calls succeed from the Vercel frontend
- CORS is clean in the browser console
- file uploads still work, understanding the storage caveat above

## What I could not finish automatically

I cannot create the actual Render and Vercel projects from inside this workspace, so the platform-side actions below still need to be done manually:

- creating the Render Blueprint deployment
- creating the Vercel project
- setting the Vercel environment variable `VITE_API_BASE_URL`
- assigning any custom domains
- choosing non-free plans if your workspace requires them
- moving uploaded profile pictures to durable cloud storage

## Suggested next deployment hardening steps

If you want to take this from "deployable" to "production-ready", I would do these next:

1. Move profile-picture uploads to managed object storage.
2. Replace `ddl-auto=update` with explicit database migrations.
3. Add CI so backend tests, frontend tests, and the frontend build run before deploy.
4. Add a second browser test that exercises login plus one authenticated API call.
5. Narrow `APP_CORS_ALLOWED_ORIGIN_PATTERNS` once your final Vercel domain is known.
