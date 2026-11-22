#!/bin/bash
cd backend
./mvnw.cmd package -DskipTests
java -jar target/sharing-0.0.1-SNAPSHOT.jar