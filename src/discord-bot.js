import { ChannelType, Client, GatewayIntentBits } from "discord.js";

let bot = null;

export async function startDiscordBot() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    return null;
  }

  bot = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
  });

  await bot.login(token);
  return bot;
}

export async function notifyOwner(report) {
  if (!bot) {
    return;
  }
  const channelId = process.env.DISCORD_REPORT_CHANNEL_ID;
  if (!channelId) {
    return;
  }

  const channel = await bot.channels.fetch(channelId);
  if (!channel || channel.type !== ChannelType.GuildText) {
    return;
  }

  await channel.send(
    [
      "New Nexus bug report",
      `ID: ${report.id}`,
      `Launcher User: ${report.launcherUserId}`,
      `Category: ${report.category}`,
      `Version: ${report.version || "unknown"}`,
      `Mode: ${report.mode || "unknown"}`,
      `Text: ${report.text}`
    ].join("\n")
  );
}
