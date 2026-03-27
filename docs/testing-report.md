# CourseFlow Testing Report

Date of report: March 26, 2026

## Executive Summary

This report summarizes the current automated testing status of the CourseFlow project as verified on March 26, 2026.

The current verified snapshot completed successfully with zero failures:

- Backend: 167 passing tests across 40 executable JUnit/Spring test classes
- Frontend unit and integration: 49 passing tests across 20 Vitest files
- Frontend browser end-to-end: 1 passing Playwright test
- Combined total: 217 passing automated tests
- Combined failures/errors: 0

The earlier gaps called out in the prior version of this report have now been directly addressed:

- every top-level backend module is represented by automated tests, and previously thin backend areas now have direct controller, service, or integration coverage
- protected API behavior is now exercised through the real JWT security filter chain
- backend coverage instrumentation is now enabled through JaCoCo
- frontend coverage now runs in an `all files` mode and spans APIs, utilities, components, routes, pages, accessibility checks, and browser automation
- the suite now includes repository-backed integration testing, automated accessibility assertions, browser-level end-to-end validation, and import performance budget checks

The project is in a materially stronger testing position than the earlier 120-test snapshot.

## Scope and Scale

Current codebase and test footprint:

- Backend production Java files: 142
- Frontend production TypeScript/TSX files: 53
- Backend test source lines: 5,386
- Frontend test source lines: 4,355
- Total automated test source lines: 9,741

## Commands and Evidence

### Backend verification command

```bash
./mvnw -q -P '!frontend' -Dmaven.repo.local=/tmp/courseflow-m2 verify
```

Backend evidence artifacts:

- `target/surefire-reports/`
- `target/site/jacoco/index.html`
- `target/site/jacoco/jacoco.xml`

### Frontend unit/integration command

```bash
cd src/main/client
npm run test:run -- --coverage
```

Frontend unit/integration evidence artifacts:

- `src/main/client/coverage/index.html`
- `src/main/client/coverage/coverage-final.json`
- `src/main/client/vitest.config.ts`

### Frontend browser end-to-end command

```bash
cd src/main/client
npm run test:e2e
```

Frontend browser test evidence artifacts:

- `src/main/client/playwright.config.ts`
- `src/main/client/tests/e2e/courseflow-home.spec.ts`

## Verified Results

### Backend results

- Test classes executed: 40
- Tests executed: 167
- Failures: 0
- Errors: 0
- Skipped: 0
- Aggregate Surefire time: 131.408 seconds

JaCoCo backend coverage from the verified run:

- Instructions: 62.45%
- Branches: 44.25%
- Lines: 62.14%
- Covered lines: 3,338 of 5,372

Backend suite breadth now includes:

- Startup and infrastructure: `CourseflowApplicationTests`, `FileStorageServiceTest`, `WebConfigTest`, `GlobalExceptionHandlerTest`, `JwtServiceTest`
- Users, admins, and security: `UserControllerTest`, `UserServiceTest`, `AdminControllerTest`, `ApiSecurityIntegrationTest`
- Courses and reviews: `CourseControllerTest`, `CourseServiceTest`, `CourseRepositoryIntegrationTest`, `CourseReviewServiceTest`, `CourseReviewControllerTest`
- Flowcharts and planning: `FlowchartServiceTest`, `FlowchartControllerTest`, `FlowchartCommentServiceTest`, `SemesterServiceTest`
- Dining, games, and badges: `DiningControllerTest`, `DiningServiceTest`, `GamesControllerTest`, `GamesServiceTest`, `BadgeServiceTest`
- Professors, majors, and requirements: `ProfessorDirectoryNormalizerTest`, `ProfessorServiceTest`, `ProfessorControllerTest`, `AdminProfessorControllerTest`, `MajorServiceTest`, `MajorControllerTest`, `DegreeRequirementServiceTest`, `DegreeRequirementControllerTest`, `RequirementGroupServiceTest`, `RequirementGroupControllerTest`
- Import and scheduling flows: `AcademicProgressParserTest`, `AcademicProgressServiceTest`, `AcademicProgressControllerTest`, `IsuDegreeImportServiceTest`, `ClassScheduleImportParserTest`, `ClassScheduleImportServiceTest`, `ClassScheduleImportControllerTest`

Important backend behaviors now under test include:

- login, registration, friend management, preference updates, and admin-only user browsing
- course lookup, search, filtering, updates, delete behavior, duplicate protection, prerequisite validation, and cycle detection
- course review creation rules plus review controller request/response behavior
- major, degree requirement, and requirement group CRUD/controller behavior
- professor directory normalization, professor review browse behavior, professor controller endpoints, and admin professor import endpoints
- academic progress parsing, flowchart generation, import controller behavior, and schedule import orchestration
- flowchart add/remove/status operations, comment-service behavior, and flowchart controller responses
- badge computation, dining parsing/fallback behavior, and daily game attempt logic
- repository-backed persistence behavior for course queries
- real JWT-protected endpoint behavior through the actual security chain
- large workbook import performance budgets for academic progress and class schedules

### Frontend results

- Vitest files executed: 20
- Vitest tests executed: 49
- Vitest failures: 0
- Vitest duration: 19.86 seconds
- Playwright specs executed: 1
- Playwright tests executed: 1
- Playwright failures: 0
- Playwright duration: 5.7 seconds

