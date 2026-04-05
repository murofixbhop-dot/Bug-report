const abusiveWords = [
  "идиот",
  "тупой",
  "долбаеб",
  "долбоеб",
  "ебан",
  "сука",
  "пидор",
  "хуй",
  "нахуй",
  "fuck",
  "bitch",
  "retard",
  "idiot",
  "moron"
];

const bugKeywords = [
  "bug",
  "error",
  "crash",
  "freeze",
  "hang",
  "launcher",
  "minecraft",
  "version",
  "screen",
  "mod",
  "texture",
  "не работает",
  "ошибка",
  "баг",
  "вылет",
  "завис",
  "краш"
];

export function normalizeForModeration(input) {
  return input
    .toLowerCase()
    .replace(/[@4]/g, "a")
    .replace(/[3]/g, "e")
    .replace(/[0о]/g, "o")
    .replace(/[1!|]/g, "i")
    .replace(/[5$]/g, "s")
    .replace(/[7]/g, "t")
    .replace(/[^a-zа-я0-9]/gi, "")
    .replace(/(.)\1{2,}/g, "$1");
}

export function containsAbuse(input) {
  const normalized = normalizeForModeration(input);
  return abusiveWords.some((word) => normalized.includes(normalizeForModeration(word)));
}

export function looksLikeBugReport(input) {
  const value = input.toLowerCase();
  return bugKeywords.some((word) => value.includes(word)) && value.length >= 12;
}
