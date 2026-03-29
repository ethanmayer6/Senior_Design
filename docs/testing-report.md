# CourseFlow Testing Report

Date of report: March 29, 2026

## Executive Summary

CourseFlow was tested as a layered web system rather than as a loose collection of screens and endpoints. The strongest evidence is on the backend, where the current verified run completed 167 passing JUnit/Spring tests across 40 test classes with 62.12% backend line coverage and zero failures. The frontend adds 49 passing Vitest tests and 1 passing Playwright browser test, bringing the current automated total to 217 passing tests.

The test suite now exercises the parts of the product that matter most to the project requirements: authenticated user access, role-based admin protection, transcript and class-schedule import, flowchart generation and updates, course and professor review workflows, dining aggregation, games, badges, and accessibility-sensitive UI behaviors. The remaining weakness is not in core backend correctness, but in uneven frontend breadth and in the thinner documentation of human-subject acceptance and user-testing sessions.

| Layer | Tools | Verified result on March 29, 2026 |
| --- | --- | --- |
| Backend unit, controller, repository, and security tests | JUnit 5, Mockito, Spring Boot Test, MockMvc, Spring Security Test, H2, JaCoCo | 167 passed, 0 failed |
| Frontend unit and component tests | Vitest, React Testing Library, jest-axe | 49 passed, 0 failed |
| Browser-level end-to-end test | Playwright | 1 passed, 0 failed |
| Combined automated total | All of the above | 217 passed, 0 failed |

## 5.1 Unit Testing

Unit testing was used first to stabilize business rules, parsing logic, and controller contracts before those behaviors were composed into larger interface and integration paths. The current backend JaCoCo report shows 62.12% line coverage, 62.45% instruction coverage, and 44.25% branch coverage. In raw terms, 3,336 of 5,370 backend lines were executed during the verified run, and 149 backend classes recorded non-zero line coverage.

The units under direct test are concentrated in the system's highest-value service and controller classes:

- Authentication, users, and security: `UserService`, `UserController`, `AdminController`, `JwtService`, `GlobalExceptionHandler`, `WebConfig`, and `FileStorageService`
- Academic planning and catalog logic: `CourseService`, `CourseController`, `CourseReviewService`, `CourseReviewController`, `MajorService`, `MajorController`, `DegreeRequirementService`, `DegreeRequirementController`, `RequirementGroupService`, `RequirementGroupController`, and `SemesterService`
- Flowchart and planning workflows: `FlowchartService`, `FlowchartController`, `FlowchartCommentService`, `AcademicProgressParser`, `AcademicProgressService`, `AcademicProgressController`, `ClassScheduleImportParser`, `ClassScheduleImportService`, `ClassScheduleImportController`, and `IsuDegreeImportService`
- Student-facing feature modules: `ProfessorDirectoryNormalizer`, `ProfessorService`, `ProfessorController`, `AdminProfessorController`, `DiningService`, `DiningController`, `GamesService`, `GamesController`, and `BadgeService`

These units were tested in the style most appropriate to the code under examination. Pure logic and parsing classes were tested with JUnit assertions over controlled inputs and expected outputs. Service classes were tested with Mockito-backed collaborators so that business rules could be isolated and failure paths could be forced deliberately. Controller classes were tested with `@WebMvcTest` and `MockMvc`, which allowed the team to verify request validation, HTTP status codes, JSON shape, pagination parameters, multipart file handling, and authenticated principal forwarding without booting the full application context for every test.

Representative unit-level examples include:

- `JwtServiceTest`, which verifies token creation, subject extraction, expiration handling, and rejection of tokens presented for the wrong user
- `CourseServiceTest`, which verifies prerequisite normalization, duplicate handling, and course dependency logic
- `AcademicProgressParserTest`, which verifies spreadsheet normalization and enforces a five-second parsing budget on a 400-row workbook
- `ClassScheduleImportParserTest`, which verifies schedule extraction, date/time normalization, and a five-second parsing budget on a 300-row workbook
- `DiningServiceTest`, which verifies menu normalization, dietary-tag mapping, and fallback behavior when the upstream dining detail call fails
- `ProfessorDirectoryNormalizerTest`, which verifies department normalization so filter options are not polluted by titles and degree suffixes

The main backend tools used for unit testing were JUnit 5, AssertJ, Mockito, Spring's slice-test annotations, MockMvc, and JaCoCo. Together they gave both behavioral confidence and a publishable coverage artifact.

