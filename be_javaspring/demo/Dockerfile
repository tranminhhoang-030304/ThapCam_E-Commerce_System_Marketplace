# Stage 1: Build stage
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app

# Copy pom.xml and source code
COPY pom.xml .
COPY src ./src

# Build the application
RUN mvn clean package -DskipTests

# Stage 2: Runtime stage
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Copy the built jar from the build stage
COPY --from=build /app/target/*.jar app.jar

# Expose the port (Render sets PORT env automatically)
EXPOSE ${PORT:-8080}

# Run with optimized JVM for Render 512MB Free Tier
# -XX:+TieredCompilation -XX:TieredStopAtLevel=1 = Skip C2 compiler → startup 2-3x nhanh hơn
# -Xmx300m = Tăng RAM heap (Render 512MB cho phép)
# -Dspring.jmx.enabled=false = Tắt JMX monitoring không cần thiết
ENTRYPOINT ["java", "-Xmx300m", "-XX:+TieredCompilation", "-XX:TieredStopAtLevel=1", "-Dspring.jmx.enabled=false", "-jar", "app.jar"]
