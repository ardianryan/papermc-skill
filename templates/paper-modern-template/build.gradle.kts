plugins {
    `java-library`
    // Plugin run-paper untuk menjalankan test server Paper/Folia instan
    id("xyz.jpenilla.run-paper") version "3.1.0"
    
    // Aktifkan paperweight.userdev jika butuh Mojang NMS internals
    // id("io.papermc.paperweight.userdev") version "2.0.0-beta.21"
}

group = "com.example"
version = "1.0.0-SNAPSHOT"
description = "Template Plugin Paper Minecraft Modern"

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
    // Standar Utama: Paper API (Kyori Adventure, Folia Schedulers, Brigadier, PDC)
    compileOnly("io.papermc.paper:paper-api:1.21.4-R0.1-SNAPSHOT")

    // Opsional: Untuk NMS / Mojang mappings internal (aktifkan plugin paperweight di atas jika memakai ini):
    // paperweight.paperDevBundle("1.21.4.build.+")

    // Anotasi nullability
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

// Menambahkan task './gradlew runFoliaServer' untuk pengujian multi-threaded Folia
runPaper.folia.registerTask()
