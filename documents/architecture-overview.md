# Architecture Overview

For diagrams and visual maps that pair with this document, see `architecture-visuals.md`.

## High-Level Shape

CourseFlow is a monorepo-style project with one backend application and one frontend application:

- backend: Spring Boot application packaged as a jar
- frontend: React app built with Vite and copied into Spring static resources for production packaging

In production packaging, the frontend build is included in the backend artifact.

## Backend Structure

The backend follows a standard Spring service structure:

- `Controller`
  - REST endpoints
- `Service`
  - business logic
- `Repository`
  - JPA queries and persistence
- `Model` / entity classes
  - database-backed domain objects
- `Security`
  - auth, JWT, endpoint access rules
- `Exception`
  - global exception handling and domain errors

Key backend responsibilities include:

- user accounts and authentication
- flowcharts and semester planning
- majors and degree requirement data
- course and professor review flows
- import pipelines for ISU datasets
- profile and social features

## Frontend Structure

The frontend lives under `src/main/client`.

Important areas:

- `src/pages`
  - route-level screens
- `src/components`
  - shared UI building blocks
- `src/api`
  - client API wrappers
- `src/utils`
  - calculations and helper logic
- `src/config`
  - shared navigation and page metadata

The frontend currently uses:

- React Router for page routing
- Axios for backend communication
- PrimeReact / PrimeFlex for UI primitives
- TypeScript across the app

## Core Product Modules

### Planning

- `Dashboard`
  - central flowchart planning workspace
- `SmartScheduler`
  - generates draft schedule options
- `CourseCatalog`
  - browse/search catalog and add to plans
- `MajorsBrowse`
  - inspect major requirements and progress

### Current Semester

- `CurrentClasses`
  - weekly calendar view
  - imported schedule display

### Exploration

- `CourseReviews`
- `ProfessorReviews`

### Identity / Social

- `profile`
- `StudentSearch`
- friend interactions surfaced through the home/dashboard experience
- `CourseBadges`
- `Settings`

## Data Flow

### Typical frontend request flow

1. React page loads
2. page calls API wrapper in `src/api`
3. backend controller receives request
4. service layer applies business logic
5. repository talks to the database
6. response returns to the page and renders

### Imported data flow

CourseFlow supports imported datasets, especially for majors and professor information.

The `docs/` folder contains templates and bundled datasets used for:

- major requirement import
- professor directory import
- external professor rating snapshots

Some datasets are auto-seeded when the target tables are empty.

## Runtime Modes

### Shared database mode

- uses PostgreSQL
- intended for team/shared data
- depends on network access to the VM

### Local development mode

- uses H2 under `.courseflow/`
- useful when PostgreSQL is unavailable
- supports local major seeding so the app remains usable

## Packaging Model

The Maven build can:

- install frontend dependencies
- build the frontend
- place the compiled frontend into Spring static resources
- package the whole app into one jar

This is why frontend build issues can block the backend package step.
