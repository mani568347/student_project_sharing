# Production Dockerfile - runs pre-built Spring Boot application
# No Maven compilation needed, just runs the JAR

FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Copy pre-built Spring Boot JAR
COPY app.jar app.jar

# Allocate safe heap memory for Render 512MB limit
ENV JAVA_TOOL_OPTIONS="-Xms128m -Xmx320m -XX:+UseSerialGC"

EXPOSE 8084

# Use PORT env var dynamically set by Render
ENTRYPOINT ["sh", "-c", "java $JAVA_TOOL_OPTIONS -jar app.jar --server.port=${PORT:-8084}"]
