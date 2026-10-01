plugins {
    `java-library`
    // The run-paper plugin for instant Paper/Folia local test server execution
    id("xyz.jpenilla.run-paper") version "3.1.0"
    
    // Enable paperweight.userdev if direct Mojang NMS internals access is needed
    // id("io.papermc.paperweight.userdev") version "2.0.0-beta.21"
}

group = "com.example"
version = "1.0.0-SNAPSHOT"
description = "Modern Paper & Folia Minecraft Plugin Starter Template"

repositories {
    mavenCentral()
    maven("https://repo.papermc.io/repository/maven-public/")
    maven("https://oss.sonatype.org/content/repositories/snapshots/")
}

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(21))
    }
}

dependencies {
    // Primary Standard: Paper API (Kyori Adventure, Folia Schedulers, Brigadier, PDC)
    compileOnly("io.papermc.paper:paper-api:1.21.11-R0.1-SNAPSHOT")

    // Optional: For NMS / internal Mojang mappings (enable paperweight plugin above if using this):
    // paperweight.paperDevBundle("1.21.4.build.+")

    // Modern Nullability Annotations
    compileOnly("org.jspecify:jspecify:1.0.1")
}

tasks {
    compileJava {
        options.release.set(21)
        options.encoding = Charsets.UTF_8.name()
    }

    javadoc {
        options.encoding = Charsets.UTF_8.name()
    }

    runServer {
        minecraftVersion("1.21.4")
        jvmArgs("-Dcom.mojang.eula.agree=true")
    }
}

// Registers the './gradlew runFoliaServer' task for multi-threaded Folia local testing
runPaper.folia.registerTask()
