package com.example.paperplugin.data;

import org.bukkit.NamespacedKey;
import org.bukkit.plugin.Plugin;

/**
 * Menyimpan konstanta NamespacedKey untuk PersistentDataContainer (PDC).
 * Selalu inisialisasi satu kali untuk menghindari alokasi objek berulang.
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
