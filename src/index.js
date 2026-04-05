import express from "express";
import { notifyOwner, startDiscordBot } from "./discord-bot.js";
import { containsAbuse, looksLikeBugReport } from "./moderation.js";
import { createId, readStore, writeStore } from "./storage.js";

const app = express();
app.use(express.json({ limit: "1mb" }));

function addInboxMessage(store, launcherUserId, message) {
  store.inbox.push({
    id: createId("msg"),
    launcherUserId,
    message,
    createdAt: new Date().toISOString(),
    seen: false
  });
}

function updateReportStatus(reportId, status) {
  const store = readStore();
  const report = store.reports.find((item) => item.id === reportId);
  if (!report) {
    return null;
  }

  report.status = status;
  report.updatedAt = new Date().toISOString();

  if (status === "resolved") {
    addInboxMessage(
      store,
      report.launcherUserId,
      "Thank you for cooperating. The developer marked your report as resolved. Please keep sending bug reports if you find anything else."
    );
  } else if (status === "rejected") {
    addInboxMessage(
      store,
      report.launcherUserId,
      "Your last message was reviewed and marked as not a valid bug report."
    );
  } else if (status === "need-info") {
    addInboxMessage(
      store,
      report.launcherUserId,
      "The developer needs more information about your report. Please send steps to reproduce, version and screenshots if possible."
    );
  }

  writeStore(store);
  return report;
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "nexus-bug-report-hub" });
});

app.post("/api/reports", async (req, res) => {
  const { launcherUserId, text, version, mode, category = "assistant" } = req.body ?? {};

  if (!launcherUserId || !text) {
    return res.status(400).json({ ok: false, message: "launcherUserId and text are required" });
  }

  if (containsAbuse(text)) {
    return res.status(400).json({
      ok: false,
      message: "Message looks abusive, not like a valid bug report."
    });
  }

  if (!looksLikeBugReport(text)) {
    return res.status(400).json({
      ok: false,
      message: "Message does not look like a real bug report."
    });
  }

  const store = readStore();
  const report = {
    id: createId(),
    launcherUserId,
    text,
    version: version || null,
    mode: mode || null,
    category,
    status: "open",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  store.reports.push(report);
  addInboxMessage(
    store,
    launcherUserId,
    `Thank you for the report. I passed it to the developer. Report ID: ${report.id}`
  );
  writeStore(store);
  await notifyOwner(report);

  res.json({
    ok: true,
    message: "Thanks for finding a bug. I passed it to the developer.",
    reportId: report.id
  });
});

app.get("/api/reports/:id", (req, res) => {
  const store = readStore();
  const report = store.reports.find((item) => item.id === req.params.id);
  if (!report) {
    return res.status(404).json({ ok: false, message: "Report not found" });
  }
  res.json({ ok: true, report });
});

app.get("/api/launcher/:launcherUserId/inbox", (req, res) => {
  const store = readStore();
  const messages = store.inbox.filter((item) => item.launcherUserId === req.params.launcherUserId);
  res.json({ ok: true, messages });
});

app.post("/api/reports/:id/status", (req, res) => {
  const { status } = req.body ?? {};
  if (!["resolved", "rejected", "need-info"].includes(status)) {
    return res.status(400).json({ ok: false, message: "Invalid status" });
  }

  const report = updateReportStatus(req.params.id, status);
  if (!report) {
    return res.status(404).json({ ok: false, message: "Report not found" });
  }
  res.json({ ok: true, report });
});

const port = Number(process.env.PORT || 3000);
void startDiscordBot();

app.listen(port, () => {
  console.log(`Nexus bug report hub listening on ${port}`);
});
