# CourseFlow
CourseFlow is a Senior Design Project built to help students and advisors have an easier time navigating and understanding what's necessary for the student in order to graduate

# For Devs
## Building/Running the Project
### Prerequisites
- Have Docker installed (and Docker for Desktop Running)
- Have Node and NPM installed 
### Navigate to the `\courseflow\courseflow` folder
For Local Development
  * Linux/macOS bash:
    * Build with `./mvnw clean package`
    * Run packaged app with `java -jar ./target/courseflow-0.0.1-SNAPSHOT.jar`
    * Or use fast reload with `./mvnw spring-boot:run`
  * Windows PowerShell:
    * Build with `.\mvnw.cmd clean package`
    * Run packaged app with `java -jar .\target\courseflow-0.0.1-SNAPSHOT.jar`
    * Or use fast reload with `.\mvnw.cmd spring-boot:run`

[//]: # (* Building for Docker &#40;Also can be used for local development&#41; )

[//]: # (  * Run `docker build -t courseflow .`)

[//]: # (  * Run `docker run -p 8080:8080 courseflow`)

# Development Practices
## Backend Structure
The backend follows best practices of Spring Development using the MVC development pattern to build out
features. Below is the 4 main folders of the backend and how they should be used when developing.
### Controller
Houses all the REST endpoints
* Example - UserController (CRUD operations for the user)
### Exception
Houses the GlobalException Handler which includes the defined exception classes
* Example - UserNotFoundException (Throws errors for all operations that have todo with retrieving an account)
### Model
Houses all the JPA entities
* Example - User (id, Name, email...)
### Repository
Houses all the interfaces with the Database
* Example - UserRepository (query for a user based off of a parameter)
### Security
Houses the security config file for the Spring Security. If you have an issue with endpoints or requests, this is probably the culprit.
### Service
Houses all the business logic and helper services
* Example - UserService (Encrypt the password for the user when signing up)
## Database
Database and JWT configuration should be provided through environment variables rather than committed
operational credentials. The default public-safe configuration in `src/main/resources/application.properties`
expects these values:
* `COURSEFLOW_DB_URL`
* `COURSEFLOW_DB_USERNAME`
* `COURSEFLOW_DB_PASSWORD`
* `COURSEFLOW_JWT_SECRET`

Example local development setup:
* `COURSEFLOW_DB_URL=jdbc:postgresql://localhost:5432/courseflow`
* `COURSEFLOW_DB_USERNAME=courseflow`
* `COURSEFLOW_DB_PASSWORD=courseflow`
* `COURSEFLOW_JWT_SECRET=replace-with-a-long-random-local-secret`

Spring profile shortcuts:
* Default config uses the local Postgres defaults from `src/main/resources/application.properties`
* To use the legacy shared database instead, activate the `olddb` profile:
  * Linux/macOS Maven run: `./mvnw spring-boot:run -Dspring-boot.run.profiles=olddb`
  * Linux/macOS packaged jar: `java -jar ./target/courseflow-0.0.1-SNAPSHOT.jar --spring.profiles.active=olddb`
  * Windows Maven run: `.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=olddb"`
  * Windows packaged jar: `java -jar .\target\courseflow-0.0.1-SNAPSHOT.jar --spring.profiles.active=olddb`

Uploaded profile pictures are runtime data and should stay out of git.

## Iowa State Degree Data Import
CourseFlow now includes a JSON importer for major requirement data used by Requirement Coverage and Smart Scheduler.

Endpoints:
* `GET /api/majors/isu/template` - returns a sample payload structure
* `POST /api/majors/isu/import` - import JSON payload in request body
* `POST /api/majors/isu/import/file` - import a `.json` file via multipart form field `file`

Template file:
* `docs/isu-degree-import-template.json`

Optional scraper to generate a majors dataset from the online ISU catalog:
* Script: `webscraper/isu_degree_scraper.py`
* Example:
  * `python webscraper/isu_degree_scraper.py --output docs/isu-degree-dataset.json --catalog-year 2026-2027 --include-courses`
* Then import:
  * `POST /api/majors/isu/import/file` with `docs/isu-degree-dataset.json`

## Iowa State Professor Reviews Module
CourseFlow now includes a professor browsing + review module, plus an ISU faculty scraper/import flow.
It also supports admin-imported external rating snapshots so professor pages can show approved third-party summaries or outbound profile links alongside native CourseFlow reviews.

On startup, the app now auto-seeds the bundled ISU professor dataset only when the `professors` table is empty. It also auto-imports the bundled Rate My Professors link seed for the current Software Engineering faculty matches after the professor directory is available. Manual admin import is still available if you want to refresh or overwrite the directory later.
Existing professor rows are also normalized on startup so department filters stay clean even if older imported records included title or degree noise.

Endpoints:
* `GET /api/professors` - browse/search professors
* `GET /api/professors/status` - directory readiness for first-time seeding
* `GET /api/professors/{id}` - professor detail + rating summary
* `GET /api/professors/{id}/reviews` - paged reviews
* `POST /api/professors/{id}/reviews` - create review (student role)
* `PUT /api/professors/{id}/reviews/me` - update own review
* `DELETE /api/professors/{id}/reviews/me` - delete own review

Admin import endpoints:
* `POST /api/admin/professors/import` - import JSON payload
* `POST /api/admin/professors/import/file` - import JSON file with multipart `file`
* `POST /api/admin/professors/external-ratings/import` - import external rating snapshot payload
* `POST /api/admin/professors/external-ratings/import/file` - import external rating snapshot JSON file

Faculty scraper:
* Script: `webscraper/isu_professor_scraper.py`
* Example:
  * `python webscraper/isu_professor_scraper.py --output docs/isu-professors-dataset.json`
* Import scraped data:
  * `POST /api/admin/professors/import/file` with `docs/isu-professors-dataset.json`

External rating snapshot template:
* `docs/professor-external-ratings-template.json`
Bundled Software Engineering Rate My Professors links:
* `src/main/resources/seed/professor-external-ratings-rmp-software-engineering.json`

Notes for external rating imports:
* Snapshots are stored separately from CourseFlow student reviews.
* Each rating row should identify a local professor by `professorId` or by `professorName`, with `department` optional when the professor name is already unique in the local directory.
* `sourceSystem` is required for each snapshot row.
* `averageRating` and `reviewCount` are optional when you only want to provide an external profile link; include both when you want to import a real rating snapshot.
* For Rate My Professors, use `RATE_MY_PROFESSORS` as the `sourceSystem`.
