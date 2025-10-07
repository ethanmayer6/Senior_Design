# 1) Build frontend
FROM node:20 AS frontend
WORKDIR /app/frontend
COPY src/main/client/package*.json ./
RUN npm ci
COPY src/main/client/ ./
RUN npm run build   # outputs into ../resources/static

# 2) Build backend
FROM maven:3.9-eclipse-temurin-21 AS backend
WORKDIR /app
COPY pom.xml .
RUN mvn -q -DskipTests dependency:go-offline
COPY src ./src
COPY --from=frontend /app/resources/static ./src/main/resources/static
RUN mvn -q -DskipTests -P '!frontend' package

# 3) Runtime image
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=backend /app/target/courseflow-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
