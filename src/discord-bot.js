import { Client, GatewayIntentBits, Partials } from "discord.js";

let bot = null;

export async function startDiscordBot({ onOwnerCommand, ownerUserId }) {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token || !ownerUserId) {
    return null;
  }

  bot = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages, GatewayIntentBits.MessageContent],
    partials: [Partials.Channel]
  });

  bot.on("messageCreate", async (message) => {
    if (message.author.bot || message.author.id !== ownerUserId) {
      return;
    }
    if (message.channel.type !== 1) {
      return;
    }

    const [command, reportId] = message.content.trim().split(/\s+/);
    if (!reportId) {
      return;
    }

    if (command === "!resolve") {
      await onOwnerCommand("resolved", reportId, message);
    } else if (command === "!reject") {
      await onOwnerCommand("rejected", reportId, message);
    } else if (command === "!needinfo") {
      await onOwnerCommand("need-info", reportId, message);
    }
  });

  await bot.login(token);
  return bot;
}

export async function notifyOwner(report) {
  if (!bot) {
    return;
  }
  const ownerUserId = process.env.DISCORD_OWNER_USER_ID;
  if (!ownerUserId) {
    return;
  }

  const owner = await bot.users.fetch(ownerUserId);
  await owner.send(
    [
      "New Nexus bug report",
      `ID: ${report.id}`,
      `Launcher User: ${report.launcherUserId}`,
      `Category: ${report.category}`,
      `Version: ${report.version || "unknown"}`,
      `Text: ${report.text}`,
      `Commands: !resolve ${report.id} | !reject ${report.id} | !needinfo ${report.id}`
    ].join("\n")
  );
}
