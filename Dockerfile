# Stage 1: Build Java Application
FROM eclipse-temurin:21-jdk AS builder
WORKDIR /build
COPY backend/pom.xml .
COPY backend/src ./src
RUN apt-get update && apt-get install -y --no-install-recommends unzip wget \
    && rm -rf /var/lib/apt/lists/* \
    && WGET_ARGS="--no-check-certificate" wget -q \
       "https://dlcdn.apache.org/maven/maven-3/3.9.9/binaries/apache-maven-3.9.9-bin.zip" \
       -O /tmp/maven.zip \
    && unzip -q /tmp/maven.zip -d /opt \
    && ln -sf /opt/apache-maven-3.9.9/bin/mvn /usr/local/bin/mvn \
    && rm /tmp/maven.zip
ENV PATH="/usr/local/bin:${PATH}"
RUN mvn dependency:go-offline -B || true
RUN mvn clean package -DskipTests

# Stage 2: Minimal Runtime Environment
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /build/target/*.jar app.jar
EXPOSE 8084
ENV PORT=8084
ENTRYPOINT ["java", "-jar", "app.jar", "--server.port=8084"]
