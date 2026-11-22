# Use Eclipse Temurin (Adoptium) JDK 21 image
FROM eclipse-temurin:21-jre-alpine

# Set working directory
WORKDIR /app

# Copy the built JAR from target directory
COPY backend/target/sharing-0.0.1-SNAPSHOT.jar app.jar

# Expose port 8084
EXPOSE 8084

# Run the application with explicit port
ENTRYPOINT ["java", "-jar", "app.jar", "--server.port=8084"]
