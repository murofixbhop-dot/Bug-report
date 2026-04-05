import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  EmbedBuilder,
  GatewayIntentBits
} from "discord.js";

let bot = null;
let actionHandler = null;

export async function startDiscordBot(handler) {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    return null;
  }

  actionHandler = handler;
  bot = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
  });

  bot.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton() || !actionHandler) {
      return;
    }

    const [scope, action, reportId] = interaction.customId.split(":");
    if (scope !== "report" || !action || !reportId) {
      return;
    }

    const result = actionHandler(reportId, action);
    if (!result) {
      await interaction.reply({
        content: "Report was not found.",
        ephemeral: true
      });
      return;
    }

    await interaction.update({
      embeds: [buildReportEmbed(result.report, result.summary)],
      components: []
    });
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

  await channel.send({
    embeds: [buildReportEmbed(report, "New bug report from Nexus Launcher")],
    components: [buildActionRow(report.id)]
  });
}

function buildActionRow(reportId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`report:resolved:${reportId}`)
      .setLabel("Resolved")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`report:rejected:${reportId}`)
      .setLabel("Not a bug")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`report:need-info:${reportId}`)
      .setLabel("Need info")
      .setStyle(ButtonStyle.Secondary)
  );
}

function buildReportEmbed(report, summary) {
  return new EmbedBuilder()
    .setColor(report.status === "resolved" ? 0x00ff9d : report.status === "rejected" ? 0xff5b6e : 0x00b7ff)
    .setTitle("Nexus Bug Report")
    .setDescription(summary)
    .addFields(
      {
        name: "Report ID",
        value: report.id,
        inline: true
      },
      {
        name: "Reporter",
        value: report.reporterLabel || "Unknown",
        inline: true
      },
      {
        name: "Status",
        value: report.status || "open",
        inline: true
      },
      {
        name: "Message",
        value: truncate(report.text || "No details provided", 1000)
      }
    )
    .setFooter({
      text: `Fingerprint: ${report.fingerprint || "unknown"}`
    })
    .setTimestamp(new Date(report.updatedAt || report.createdAt || Date.now()));
}

function truncate(value, max) {
  return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}
