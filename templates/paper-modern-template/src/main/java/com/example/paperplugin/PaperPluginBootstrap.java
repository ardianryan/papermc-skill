package com.example.paperplugin;

import com.example.paperplugin.command.HelloCommand;
import io.papermc.paper.plugin.bootstrap.BootstrapContext;
import io.papermc.paper.plugin.bootstrap.PluginBootstrap;
import io.papermc.paper.plugin.lifecycle.event.types.LifecycleEvents;
import org.jspecify.annotations.NullMarked;

import java.util.List;

@NullMarked
@SuppressWarnings("UnstableApiUsage")
public final class PaperPluginBootstrap implements PluginBootstrap {

    @Override
    public void bootstrap(final BootstrapContext context) {
        // Registrasi Paper Brigadier Commands via LifecycleEvents
        context.getLifecycleManager().registerEventHandler(
            LifecycleEvents.COMMANDS,
            event -> {
                final var registrar = event.registrar();
                registrar.register(
                    HelloCommand.create(),
                    "Contoh perintah Paper modern berbasis Brigadier",
                    List.of("phello")
                );
            }
        );
    }
}