The classes that still lack sufficient direct test depth fall into a few recognizable groups:

- Startup and background import helpers, especially `ProfessorDataInitializer`, `ProfessorImportParsers`, and the chunked import job support types under `importer.isu`
- DTO and response-wrapper classes that are mostly exercised indirectly through serialization rather than targeted tests, including `FlowchartDTO`, several nested flowchart response records, `SemesterDTO`, and `CourseUpdateRequest`
- Exception-only classes such as `MajorNotFoundException`, `SemesterNotFoundException`, and `RequirementGroupNotFoundException`, which are low-risk but still uncovered

Those gaps matter less than missing service or security coverage, but they are the next logical place to improve if the team wants to raise coverage beyond the low-60% range.

## 5.2 Interface Testing

In CourseFlow, "interface testing" means more than checking that an endpoint returns a `200`. The project has several important interfaces:

- The REST interface between the React client and the Spring controllers
- The authentication interface between bearer tokens, the JWT filter, and protected controllers
- The multipart file-upload interface used by transcript and class-schedule imports
- The external data interface between CourseFlow and Iowa State Dining's live menu feed

These interfaces were tested with Spring `MockMvc` on the backend and with Vitest plus mocked API clients on the frontend. The goal was to verify not only successful requests, but also interface shape, authentication requirements, pagination/filter parameters, error translation, and failure recovery.

Two representative API interfaces that were directly tested are shown below.

| Endpoint | Interface behavior under test | Verified result |
| --- | --- | --- |
| `GET /api/professors?query=ada&department=SE&page=2&size=20&sort=rating` | Query-parameter forwarding from controller to service and correct paged JSON response shape | Returned HTTP 200, included professor `"Dr. Ada"`, and preserved the requested `"rating"` sort field |
| `POST /api/progressReport/flowchart` | Authenticated multipart upload, service orchestration, and structured flowchart response | Returned HTTP 200 for an authenticated user, included `COMS_2270` in the returned course graph, preserved `completedCourses`, and returned the expected `academicPeriods` map; returned HTTP 401 when the same endpoint was called without authentication |

Interface testing also surfaced two issues worth documenting because they are the kind faculty reviewers expect real teams to discover:

- Controller tests alone can give a false sense of security if the real JWT filter chain is bypassed. That gap was closed by adding `ApiSecurityIntegrationTest`, which exercises the deployed authentication path instead of only the controller contract.
- The Iowa State Dining detail endpoint can fail even when the summary feed is still available. Rather than allow that upstream failure to break the page, `DiningService` now falls back to summary hours and returns a warning message stating that live menu details are temporarily unavailable.

The important point is that interface testing in this project checked the seams between units, not just the units themselves. Query parameters, request bodies, multipart uploads, authentication headers, and third-party JSON payloads were all treated as first-class test subjects.

## 5.3 Integration Testing

The critical integration paths in CourseFlow come directly from the system's core responsibilities: authenticate the correct user, transform academic data into a usable plan, synchronize schedule information with the student's flowchart, and enforce role boundaries around protected operations. A failure in any of those paths would not be a cosmetic defect; it would undermine the central promise of the project.

The most important integration paths currently under test are:

- JWT authentication and role enforcement from HTTP request to controller principal
- Academic progress import from spreadsheet parsing to flowchart generation
- Class-schedule import from spreadsheet parsing to semester synchronization and in-progress course marking
- Repository-backed course lookup and search behavior
- External dining aggregation from upstream feed to normalized CourseFlow response objects

One full integration scenario that is already well-supported by the suite is class-schedule synchronization. In `ClassScheduleImportServiceTest`, the service receives a mock spreadsheet upload, parses two Fall 2026 classes, looks up those course identifiers in the course catalog, deletes any previously stored entries for that same term, persists the new schedule rows, creates or updates the correct semester, and marks the matched catalog course as `IN_PROGRESS` in the student's flowchart. The test then verifies the concrete outcomes that matter to users: two rows were imported, one class was linked to a known catalog course, one semester was touched, the flowchart status map was updated correctly, and both schedule entries were persisted with the expected catalog linkage behavior.

The suite also contains a true Spring-context integration test for the security path. `ApiSecurityIntegrationTest` boots the application with the real security chain, saves users through the repository, generates real JWTs, and then calls protected endpoints through `MockMvc`. That test proves four separate integration facts:

