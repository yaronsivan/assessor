export function normalizeName(name) {
  const trimmed = String(name || "").trim();
  if (!trimmed) return "";
  return trimmed.split(/\s+/).map(w => {
    if (/^[A-Za-z][A-Za-z'-]*$/.test(w)) {
      return w[0].toUpperCase() + w.slice(1).toLowerCase();
    }
    return w; // keep Hebrew etc. as-is
  }).join(" ");
}

export function isValidEmail(email) {
  if (!email) return true; // optional
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  return re.test(email);
}

export function ynu(s) {
  const x = String(s ?? "").trim().toLowerCase();
  // Accept English y/n/u and be tolerant to Hebrew initials k(כן)/l(לא)/u(unsure)
  if (x.startsWith("y") || x.startswith?.("y")) return "y";
  if (x.startsWith("n") || x.startswith?.("n")) return "n";
  if (x.startsWith("u") || x.startswith?.("u")) return "u";
  if (x.startsWith("k")) return "y"; // כן
  if (x.startsWith("l")) return "n"; // לא
  return "u";
}
