package com.example.paperplugin.command;

import com.mojang.brigadier.Command;
import com.mojang.brigadier.arguments.StringArgumentType;
import com.mojang.brigadier.tree.LiteralCommandNode;
import io.papermc.paper.command.brigadier.Commands;
import io.papermc.paper.command.brigadier.CommandSourceStack;
import net.kyori.adventure.text.minimessage.MiniMessage;
import net.kyori.adventure.text.minimessage.tag.resolver.Placeholder;
import org.bukkit.Bukkit;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.Player;

import java.util.List;

public final class HelloCommand {

    private HelloCommand() {
    }

    public static LiteralCommandNode<CommandSourceStack> create() {
        return Commands.literal("paperhello")
            .requires(source -> source.getSender().hasPermission("paperplugin.hello"))
            .executes(context -> {
                final CommandSender sender = context.getSource().getSender();
                sender.sendMessage(
                    MiniMessage.miniMessage().deserialize("<green>Halo, <yellow><name></yellow>! Selamat menggunakan Paper Brigadier.</green>",
                        Placeholder.unparsed("name", sender.getName())
                    )
                );
                return Command.SINGLE_SUCCESS;
            })
            .then(Commands.argument("target", StringArgumentType.word())
                .suggests((ctx, builder) -> {
                    for (final Player online : Bukkit.getOnlinePlayers()) {
                        builder.suggest(online.getName());
                    }
                    return builder.buildFuture();
                })
                .executes(context -> {
                    final CommandSender sender = context.getSource().getSender();
                    final String target = StringArgumentType.getString(context, "target");

                    sender.sendMessage(
                        MiniMessage.miniMessage().deserialize("<green>Menyapa <gold><target></gold> atas nama <yellow><sender></yellow>!</green>",
                            Placeholder.unparsed("target", target),
                            Placeholder.unparsed("sender", sender.getName())
                        )
                    );
                    return Command.SINGLE_SUCCESS;
                })
            )
            .build();
    }
}
