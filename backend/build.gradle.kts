buildscript {
    repositories {
        mavenCentral()
    }
    dependencies {
        classpath("org.flywaydb:flyway-database-postgresql:11.7.2")
        classpath("org.postgresql:postgresql:42.7.7")
    }
}

plugins {
    id("org.springframework.boot") version "3.5.4"
    id("io.spring.dependency-management") version "1.1.7"
    id("org.flywaydb.flyway") version "11.7.2"
    id("org.jlleitschuh.gradle.ktlint") version "12.1.1"
    kotlin("jvm") version "2.2.20"
    kotlin("plugin.spring") version "2.2.20"
    kotlin("plugin.jpa") version "2.2.20"
}

group = "com.mztrend"
version = "0.0.1-SNAPSHOT"

val jooqCodegen by configurations.creating
val jooqGeneratedDir = layout.buildDirectory.dir("generated-src/jooq/main")
val jooqConfigFile = layout.buildDirectory.file("tmp/jooq/codegen.xml")

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(17))
    }
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-aop")
    implementation("org.springframework.boot:spring-boot-starter-cache")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-data-redis")
    implementation("org.springframework.boot:spring-boot-starter-jooq")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin")
    implementation("org.flywaydb:flyway-core")
    implementation("org.flywaydb:flyway-database-postgresql")
    implementation("org.jetbrains.kotlin:kotlin-reflect")

    runtimeOnly("org.postgresql:postgresql")

    jooqCodegen("org.jooq:jooq-codegen")
    jooqCodegen("org.postgresql:postgresql")

    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.jetbrains.kotlin:kotlin-test-junit5")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

sourceSets {
    main {
        java.srcDir(jooqGeneratedDir)
    }
}

kotlin {
    compilerOptions {
        freeCompilerArgs.addAll("-Xjsr305=strict")
    }
}

ktlint {
    version.set("1.5.0")
    filter {
        exclude("**/generated-src/**")
    }
}

flyway {
    url = System.getenv("POSTGRES_URL") ?: "jdbc:postgresql://localhost:5432/mztrend"
    user = System.getenv("POSTGRES_USERNAME") ?: "mztrend"
    password = System.getenv("POSTGRES_PASSWORD") ?: "mztrend"
    locations = arrayOf("filesystem:src/main/resources/db/migration")
}

tasks.withType<Test> {
    useJUnitPlatform()
}

tasks.register<JavaExec>("generateJooq") {
    group = "jooq"
    description = "Generates jOOQ sources from the local PostgreSQL schema."

    classpath = jooqCodegen
    mainClass.set("org.jooq.codegen.GenerationTool")
    outputs.dir(jooqGeneratedDir)

    doFirst {
        val dbUrl =
            System.getenv("JOOQ_DB_URL")
                ?: System.getenv("POSTGRES_URL")
                ?: "jdbc:postgresql://localhost:5432/mztrend"
        val dbUsername =
            System.getenv("JOOQ_DB_USERNAME")
                ?: System.getenv("POSTGRES_USERNAME")
                ?: "mztrend"
        val dbPassword =
            System.getenv("JOOQ_DB_PASSWORD")
                ?: System.getenv("POSTGRES_PASSWORD")
                ?: "mztrend"
        val outputDirectory = jooqGeneratedDir.get().asFile
        val config = jooqConfigFile.get().asFile

        outputDirectory.mkdirs()
        config.parentFile.mkdirs()
        config.writeText(
            """
            <?xml version="1.0" encoding="UTF-8"?>
            <configuration>
              <jdbc>
                <driver>org.postgresql.Driver</driver>
                <url>$dbUrl</url>
                <user>$dbUsername</user>
                <password>$dbPassword</password>
              </jdbc>
              <generator>
                <database>
                  <name>org.jooq.meta.postgres.PostgresDatabase</name>
                  <inputSchema>public</inputSchema>
                  <excludes>flyway_schema_history</excludes>
                </database>
                <generate>
                  <deprecated>false</deprecated>
                  <records>true</records>
                  <fluentSetters>true</fluentSetters>
                  <javaTimeTypes>true</javaTimeTypes>
                </generate>
                <target>
                  <packageName>com.mztrend.jooq</packageName>
                  <directory>${outputDirectory.absolutePath}</directory>
                </target>
              </generator>
            </configuration>
            """.trimIndent(),
        )

        args(config.absolutePath)
    }
}

tasks.named("generateJooq") {
    dependsOn("flywayMigrate")
}

tasks.named("compileKotlin") {
    mustRunAfter("generateJooq")
}

tasks.named("compileJava") {
    mustRunAfter("generateJooq")
}

tasks.matching { it.name.contains("Ktlint") }.configureEach {
    mustRunAfter("generateJooq")
}

tasks.register("prepareJooq") {
    group = "jooq"
    description = "Applies Flyway migrations and generates jOOQ sources."

    dependsOn("generateJooq")
}
