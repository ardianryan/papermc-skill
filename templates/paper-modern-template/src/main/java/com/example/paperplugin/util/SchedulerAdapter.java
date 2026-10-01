package com.example.paperplugin.util;

import org.bukkit.Bukkit;
import org.bukkit.Location;
import org.bukkit.entity.Entity;
import org.bukkit.plugin.Plugin;

import java.util.concurrent.TimeUnit;

/**
 * Universal Scheduler Adapter providing transparent concurrency across standard Paper and Folia (Threaded Regions).
 */
public final class SchedulerAdapter {

    private static final boolean IS_FOLIA = checkFolia();

    private SchedulerAdapter() {
    }

    private static boolean checkFolia() {
        try {
            Class.forName("io.papermc.paper.threadedregions.RegionizedServer");
            return true;
        } catch (final ClassNotFoundException e) {
            return false;
        }
    }

    public static boolean isFolia() {
        return IS_FOLIA;
    }

    /**
     * Executes a runnable on the region thread owning the specified location.
     */
    public static void runAtLocation(final Plugin plugin, final Location location, final Runnable runnable) {
        if (IS_FOLIA) {
            Bukkit.getRegionScheduler().execute(plugin, location, runnable);
        } else {
            Bukkit.getScheduler().runTask(plugin, runnable);
        }
    }

    /**
     * Executes a runnable on the region thread currently owning the specified entity.
     */
    public static void runAtEntity(final Plugin plugin, final Entity entity, final Runnable runnable) {
        if (IS_FOLIA) {
            entity.getScheduler().run(plugin, task -> runnable.run(), null);
        } else {
            Bukkit.getScheduler().runTask(plugin, runnable);
        }
    }

    /**
     * Executes a runnable asynchronously (off-main-thread).
     */
    public static void runAsync(final Plugin plugin, final Runnable runnable) {
        if (IS_FOLIA) {
            Bukkit.getAsyncScheduler().runNow(plugin, task -> runnable.run());
        } else {
            Bukkit.getScheduler().runTaskAsynchronously(plugin, runnable);
        }
    }

    /**
     * Executes a delayed task asynchronously.
     */
    public static void runAsyncDelayed(final Plugin plugin, final Runnable runnable, final long delay, final TimeUnit timeUnit) {
        if (IS_FOLIA) {
            Bukkit.getAsyncScheduler().runDelayed(plugin, task -> runnable.run(), delay, timeUnit);
        } else {
            final long ticks = Math.max(1L, timeUnit.toMillis(delay) / 50L);
            Bukkit.getScheduler().runTaskLaterAsynchronously(plugin, runnable, ticks);
        }
    }
}
