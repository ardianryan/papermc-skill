package com.example.paperplugin;

import com.example.paperplugin.data.PluginDataKeys;
import com.example.paperplugin.listener.PlayerEventListener;
import com.example.paperplugin.util.SchedulerAdapter;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.format.NamedTextColor;
import org.bukkit.plugin.java.JavaPlugin;

public final class ExamplePaperPlugin extends JavaPlugin {

    @Override
    public void onEnable() {
        // Simpan default configuration jika belum ada
        saveDefaultConfig();

        // Inisialisasi kunci PersistentDataContainer
        PluginDataKeys.init(this);

        // Registrasi Event Listener
        getServer().getPluginManager().registerEvents(new PlayerEventListener(this), this);

        // Logging dengan ComponentLogger bawaan Paper
        getComponentLogger().info(
            Component.text("ExamplePaperPlugin aktif! Running on Folia: " + SchedulerAdapter.isFolia(), NamedTextColor.GREEN)
        );
    }

    @Override
    public void onDisable() {
        getComponentLogger().info(
            Component.text("ExamplePaperPlugin dinonaktifkan.", NamedTextColor.YELLOW)
        );
    }
}
