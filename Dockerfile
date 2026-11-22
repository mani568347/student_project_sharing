# Stage 1: Build Java Application
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /build
COPY backend/mvnw .
COPY backend/.mvn .mvn
COPY backend/pom.xml .
RUN chmod +x ./mvnw
# Download dependencies first for caching
RUN ./mvnw dependency:go-offline -B || true
COPY backend/src src
RUN ./mvnw clean package -DskipTests

# Stage 2: Minimal Runtime Environment
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /build/target/*.jar app.jar
EXPOSE 8084
ENV PORT=8084
ENTRYPOINT ["java", "-jar", "app.jar", "--server.port=8084"]