Vitest `all files` coverage from the verified run:

| File group | Statements | Branches | Functions | Lines |
| --- | ---: | ---: | ---: | ---: |
| All frontend source files | 12.92% | 7.35% | 16.02% | 13.17% |
| `src/api` | 50.40% | 42.22% | 59.25% | 49.17% |
| `src/components` | 17.29% | 12.02% | 18.51% | 16.54% |
| `src/pages` | 6.57% | 4.65% | 7.27% | 6.67% |
| `src/routes` | 100.00% | 100.00% | 100.00% | 100.00% |
| `src/utils` | 90.21% | 63.15% | 100.00% | 97.53% |

High-value frontend files with direct coverage include:

- `src/api/admin.ts`
- `src/api/axiosClient.ts`
- `src/api/classScheduleApi.ts`
- `src/api/courseReviewsApi.ts`
- `src/api/diningApi.ts`
- `src/api/flowchartApi.ts`
- `src/api/gamesApi.ts`
- `src/api/majorsApi.ts`
- `src/api/professorsApi.ts`
- `src/api/usersApi.ts`
- `src/components/FocusSafeModal.tsx`
- `src/components/NotificationCenter.tsx`
- `src/pages/CourseflowHome.tsx`
- `src/pages/Dining.tsx`
- `src/routes/AppRoutes.tsx`
- `src/utils/auth.ts`
- `src/utils/colorUtils.ts`
- `src/utils/flowchartStatus.ts`
- `src/utils/notifications.ts`
- `src/utils/theme.ts`

Frontend behavior now under test includes:

- Axios request/response behavior, logout redirect handling, and API wrapper correctness
- major, professor, flowchart, schedule, course review, games, dining, admin, and user API helpers
- notification publishing, notification rendering, action handling, and dismissal
- modal focus/escape behavior
- theme persistence, auth token parsing, flowchart-status normalization, and badge-color utilities
- CourseFlow home walkthrough behavior for first-time users
- Dining page loading, filtering, and menu rendering
- route-level gating and navigation through `AppRoutes`
- browser-level verification that the CourseFlow onboarding walkthrough appears and dismisses correctly in a real Chromium-based browser session

Accessibility coverage now exists through `jest-axe` assertions in:

- `src/main/client/src/components/FocusSafeModal.test.tsx`
- `src/main/client/src/components/NotificationCenter.test.tsx`

## Resolution of Prior Report Gaps

| Prior gap from earlier report | What was done | Status |
| --- | --- | --- |
| Backend depth still varied in admin, reviews, professors, imports, flowchart comments, and requirement controllers | Added direct tests for admin user APIs, course review controllers, professor controllers and admin import endpoints, academic progress service/controller, class schedule service/controller, flowchart controller/comment service, major controllers, requirement group controllers, degree requirement controllers, and repository-backed course persistence | Resolved |
| Controller tests did not exercise the real security filter chain | Added `ApiSecurityIntegrationTest`, which validates unauthenticated rejection, valid JWT acceptance, admin-only authorization, and principal hydration through the real filter chain | Resolved |
| No backend coverage instrumentation | Added JaCoCo to Maven verify and generated backend HTML/XML coverage artifacts | Resolved |
| Frontend coverage was narrow and did not run in `all files` mode | Added all-files Vitest coverage configuration plus new tests across API modules, utilities, components, routes, and pages | Resolved |
| No browser E2E, accessibility automation, repository integration, or performance-oriented checks | Added Playwright browser coverage, `jest-axe` accessibility assertions, repository-backed integration testing, and large-workbook parser performance budget tests | Resolved |

## Tooling Status

The earlier test-run tooling warnings were also addressed during this pass:

- the earlier Mockito inline mock-maker self-attachment warning no longer appeared after configuring the explicit Mockito Java agent in Maven Surefire
- the earlier Vitest `baseline-browser-mapping` staleness warning no longer appeared after refreshing that dependency

## Remaining Caveats

The previous report's main gap list has been addressed, but a few narrower caveats still remain and should be stated honestly:

- Frontend breadth is much better, but overall all-files frontend line coverage is still only 13.17%. Large pages such as the catalog, reviews, dashboard, majors browser, scheduler, and profile areas still have lighter direct coverage than the utility/API layers.
- Database-backed integration is now present, but it currently relies on local embedded test infrastructure rather than a separately managed PostgreSQL service instance.
- Performance coverage now includes enforceable import parsing budgets, but it is still regression-oriented performance testing rather than true concurrent load or stress testing.
- Browser automation now exists, but it currently covers one high-value onboarding workflow. Additional end-to-end specs for login, flowchart editing, reviews, and scheduling would strengthen confidence further.

## Overall Assessment

The project now has a credible automated testing story for faculty review.

It is reasonable to claim that:

- every major backend module is represented by executable automated tests
- core backend business rules, controller behavior, import logic, and JWT-protected security behavior are covered
- backend coverage is instrumented and publishable
- frontend testing now extends beyond utilities into APIs, components, routes, pages, accessibility assertions, and browser automation
- the earlier limitation list is no longer the right description of the project's current testing posture

The most important honest qualifier is not missing categories anymore; it is uneven depth. Backend depth is solid and measurable. Frontend breadth is now real, but some large screens still need more direct test depth if the team wants a substantially higher all-files coverage percentage.
