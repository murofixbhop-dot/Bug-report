import crypto from "node:crypto";
import express from "express";
import { notifyOwner, startDiscordBot } from "./discord-bot.js";
import { containsAbuse, looksLikeBugReport } from "./moderation.js";
import { createId, readStore, writeStore } from "./storage.js";

const app = express();
app.set("trust proxy", true);
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

function fingerprintFromRequest(req, launcherUserId) {
  const ip = String(req.ip || req.headers["x-forwarded-for"] || "unknown");
  const ipHash = crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16);
  return {
    ipHash,
    reporterLabel: launcherUserId || `user-${ipHash.slice(0, 6)}`
  };
}

function getActiveBlock(store, launcherUserId, ipHash) {
  const now = Date.now();
  return store.blocks.find((block) => {
    if (!block?.until || new Date(block.until).getTime() <= now) {
      return false;
    }
    return block.launcherUserId === launcherUserId || block.ipHash === ipHash;
  });
}

function createTemporaryBlock(store, launcherUserId, ipHash) {
  const until = new Date(Date.now() + 60_000).toISOString();
  store.blocks.push({
    id: createId("blk"),
    launcherUserId,
    ipHash,
    until
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
      "Thank you for cooperating. The developer marked your bug report as resolved. Keep sending reports if you find anything else."
    );
  } else if (status === "rejected") {
    addInboxMessage(
      store,
      report.launcherUserId,
      "Please stop sending fake bug reports. This report was marked as not a bug and bug reporting is blocked for 1 minute."
    );
    createTemporaryBlock(store, report.launcherUserId, report.ipHash);
  } else if (status === "need-info") {
    addInboxMessage(
      store,
      report.launcherUserId,
      "The developer needs more information. Please send steps to reproduce, screenshots and the exact version."
    );
  }

  writeStore(store);
  return {
    report,
    summary:
      status === "resolved"
        ? "Developer marked this report as resolved."
        : status === "rejected"
          ? "Developer marked this report as not a bug."
          : "Developer requested more information."
  };
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "nexus-bug-report-hub" });
});

app.post("/api/reports", async (req, res) => {
  const { launcherUserId, text } = req.body ?? {};

  if (!launcherUserId || !text) {
    return res.status(400).json({ ok: false, message: "launcherUserId and text are required" });
  }

  const store = readStore();
  const { ipHash, reporterLabel } = fingerprintFromRequest(req, launcherUserId);
  const activeBlock = getActiveBlock(store, launcherUserId, ipHash);
  if (activeBlock) {
    return res.status(429).json({
      ok: false,
      message: "Bug reporting is temporarily blocked for 1 minute because of a fake report."
    });
  }

  if (containsAbuse(text)) {
    return res.status(400).json({
      ok: false,
      message: "Please do not send abuse instead of a real bug report."
    });
  }

  if (!looksLikeBugReport(text)) {
    return res.status(400).json({
      ok: false,
      message: "Message does not look like a real bug report."
    });
  }

  const previousReports = store.reports.filter((item) => item.launcherUserId === launcherUserId || item.ipHash === ipHash);
  const report = {
    id: createId(),
    launcherUserId,
    reporterLabel,
    ipHash,
    fingerprint: `${reporterLabel}:${ipHash.slice(0, 6)}`,
    text,
    status: "open",
    duplicateCount: previousReports.length,
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

app.get("/api/launcher/:launcherUserId/inbox", (req, res) => {
  const store = readStore();
  const messages = store.inbox.filter((item) => item.launcherUserId === req.params.launcherUserId && !item.seen);
  for (const message of messages) {
    message.seen = true;
  }
  writeStore(store);
  res.json({ ok: true, messages });
});

app.post("/api/reports/:id/status", (req, res) => {
  const { status } = req.body ?? {};
  if (!["resolved", "rejected", "need-info"].includes(status)) {
    return res.status(400).json({ ok: false, message: "Invalid status" });
  }

  const result = updateReportStatus(req.params.id, status);
  if (!result) {
    return res.status(404).json({ ok: false, message: "Report not found" });
  }
  res.json({ ok: true, report: result.report });
});

const port = Number(process.env.PORT || 3000);
void startDiscordBot(updateReportStatus);

app.listen(port, () => {
  console.log(`Nexus bug report hub listening on ${port}`);
});
