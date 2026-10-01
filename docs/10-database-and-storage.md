# Asynchronous Database Storage: SQLite & HikariCP in Paper

Storing player profiles (economy balances, levels, custom inventories, quests) directly into YAML files (`config.yml` or `player.yml`) degrades performance rapidly and invites file corruption when scaling to thousands of unique users.

The industry standard for production storage is relational databases (**SQLite** for standalone single servers, or **MySQL / PostgreSQL via HikariCP** for multi-server BungeeCord/Velocity networks).

---

## 1. The Golden Rule of Minecraft Database Access

> **NEVER open database connections, execute `SELECT` queries, or run `INSERT/UPDATE` statements on the main or region tick threads.**
> A single query taking 50ms immediately causes TPS drops, player rubberbanding, and tick watchdog warnings.

Always execute database operations via **Asynchronous Threads (`CompletableFuture`)**, and dispatch results back to the player's entity scheduler when mutating game state.

---

## 2. Configuring HikariCP (High-Performance Connection Pooling)

HikariCP is the fastest connection pool in the Java ecosystem (utilized extensively by **LuckPerms**).

### Gradle Dependency:
```kotlin
dependencies {
    implementation("com.zaxxer:HikariCP:5.1.0")
}
```

### Initializing the DataSource:
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

        // Recommended HikariCP Pool Settings
        config.setMaximumPoolSize(10);
        config.setMinimumIdle(2);
        config.setConnectionTimeout(10000); // 10 seconds
        config.setIdleTimeout(600000);      // 10 minutes
        config.setMaxLifetime(1800000);     // 30 minutes
        config.setPoolName("PluginHikariPool");

        this.dataSource = new HikariDataSource(config);
    }

    public void initSQLite(String filePath) {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl("jdbc:sqlite:" + filePath);
        config.setMaximumPoolSize(1); // SQLite only supports a single writer
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

## 3. Asynchronous DAO Pattern with `CompletableFuture`

Construct a Data Access Object (DAO) to cleanly decouple raw SQL execution from in-game mechanics:

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

    // Read player balance asynchronously
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
            return 0; // Default fallback
        }, dbExecutor);
    }

    // Persist player balance asynchronously
    public CompletableFuture<Void> setCoinsAsync(UUID uuid, int coins) {
        return CompletableFuture.runAsync(() -> {
            try (Connection conn = databaseManager.getConnection();
                 PreparedStatement stmt = conn.prepareStatement(
                     "INSERT INTO player_data (uuid, coins) VALUES (?, ?) " +
                     "ON CONFLICT(uuid) DO UPDATE SET coins = excluded.coins;" // SQLite / PostgreSQL
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

## 4. Applying Query Results in Event Listeners

When asynchronous database queries resolve, schedule execution back to the player's entity scheduler to mutate Bukkit state:

```java
@EventHandler
public void onPlayerJoin(PlayerJoinEvent event) {
    Player player = event.getPlayer();

    // Fetch coins asynchronously off the tick thread
    playerRepository.getCoinsAsync(player.getUniqueId()).thenAccept(coins -> {
        // Dispatch result safely onto the player's entity region thread
        player.getScheduler().run(plugin, task -> {
            player.sendActionBar(MiniMessage.miniMessage().deserialize(
                "<gold>Balance: <yellow>" + coins + " Coins</yellow></gold>"
            ));
        }, null);
    });
}
```
