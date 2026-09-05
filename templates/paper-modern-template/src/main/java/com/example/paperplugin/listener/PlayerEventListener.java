package com.example.paperplugin.listener;

import com.example.paperplugin.ExamplePaperPlugin;
import com.example.paperplugin.data.PluginDataKeys;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.minimessage.MiniMessage;
import net.kyori.adventure.text.minimessage.tag.resolver.Placeholder;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.persistence.PersistentDataContainer;
import org.bukkit.persistence.PersistentDataType;

public final class PlayerEventListener implements Listener {

    private final ExamplePaperPlugin plugin;

    public PlayerEventListener(final ExamplePaperPlugin plugin) {
        this.plugin = plugin;
    }

    @EventHandler(priority = EventPriority.NORMAL, ignoreCancelled = true)
    public void onPlayerJoin(final PlayerJoinEvent event) {
        final Player player = event.getPlayer();
        final PersistentDataContainer pdc = player.getPersistentDataContainer();

        final int previousJoins = pdc.getOrDefault(PluginDataKeys.JOIN_COUNT, PersistentDataType.INTEGER, 0);
        final int currentJoins = previousJoins + 1;
        pdc.set(PluginDataKeys.JOIN_COUNT, PersistentDataType.INTEGER, currentJoins);
        pdc.set(PluginDataKeys.LAST_LOGIN_TIMESTAMP, PersistentDataType.LONG, System.currentTimeMillis());

        if (currentJoins == 1) {
            // Pertama kali bergabung
            final String firstJoinFormat = plugin.getConfig().getString(
                "messages.first_join",
                "<rainbow>MEMBER BARU!</rainbow> Sambut <yellow><player></yellow>!"
            );
            event.joinMessage(
                MiniMessage.miniMessage().deserialize(firstJoinFormat, Placeholder.unparsed("player", player.getName()))
            );
        } else {
            // Pemain kembali bergabung
            final String welcomeFormat = plugin.getConfig().getString(
                "messages.welcome",
                "<green>Selamat datang kembali, <yellow><player></yellow>!</green>"
            );
            event.joinMessage(
                MiniMessage.miniMessage().deserialize(welcomeFormat, Placeholder.unparsed("player", player.getName()))
            );
        }

        // Kirim action bar personal
        player.sendActionBar(
            MiniMessage.miniMessage().deserialize("<gray>Kunjungan ke-<gold><count></gold></gray>",
                Placeholder.unparsed("count", String.valueOf(currentJoins))
            )
        );
    }
}
