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
        // Save default configuration if missing
        saveDefaultConfig();

        // Initialize PersistentDataContainer keys
        PluginDataKeys.init(this);

        // Register Event Listeners
        getServer().getPluginManager().registerEvents(new PlayerEventListener(this), this);

        // Log startup using Paper's native ComponentLogger
        getComponentLogger().info(
            Component.text("ExamplePaperPlugin enabled! Running on Folia: " + SchedulerAdapter.isFolia(), NamedTextColor.GREEN)
        );
    }

    @Override
    public void onDisable() {
        getComponentLogger().info(
            Component.text("ExamplePaperPlugin disabled.", NamedTextColor.YELLOW)
        );
    }
}
