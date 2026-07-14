FROM eclipse-temurin:17-jre

WORKDIR /app

RUN groupadd --system app && \
    useradd --system --gid app --home-dir /app --shell /usr/sbin/nologin app

COPY backend/build/libs/*.jar /tmp/libs/

RUN set -eux; \
    jar="$(find /tmp/libs -maxdepth 1 -type f -name '*.jar' ! -name '*-plain.jar' | sort | head -n 1)"; \
    test -n "$jar"; \
    mv "$jar" /app/app.jar; \
    rm -rf /tmp/libs; \
    chown app:app /app/app.jar

USER app

EXPOSE 8080

ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-Djava.security.egd=file:/dev/./urandom", "-jar", "/app/app.jar"]
