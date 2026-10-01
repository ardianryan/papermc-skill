package com.example.paperplugin.data;

import org.bukkit.NamespacedKey;
import org.bukkit.plugin.Plugin;

/**
 * Stores static NamespacedKey identifiers for PersistentDataContainer (PDC).
 * Always initialized once on plugin startup to eliminate repeated heap allocations.
 */
public final class PluginDataKeys {

    public static NamespacedKey JOIN_COUNT;
    public static NamespacedKey LAST_LOGIN_TIMESTAMP;

    private PluginDataKeys() {
    }

    public static void init(final Plugin plugin) {
        JOIN_COUNT = new NamespacedKey(plugin, "join_count");
        LAST_LOGIN_TIMESTAMP = new NamespacedKey(plugin, "last_login");
    }
}