- `GET /api/users/me` returns `401 Unauthorized` with no token
- A valid token allows access and hydrates the correct authenticated principal
- A non-admin token is rejected from `/api/admin/users` with `403 Forbidden`
- An admin token is allowed through the same path and reaches the controller successfully

The integration-tool set for these paths was JUnit 5, Spring Boot Test, MockMvc, Mockito, H2-backed JPA testing, and repository assertions. The result is not merely unit confidence; it is confidence that multiple layers work together in the order real requests use them.

## 5.4 System Testing

System-level testing in CourseFlow is built as a layered strategy rather than a single monolithic script. The backend suite verifies business rules, controller contracts, repositories, and the real security chain. The frontend suite verifies API wrappers, route gating, page rendering, notification behavior, and accessibility-sensitive interactions. Playwright adds a real browser pass so the team can confirm that at least one end-user workflow still behaves correctly when the application is rendered and executed in Chromium.

For this project, the combination that is most useful for system confidence is:

- Backend service and controller tests for correctness of planning, reviews, and account flows
- Security integration tests for authentication and admin authorization
- Repository integration tests for persistence/query behavior
- Frontend component and page tests for rendering, state changes, and failure messaging
- Browser automation for a real user workflow

The current full system-level execution that supports this report was run on March 29, 2026:

| Command | Purpose | Result |
| --- | --- | --- |
| `./mvnw -q -P '!frontend' -Dmaven.repo.local=/tmp/courseflow-m2 verify` | Backend tests plus JaCoCo report generation | 167 passed, 0 failed |
| `npm run test:run -- --coverage` | Frontend unit/component tests plus coverage | 49 passed, 0 failed |
| `npm run test:e2e` | Browser-level system check | 1 passed, 0 failed |

The Playwright run is especially useful as system evidence because it drives the actual browser, opens `/courseflow`, confirms that the first-time walkthrough dialog is visible, dismisses it through the UI, and then verifies that the dismissal state is persisted to `localStorage`. That test does not replace broader system testing, but it does demonstrate that the application can render, respond to user actions, and preserve state correctly in a real browser session.

## 5.5 Regression Testing

Regression testing in CourseFlow is centered on the features most likely to break when new work is added:

- login, registration, and authenticated user lookup
- admin-only user management
- transcript parsing and flowchart creation
- class-schedule import and semester synchronization
- course and professor review workflows
- dining feed normalization and failure fallback
- frontend route protection, walkthrough behavior, and notification handling

Because the repository snapshot does not include a CI pipeline configuration, regression testing is currently developer-driven rather than server-scheduled. In practice, the same three commands used for this report function as the regression gate: backend `verify`, frontend `test:run -- --coverage`, and Playwright `test:e2e`. The full suite was rerun for this report on March 29, 2026, and that same suite should be rerun after changes to shared APIs, security rules, import logic, or major user-facing pages.

The regression design is requirement-driven. The team protected the features that define the product's value proposition: students must still be able to sign in, import academic data, view or update a flowchart, browse course and professor information, and interact with the system without role leaks or broken navigation. That is why the regression suite reaches across backend services, REST controllers, repository behavior, accessibility-sensitive components, and the browser walkthrough itself.

## 5.6 Acceptance Testing

Acceptance testing for CourseFlow should be understood as requirement-centered demonstration. The project is not trying to prove that isolated methods work; it is trying to prove that the delivered design satisfies the system objectives promised to the client. In the current repository snapshot, the automated side of that evidence is strong:

- Secure account access is supported by tests around login, registration, JWT validation, and protected endpoints.
- Degree-planning support is covered by transcript parsing, flowchart generation, requirement-coverage logic, and class-schedule synchronization tests.
- Information-discovery features are covered by course, major, professor, dining, and games tests.
- Non-functional expectations around accessibility and resilience are covered by `jest-axe` checks, focus-management tests, browser automation, and dining-fallback handling.

The weaker part of acceptance evidence is documentation of the client-facing review sessions themselves. This repository does not store meeting notes, client sign-off records, or dated acceptance checklists, so the final paper should add those details from the team's milestone records. The strongest way to present acceptance testing in the paper is to pair each major requirement with the executable evidence above and then briefly describe the client demos where those same workflows were shown end-to-end.

## 5.7 Security Testing

Security testing was applicable to this project because CourseFlow stores user identities, academic-planning information, personal preferences, reviews tied to authenticated users, profile images, and admin-only management functionality. The system therefore needed to show that data and privileged operations were not exposed to the wrong user.

