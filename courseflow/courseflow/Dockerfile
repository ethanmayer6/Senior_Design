# ----------------------------------------------------------
# Versions as build args (easy to bump without editing stages)
# ----------------------------------------------------------
ARG NODE_VERSION=20
ARG JDK_IMAGE=eclipse-temurin:21
ARG MAVEN_IMAGE=maven:3.9-eclipse-temurin-21

# =========================
# 1) FRONTEND: build Vite
# =========================
FROM node:${NODE_VERSION} AS frontend-build
WORKDIR /app/frontend

# Install deps (cached as long as package files don't change)
COPY src/main/client/package*.json ./
RUN npm ci

# Copy the rest of the frontend and build
COPY src/main/client/ ./
# If your app uses router history mode, make sure it’s set for prod
RUN npm run build

# =========================
# 2) BACKEND: build Spring
# =========================
FROM ${MAVEN_IMAGE} AS backend-build
WORKDIR /app

# Preload dependencies for better caching (optional but helpful)
COPY pom.xml .
RUN mvn -q -DskipTests dependency:go-offline

# Copy backend sources
COPY src ./src

# Bring in the frontend build as Spring static assets
COPY --from=frontend-build /app/frontend/dist ./src/main/resources/static

# Build the Spring Boot fat JAR
RUN mvn -q -DskipTests package

# =========================
# 3) RUNTIME: slim JRE only
# =========================
FROM ${JDK_IMAGE}-jre
WORKDIR /app

# Non-root user (safer)
RUN useradd -r -u 10001 appuser
USER appuser

# Copy built artifact
COPY --from=backend-build /app/target/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java","-jar","/app/app.jar"]
