import fs from "node:fs";
import path from "node:path";

const dataDir = path.resolve(process.cwd(), "data");
const dataFile = path.join(dataDir, "reports.json");

function ensureStore() {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(
      dataFile,
      JSON.stringify({ reports: [], inbox: [] }, null, 2),
      "utf-8"
    );
  }
}

export function readStore() {
  ensureStore();
  return JSON.parse(fs.readFileSync(dataFile, "utf-8"));
}

export function writeStore(store) {
  ensureStore();
  fs.writeFileSync(dataFile, JSON.stringify(store, null, 2), "utf-8");
}

export function createId(prefix = "rpt") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
