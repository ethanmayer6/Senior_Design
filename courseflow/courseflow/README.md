# CourseFlow
CourseFlow is a Senior Design Project built to help students and advisors have an easier time navigating and understanding what's necessary for the student in order to graduate

# For Devs
## Building/Running the Project
### Prerequisites
- Have Docker installed (and Docker for Desktop Running)
- Have Node and NPM installed 
### Navigate to the `\courseflow\courseflow` folder
You have two options for building the project
* For Local Development
  * Run `./mvnw clean package` to build project
  * Run `java -jar target\courseflow-0.0.1-SNAPSHOT.jar` to run project in localhost:8080
  * OR for fast reload during development use `./mvnw spring-boot:run`
* Building for Docker (Also can be used for local development) DO THIS BEFORE PUSHING CHANGES
  * Run `docker build -t courseflow .`
  * Run `docker run -p 8080:8080 courseflow`
