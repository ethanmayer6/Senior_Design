# CourseFlow Codebase Memory (Agent Notes)

This document captures high-value context to retain when working on this repository repeatedly.

## Product + Stack
- CourseFlow is a Spring Boot + React/Vite app for student graduation planning and flowchart visualization.
- Backend: Java 21 target, Spring Boot 3.5.x, Spring Security (JWT), Spring Data JPA, PostgreSQL.
- Frontend: React + TypeScript + Vite, Tailwind, PrimeReact, ReactFlow.

## Runtime + Build Facts
- Main backend config is in `src/main/resources/application.properties`.
- DB points to a remote PostgreSQL host (`sdmay26-19.ece.iastate.edu`) with `ddl-auto=update`.
- Maven build includes a `frontend` profile that runs `npm install` and `npm run build` in `src/main/client` during `generate-sources`.
- Static frontend assets are served by Spring from `classpath:/static/`.

## Security Model (Important)
- JWT subject is the **user ID** (not email/username).
- `JwtAuthenticationFilter` extracts user ID from bearer token and loads `AppUser` from DB.
- `AppUser` implements `UserDetails`; authorities are derived from `role` as `ROLE_<role>`.
- CORS currently allows `http://localhost:5173`.
- Public endpoints include: login/register, course/major/degree/requirement groups, semester, flowchart, and progress report routes.
- `/api/admin/**` requires role `ADMIN`.

## Domain Model Relationships
- `AppUser` (1) -> (many) `Flowchart`.
- `Flowchart` belongs to one `AppUser` and one `Major`.
- `Flowchart` has many `Semester` and an `ElementCollection` map of `courseIdent -> Status`.
- `Semester` has many `Course` (join table `semester_courses`).
- `Major` has many `DegreeRequirement`.
- `DegreeRequirement` has many `Course` and many `RequirementGroup`.
- `RequirementGroup` has many `Course`.
- `Course.prerequisites` is stored as a set of prerequisite **course identifier strings** to avoid recursive object expansion.

## Core Backend Flows
1. **Auth**
   - `POST /api/users/register` creates user with bcrypt password + default role `USER`.
   - `POST /api/users/login` validates password and returns `{ token, user }`.

2. **Flowchart CRUD**
   - `GET /api/flowchart/user` returns flowchart for current JWT principal.
   - `PATCH /api/flowchart/update/{id}/course` mutates `courseStatusMap` with operations `ADD`, `UPDATE`, `REMOVE`.
   - Deleting a flowchart clears semesters and course map before delete.

3. **Transcript Import**
   - `POST /api/progressReport/flowchart` accepts `.xlsx` and builds/saves a flowchart from transcript rows.
   - Parser normalizes course codes like `COM S 228` -> `COMS_2280`.
   - Courses are grouped by academic period (e.g., `SPRING2025`) and converted to semesters.
   - Semesters with same term/year are merged to avoid duplicates.

## Frontend Behavior to Remember
- API client (`axiosClient`) sets base URL `http://localhost:8080/api` and injects JWT from `localStorage.token`.
- Dashboard loads user flowchart on mount and refreshes after transcript upload.
- Import flow uses PrimeReact `FileUpload`, posts to `/api/progressReport/flowchart` with bearer token.
- Flowchart visualization uses ReactFlow, sorts semesters by term/year, and colors course nodes by department prefix.
- Login stores full auth payload in `localStorage.user` and raw token in `localStorage.token`.

## Practical Risks / Gotchas
- `application.properties` and README contain real-looking DB host/credentials; treat as sensitive operational config.
- Password updates in `UserService.updateUser` and `updatePassword` are not re-encoded in those update paths.
- Hardcoded JWT secret is in source (`JwtService`), not env-based.
- Logging statements print token parsing details and secret usage; noisy and potentially sensitive.
- CORS currently only allows local dev origin.
- A number of frontend requests use hardcoded absolute backend URLs instead of the shared axios client.

## Testing + Environment Notes
- In this environment, Maven dependency downloads from Maven Central can fail with 403/wget fetch issues, so tests may not run here even if code is healthy.
- Existing tests are under `src/test/java/...` and focus on security and course service/controller behavior.

## Working Conventions (Observed)
- Controllers mostly expose explicit paths (`/create`, `/getall`, `/update/{id}`, `/delete/{id}`).
- DTO classes are used for entity creation/update in several modules (`FlowchartDTO`, `SemesterDTO`, etc.).
- Exception strategy is centralized through `GlobalExceptionHandler` + per-domain exception types.

## Fast Orientation Checklist for Future Work
1. Start with `SpringConfiguration`, `JwtAuthenticationFilter`, `UserService` for auth-related bugs.
2. For flowchart issues, read `FlowchartService` + `SemesterService` + `Dashboard/Flowchart.tsx`.
3. For transcript ingestion, inspect `AcademicProgressParser` and `AcademicProgressService` first.
4. Verify any backend endpoint auth rule in `SpringConfiguration` before debugging 401/403.
5. Confirm frontend is calling endpoint via `axiosClient` (token) versus raw `axios/fetch` (possible inconsistency).
