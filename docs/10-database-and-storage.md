# Penyimpanan Database Asinkron: SQLite & HikariCP di Paper

Menyimpan data pemain (uang/ekonomi, statistik level, inventaris kustom, quest) langsung ke file YAML (`config.yml` atau `player.yml`) sering kali menjadi lambat dan berisiko korup jika server memiliki ribuan pemain unik.

Standar industri untuk penyimpanan data di plugin produksi adalah menggunakan database relasional (seperti **SQLite** untuk server mandiri, atau **MySQL/PostgreSQL via HikariCP** untuk jaringan multi-server/BungeeCord).

---

## 1. Aturan Emas Database di Minecraft

> **DILARANG KERAS menjalankan koneksi database, query `SELECT`, atau `INSERT/UPDATE` di main/region tick thread.**
> Query yang memakan waktu 50ms akan langsung menyebabkan TPS server turun dan pemain mengalami lag atau rollback.

Gunakan selalu **Asynchronous Execution (`CompletableFuture`)** yang me-return hasil ke thread region pemain saat selesai.

---

## 2. Menyiapkan HikariCP (Connection Pooling)

HikariCP adalah library connection pool tercepat di ekosistem Java (digunakan secara ekstensif oleh **LuckPerms**).

### Dependensi Gradle:
```kotlin
dependencies {
    implementation("com.zaxxer:HikariCP:5.1.0")
}
```

### Inisialisasi DataSource:
```java
package com.example.plugin.database;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;

import java.sql.Connection;
import java.sql.SQLException;

public final class DatabaseManager {

    private HikariDataSource dataSource;

    public void initMySQL(String host, int port, String database, String user, String password) {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl("jdbc:mysql://" + host + ":" + port + "/" + database + "?useSSL=false&characterEncoding=utf-8");
        config.setUsername(user);
        config.setPassword(password);

        // Pengaturan Pool HikariCP yang Direkomendasikan
        config.setMaximumPoolSize(10);
        config.setMinimumIdle(2);
        config.setConnectionTimeout(10000); // 10 detik
        config.setIdleTimeout(600000);      // 10 menit
        config.setMaxLifetime(1800000);     // 30 menit
        config.setPoolName("PluginHikariPool");

        this.dataSource = new HikariDataSource(config);
    }

    public void initSQLite(String filePath) {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl("jdbc:sqlite:" + filePath);
        config.setMaximumPoolSize(1); // SQLite hanya boleh 1 writer pool
        config.setPoolName("PluginSQLitePool");

        this.dataSource = new HikariDataSource(config);
    }

    public Connection getConnection() throws SQLException {
        return dataSource.getConnection();
    }

    public void close() {
        if (dataSource != null && !dataSource.isClosed()) {
            dataSource.close();
        }
    }
}
```

---

## 3. Repositori Asinkron dengan `CompletableFuture`

Buat Data Access Object (DAO) yang memisahkan eksekusi SQL dari logika game:

```java
package com.example.plugin.database;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class PlayerRepository {

    private final DatabaseManager databaseManager;
    private final ExecutorService dbExecutor = Executors.newFixedThreadPool(3);

    public PlayerRepository(DatabaseManager databaseManager) {
        this.databaseManager = databaseManager;
        createTableIfNotExists();
    }

    private void createTableIfNotExists() {
        try (Connection conn = databaseManager.getConnection();
             PreparedStatement stmt = conn.prepareStatement(
                 "CREATE TABLE IF NOT EXISTS player_data (" +
                 "uuid VARCHAR(36) PRIMARY KEY, " +
                 "coins INT NOT NULL DEFAULT 0, " +
                 "level INT NOT NULL DEFAULT 1);"
             )) {
            stmt.executeUpdate();
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }

    // Membaca data pemain secara asinkron
    public CompletableFuture<Integer> getCoinsAsync(UUID uuid) {
        return CompletableFuture.supplyAsync(() -> {
            try (Connection conn = databaseManager.getConnection();
                 PreparedStatement stmt = conn.prepareStatement(
                     "SELECT coins FROM player_data WHERE uuid = ?"
                 )) {
                stmt.setString(1, uuid.toString());
                try (ResultSet rs = stmt.executeQuery()) {
                    if (rs.next()) {
                        return rs.getInt("coins");
                    }
                }
            } catch (SQLException e) {
                e.printStackTrace();
            }
            return 0; // Default jika data belum ada
        }, dbExecutor);
    }

    // Menyimpan data pemain secara asinkron (Upsert)
    public CompletableFuture<Void> setCoinsAsync(UUID uuid, int coins) {
        return CompletableFuture.runAsync(() -> {
            try (Connection conn = databaseManager.getConnection();
                 PreparedStatement stmt = conn.prepareStatement(
                     "INSERT INTO player_data (uuid, coins) VALUES (?, ?) " +
                     "ON CONFLICT(uuid) DO UPDATE SET coins = excluded.coins;" // SQLite & Postgres (gunakan ON DUPLICATE KEY UPDATE untuk MySQL)
                 )) {
                stmt.setString(1, uuid.toString());
                stmt.setInt(2, coins);
                stmt.executeUpdate();
            } catch (SQLException e) {
                e.printStackTrace();
            }
        }, dbExecutor);
    }

    public void shutdown() {
        dbExecutor.shutdown();
    }
}
```

---

## 4. Menggunakan Hasil Database di Event Listener

Saat data selesai di-fetch dari database, gunakan scheduler Folia/Paper pemain untuk menerapkan perubahannya ke objek Bukkit:

```java
@EventHandler
public void onPlayerJoin(PlayerJoinEvent event) {
    Player player = event.getPlayer();

    // Fetch data koin di thread asinkron
    playerRepository.getCoinsAsync(player.getUniqueId()).thenAccept(coins -> {
        // Terapkan hasil ke entity pemain di thread region pemain
        player.getScheduler().run(plugin, task -> {
            player.sendActionBar(MiniMessage.miniMessage().deserialize(
                "<gold>Saldo Koin: <yellow>" + coins + "</yellow></gold>"
            ));
        }, null);
    });
}
```
