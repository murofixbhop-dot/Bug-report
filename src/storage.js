import fs from "node:fs";
import path from "node:path";

const dataDir = path.resolve(process.cwd(), "data");
const dataFile = path.join(dataDir, "reports.json");

function normalizeStore(store) {
  return {
    reports: Array.isArray(store?.reports) ? store.reports : [],
    inbox: Array.isArray(store?.inbox) ? store.inbox : [],
    blocks: Array.isArray(store?.blocks) ? store.blocks : []
  };
}

function ensureStore() {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(
      dataFile,
      JSON.stringify({ reports: [], inbox: [], blocks: [] }, null, 2),
      "utf-8"
    );
    return;
  }

  const current = JSON.parse(fs.readFileSync(dataFile, "utf-8"));
  const normalized = normalizeStore(current);
  if (JSON.stringify(current) !== JSON.stringify(normalized)) {
    fs.writeFileSync(dataFile, JSON.stringify(normalized, null, 2), "utf-8");
  }
}

export function readStore() {
  ensureStore();
  return normalizeStore(JSON.parse(fs.readFileSync(dataFile, "utf-8")));
}

export function writeStore(store) {
  ensureStore();
  fs.writeFileSync(dataFile, JSON.stringify(normalizeStore(store), null, 2), "utf-8");
}

export function createId(prefix = "rpt") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
