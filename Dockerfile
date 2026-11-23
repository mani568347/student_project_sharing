# Build stage - use official Maven image (already has Java + Maven)
FROM maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /build
COPY backend/pom.xml .
COPY backend/src ./src
RUN mvn clean package -DskipTests

# Runtime stage - minimal JRE image
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /build/target/*.jar app.jar
EXPOSE 8084
ENV PORT=8084
ENTRYPOINT ["java", "-jar", "app.jar", "--server.port=8084"]
