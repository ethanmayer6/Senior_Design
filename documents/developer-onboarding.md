# Developer Onboarding

## What CourseFlow Is

CourseFlow is a student planning platform for Iowa State workflows. It helps students and advisors:

- build and manage degree flowcharts
- inspect major requirements
- explore courses and professors
- manage current semester schedules
- use planning tools like Smart Scheduler
- track profile, badges, and social features

The project is a Spring Boot backend with a React + Vite frontend.

## Tech Stack

- Backend: Java 21, Spring Boot 3.5, Spring Security, Spring Data JPA
- Frontend: React 19, TypeScript, Vite, PrimeReact, Tailwind/PrimeFlex
- Database:
  - shared PostgreSQL when the VM is reachable
  - local H2 fallback for development
- Tests:
  - backend via Maven/Spring test stack
  - frontend via Vitest
  - browser tests via Playwright

## First-Day Checklist

1. Install Java 21
2. Install Node.js and npm
3. Clone the repo
4. From the repo root, confirm the important paths exist:
   - `src/main/java`
   - `src/main/client`
   - `scripts`
   - `documents`
5. Start the app with the dev launcher:
   - `.\scripts\start-courseflow-dev.ps1`
6. Open `http://localhost:8080`
7. Read `architecture-overview.md`
8. Review `architecture-visuals.md`

## Fastest Way To Run The Project

From the repo root:

```powershell
.\scripts\start-courseflow-dev.ps1
```

This script:

- prefers the shared VM-backed PostgreSQL database if it is reachable
- falls back to the local H2 profile if the VM is unavailable

## Other Run Modes

### Local-only mode

Use this when you want a self-contained dev environment:

```powershell
.\scripts\start-courseflow-local.ps1
```

Reset local data and re-seed majors:

```powershell
.\scripts\start-courseflow-local.ps1 -ResetData
```

### VM-backed mode

Use this when the team database is reachable and you want to develop against shared data:

```powershell
.\scripts\start-courseflow-vm.ps1
```

## Build Commands

### Full backend package

```powershell
.\mvnw.cmd -DskipTests package
```

### Backend compile only

```powershell
.\mvnw.cmd -q -DskipTests compile
```

### Frontend build only

```powershell
npm --prefix src/main/client run build
```

### Backend tests only

```powershell
.\mvnw.cmd -q test -P !frontend
```

### Frontend tests

```powershell
npm --prefix src/main/client run test:run
```

## Repo Map

- `src/main/java`
  - Spring Boot backend code
- `src/main/resources`
  - application properties, static assets, seed data
- `src/main/client`
  - React frontend
- `src/test/java`
  - backend tests
- `scripts`
  - local launch helpers
- `docs`
  - import templates and bundled datasets
- `documents`
  - teammate-facing documentation

## Frontend Page Inventory

CourseFlow is organized into these navigation groups:

- Plan
  - Flowchart Dashboard
  - Smart Scheduler
  - Course Catalog
  - Majors Browse
- Current Semester
  - Current Classes
- Explore
  - Course Reviews
  - Professor Reviews
- Profile & Social
  - Profile
  - Friends List
  - Student Search
  - Course Badges
  - Settings
- More
  - Games
  - Dining
  - external links like Canvas and campus map

## Development Expectations

- Treat the shared VM database as optional, not guaranteed
- Prefer local profile development unless the task truly depends on shared data
- Keep runtime data and personal uploads out of git
- Do not commit secrets or operational credentials
- Read the existing page or module before patching it; many screens already have custom workflows

## Good First Checks When Something Breaks

- Is the app actually running on `localhost:8080`?
- Did the backend fail because the VM DB is unreachable?
- Would the local profile unblock the work?
- Did the frontend build break in `src/main/client` before the backend package step?
- Is the data you need seeded into the local DB yet?
