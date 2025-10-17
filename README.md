# CourseFlow
CourseFlow is a Senior Design Project built to help students and advisors have an easier time navigating and understanding what's necessary for the student in order to graduate

# For Devs
## Building/Running the Project
### Prerequisites
- Have Docker installed (and Docker for Desktop Running)
- Have Node and NPM installed 
### Navigate to the `\courseflow\courseflow` folder
For Local Development
  * Run `./mvnw clean package` to build project
    * If that doesn't work try `.\mvnw.cmd clean package`
  * Run `java -jar target\courseflow-0.0.1-SNAPSHOT.jar` to run project in localhost:8080
  * OR for fast reload during development use `./mvnw spring-boot:run`

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
### Service
Houses all the business logic and helper services
* Example - UserService (Encrypt the password for the user when signing up)
### Repository
Houses all the interfaces with the Database
* Example - UserRepository (query for a user based off of a parameter)
### Model
Houses all the JPA entities
* Example - User (id, Name, email...)
## Database
The PostGres Database is currently configured on the schools VM and all of the settings for it can be
found in the `/src/main/resources/application.properties` folder. It is configured so that when changes 
are made locally to anny of the models, then it will automatically update the DB on the server. To view
the tables/data etc, connect to the server via pgAdmin or CLI and connect to the following:
* url - sdmay26-19.ece.iastate.edu
* username - postgres
* password - password