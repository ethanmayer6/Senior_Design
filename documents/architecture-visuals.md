# Architecture Visuals

This file complements `architecture-overview.md` with diagrams that help a new teammate understand how CourseFlow is put together.

## 1. System Context

```mermaid
flowchart LR
    U["Student / Advisor"] --> B["Browser"]
    B --> FE["React + Vite Frontend"]
    FE --> API["Spring Boot API"]
    API --> DB["Database<br/>PostgreSQL or local H2"]
    API --> Seed["Bundled Seed Data<br/>docs/ and resources/seed"]
    API --> Static["Built Frontend Assets<br/>src/main/resources/static"]
```

## 2. Runtime Modes

```mermaid
flowchart TD
    Start["Run start-courseflow-dev.ps1"] --> Check["Check VM DB reachability"]
    Check -->|Reachable| VM["Use start-courseflow-vm.ps1"]
    Check -->|Not reachable| Local["Use start-courseflow-local.ps1"]
    VM --> Pg["PostgreSQL on team VM"]
    Local --> H2["Local H2 database under .courseflow/"]
    Pg --> App["CourseFlow on localhost:8080"]
    H2 --> App
```

## 3. Frontend Request Flow

```mermaid
sequenceDiagram
    participant User
    participant Page as React Page
    participant Api as src/api wrapper
    participant Controller as Spring Controller
    participant Service as Service Layer
    participant Repo as Repository
    participant DB as Database

    User->>Page: Open page / trigger action
    Page->>Api: Call typed API helper
    Api->>Controller: HTTP request
    Controller->>Service: Validate and dispatch
    Service->>Repo: Query or update data
    Repo->>DB: SQL / JPA persistence
    DB-->>Repo: Data
    Repo-->>Service: Entities / results
    Service-->>Controller: DTO / response model
    Controller-->>Api: JSON response
    Api-->>Page: Parsed data
    Page-->>User: Updated UI
```

## 4. Build And Packaging Flow

```mermaid
flowchart LR
    FECode["Frontend source<br/>src/main/client"] --> NpmBuild["npm run build:backend"]
    NpmBuild --> StaticOut["Built assets copied into<br/>src/main/resources/static"]
    BECode["Backend source<br/>src/main/java"] --> Maven["mvnw package"]
    StaticOut --> Maven
    Maven --> Jar["courseflow-0.0.1-SNAPSHOT.jar"]
    Jar --> Run["Run on localhost:8080"]
```

## 5. Data Seeding And Import Pipeline

```mermaid
flowchart TD
    Docs["docs/ datasets and templates"] --> Degree["ISU degree dataset"]
    Docs --> Professors["ISU professor dataset"]
    Docs --> External["Professor external ratings template"]

    Degree --> SeedMajors["Major import / local seed initializer"]
    Professors --> SeedProfs["Professor import / startup seed"]
    External --> Ratings["External ratings import"]

    SeedMajors --> DB["Database"]
    SeedProfs --> DB
    Ratings --> DB

    DB --> Signup["Register page major dropdown"]
    DB --> Planning["Dashboard / Majors Browse / Smart Scheduler"]
    DB --> Reviews["Professor reviews pages"]
```

## 6. Product Area Map

```mermaid
flowchart TD
    CF["CourseFlow"] --> Plan["Plan"]
    CF --> Semester["Current Semester"]
    CF --> Explore["Explore"]
    CF --> Profile["Profile & Social"]
    CF --> More["More"]

    Plan --> Dashboard["Flowchart Dashboard"]
    Plan --> Scheduler["Smart Scheduler"]
    Plan --> Catalog["Course Catalog"]
    Plan --> Majors["Majors Browse"]

    Semester --> Current["Current Classes"]

    Explore --> CourseReviews["Course Reviews"]
    Explore --> ProfessorReviews["Professor Reviews"]

    Profile --> UserProfile["Profile"]
    Profile --> Friends["Friends / Student Search"]
    Profile --> Badges["Course Badges"]
    Profile --> Settings["Settings"]

    More --> Dining["Dining"]
    More --> Games["Games"]
    More --> Canvas["Canvas link"]
    More --> Map["Campus map link"]
```

## 7. Repo Layout Visual

```mermaid
flowchart TD
    Root["Senior_Design repo"] --> Java["src/main/java<br/>Spring backend"]
    Root --> Resources["src/main/resources<br/>config, seeds, static assets"]
    Root --> Client["src/main/client<br/>React frontend"]
    Root --> Tests["src/test/java<br/>backend tests"]
    Root --> Scripts["scripts<br/>run helpers"]
    Root --> Docs["docs<br/>datasets + templates"]
    Root --> Documents["documents<br/>teammate onboarding docs"]
```

## 8. Useful Reading Order For New Developers

```mermaid
flowchart LR
    A["developer-onboarding.md"] --> B["architecture-overview.md"]
    B --> C["architecture-visuals.md"]
    C --> D["operations-and-data.md"]
    D --> E["product-user-guide.md"]
```

## How To Use These Visuals

- Use the system context and runtime diagrams during teammate onboarding.
- Use the request flow diagram when debugging frontend-to-backend issues.
- Use the seed/import diagram when the database is empty or missing majors/professors.
- Use the product area map when planning navigation or deciding where a new feature belongs.