The security requirements demonstrated by the current test suite are:

- JWTs are generated, parsed, and validated correctly.
- Protected endpoints reject unauthenticated requests.
- Admin-only endpoints reject normal user tokens.
- Authenticated principals are resolved to the correct user before controller logic executes.
- Review and profile actions are bound to the authenticated user rather than to untrusted request data.

The primary tools used were Spring Security Test, MockMvc, Spring Boot Test, Mockito, and JUnit 5. The most important security evidence comes from `JwtServiceTest` and `ApiSecurityIntegrationTest`. Together, those tests show both cryptographic token behavior and real enforcement through the application security chain.

This is solid functional security testing, but it should be described honestly. The current suite demonstrates authentication and authorization behavior; it is not the same as a penetration test, an OWASP scan, or a deployment hardening audit. In other words, the project has good evidence that role boundaries work as designed, but less evidence around operational hardening concerns such as secret management, dependency scanning, or adversarial fuzzing.

## 5.8 User Testing

Human-centered testing is the area where the repository currently has the least formal evidence, so it should be presented carefully. The automated suite does show that the interface has been shaped around real user tasks:

- First-time users are guided by a walkthrough that appears when they land on the CourseFlow home page and stays dismissed once they choose to continue.
- Keyboard-only users can navigate modal dialogs safely because focus trapping, escape-to-close behavior, and focus restoration are tested directly.
- Notification actions are tested for both navigation behavior and accessibility compliance.
- The dining page is tested for both normal results and failure messaging so the interface remains understandable when live data is incomplete.

Those checks matter because they test user-facing behavior, but they are not a substitute for observing real people. The final paper should therefore distinguish between usability-oriented automated tests and true user studies. If the team has already conducted live sessions, this section should be expanded with the exact participant count, user profile, session format, and observations from those sessions. If that information is not yet collected in a formal way, that should be stated openly.

## 5.9 Testing Results

The measured results from the March 29, 2026 verification run are summarized below.

| Metric | Result |
| --- | --- |
| Backend test classes executed | 40 |
| Backend tests executed | 167 |
| Backend failures/errors/skipped | 0 / 0 / 0 |
| Backend line coverage | 62.12% |
| Backend instruction coverage | 62.45% |
| Backend branch coverage | 44.25% |
| Frontend Vitest files executed | 20 |
| Frontend Vitest tests executed | 49 |
| Frontend all-files line coverage | 13.04% |
| Frontend Playwright tests executed | 1 |
| Combined automated tests passed | 217 |

The most important engineering results are not just the totals, but what those totals represent:

- Core planning workflows are covered. Transcript parsing, flowchart generation, requirement-status computation, and class-schedule synchronization all have executable tests.
- Security-critical behavior is covered. Unauthenticated and under-privileged requests are rejected in the real JWT security path.
- Persistence behavior is covered. Repository queries are exercised against an H2-backed JPA slice rather than only through mocks.
- Accessibility and resilience are covered in targeted areas. Modal dialogs and notifications pass `jest-axe`, and the dining module degrades gracefully when the upstream detail feed fails.
- Parser performance is bounded. Both academic-progress and class-schedule workbook parsers are tested against larger input sets with five-second execution budgets.
- Frontend coverage is meaningful but still uneven. APIs, utilities, routes, and a few high-value pages are covered directly, while several large screens still have light all-files coverage.

Two noteworthy usability findings emerged from the test suite and should be called out explicitly:

- The home page needed a guided first-time-use experience. That requirement is now reflected in the CourseFlow walkthrough tests, including persistence of the dismissed state for each user.
- Modal and notification interactions needed stronger keyboard and accessibility behavior. The current tests verify focus trapping, escape handling, focus restoration, actionable notifications, and axe-based accessibility compliance.

The main unresolved reporting gap is human-subject evidence. The exact number of test participants and any qualitative client or user reactions are not captured in this repository snapshot. Those details should be inserted from the team's session logs before the final paper is submitted.

Taken as a whole, the results support a clear conclusion: CourseFlow's backend is in a credible, measurable testing state, and the highest-risk requirements are backed by executable evidence. The frontend testing story is real and improving, especially in APIs, routes, accessibility, and browser behavior, but it is still not as deep as the backend. The next gains will come less from adding more categories of automated tests and more from expanding frontend breadth and documenting formal client and user acceptance sessions with the same care already applied to the code-facing test suite.
