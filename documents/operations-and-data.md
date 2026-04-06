# Operations And Data Guide

## Goal Of This Document

This file is the runbook for environment setup, database modes, and import data.

## Database Modes

CourseFlow currently supports two practical database paths:

### 1. Shared PostgreSQL database

Use this when the team VM and network path are working.

Inputs are provided through environment variables:

- `SPRING_DATASOURCE_URL`
- `SPRING_DATASOURCE_USERNAME`
- `SPRING_DATASOURCE_PASSWORD`
- `APP_JWT_SECRET`

Recommended launcher:

```powershell
.\scripts\start-courseflow-vm.ps1
```

### 2. Local H2 profile

Use this when you need a reliable, self-contained dev environment.

Recommended launcher:

```powershell
.\scripts\start-courseflow-local.ps1
```

Reset local data:

```powershell
.\scripts\start-courseflow-local.ps1 -ResetData
```

The local H2 database lives under:

- `.courseflow/`

## Best Default For New Developers

Use:

```powershell
.\scripts\start-courseflow-dev.ps1
```

This gives the best developer experience because it:

- uses the shared DB when available
- automatically falls back to local mode when it is not

## Seed And Import Data

The repo's `docs/` folder contains bundled data and templates, not onboarding docs.

Important files:

- `docs/isu-degree-dataset.json`
- `docs/isu-degree-import-template.json`
- `docs/isu-professors-dataset.json`
- `docs/isu-professor-import-template.json`
- `docs/professor-external-ratings-template.json`

## Major Data

Major data is important because several user flows depend on it:

- account creation
- majors browse
- requirement coverage
- planning helpers

In local mode, the project includes a local initializer that can seed majors from the bundled degree dataset when the database is empty.

If major data is missing:

1. confirm the database is actually empty
2. confirm you are using the intended profile
3. if in local mode, try:

```powershell
.\scripts\start-courseflow-local.ps1 -ResetData
```

## Professor Data

Professor data can be auto-seeded when the local professor tables are empty. External rating snapshots are stored separately from student-written CourseFlow reviews.

## Common Recovery Workflows

### App will not start because PostgreSQL is unreachable

Use local mode:

```powershell
.\scripts\start-courseflow-local.ps1
```

### Local data looks corrupted or stale

Reset local H2 data:

```powershell
.\scripts\start-courseflow-local.ps1 -ResetData
```

### Frontend compiles, but full Maven package fails

Check whether:

- frontend tests are failing
- frontend build runs during Maven profile `frontend`
- backend package is being blocked by frontend build/test integration

### Shared database is wiped or missing seed data

Before debugging frontend dropdowns, verify:

- major data exists
- professor data exists
- the app is pointed at the database you think it is using

## Runtime Data That Should Not Be Committed

Keep these out of git:

- local databases under `.courseflow/`
- uploaded files under `uploads/`
- secrets and env files
- personal test artifacts and logs

