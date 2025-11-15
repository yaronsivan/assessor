// src/engine/survey.js
import { capIdx } from "./levels.js";
import { normalizeName, isValidEmail, ynu } from "./utils.js";

const TOPIC_BY_LEVEL = [
  "present",       // A1.1
  "inf",           // A1.2
  "past",          // A1.3
  "futBasic",      // A2.1
  "futAdv",        // A2.2
  "passive",       // A2.3
  "fluencyDaily",  // B1.1
  "fluencyComplex",// B1.2
  "fluencyNews",   // B1.3
  "academic"       // B2.1
];

function promptForTopic(key) {
  switch (key) {
    case "present":        return "Do you control PRESENT tense (basic forms)? (y/n/u) ";
    case "inf":            return "Do you know infinitives and binyanim? (y/n/u) ";
    case "past":           return "Do you control PAST tense comfortably? (y/n/u) ";
    case "futBasic":       return "Do you control FUTURE (basic forms)? (y/n/u) ";
    case "futAdv":         return "Do you control FUTURE (advanced/irregulars)? (y/n/u) ";
    case "passive":        return "Do you know some PASSIVE verbs? (y/n/u) ";
    case "fluencyDaily":   return "Are you fluent in daily conversation? (y/n/u) ";
    case "fluencyComplex": return "Can you handle complex tasks (forms, long instructions)? (y/n/u) ";
    case "fluencyNews":    return "Can you read news/formal texts with relative ease? (y/n/u) ";
    case "academic":       return "Can you manage academic/legal content? (y/n/u) ";
    default:               return "";
  }
}

export async function runSurvey(rl) {
  // Name + email
  const name  = normalizeName(await rl.questionAsync("🪄 What's your name? "));
  let email   = await rl.questionAsync("📧 What's your email (optional)? ");
  while (email && !isValidEmail(email)) {
    console.log("   (That email doesn’t look valid. Leave blank or try again.)");
    email = await rl.questionAsync("📧 Email (or Enter to skip): ");
  }
  console.log("");

  // Reading gate FIRST
  const decode = ynu(await rl.questionAsync("Can you decode/read the Hebrew alphabet? (y/n) "));
  if (decode !== "y") return { gateFail: true, name, email };

  // Hours
  const studied = ynu(await rl.questionAsync("Have you studied Hebrew before? (y/n) "));
  let months = 0, weeklyHours = 0;
  if (studied === "y") {
    months = parseInt((await rl.questionAsync("How many MONTHS total have you studied? ")).trim() || "1", 10);
    weeklyHours = parseFloat((await rl.questionAsync("How many HOURS PER WEEK on average? ")).trim() || "1");
  } else {
    console.log("(Skipping months/hours; assuming 0.)");
  }
  const totalHours = Math.max(0, (months || 0) * 4.3 * (weeklyHours || 0));
  const hourIdx = capIdx(Math.floor(totalHours / 80));
  console.log("");

  // If never studied → immediate beginner start (no validation)
  if (studied === "n") {
    return {
      gateFail: false,
      name, email, totalHours, hourIdx: 0,
      startIdx: 0, // A1.1
      trace: [{ topic: "present", ans: "n", at: 0, reason: "no prior study" }],
      extremeBeginner: true
    };
  }

  // Hour-anchored validation: allow PRESENT at A1.1; no repeats; stop only on direction flip or after 3 steps
  let ptr = hourIdx;
  // At true zero/very low hours, starting at "present" is fine
  // otherwise keep as implied by hourIdx (already mapped to level topics).
  const asked = new Set();
  const trace = [];
  let steps = 0;
  let lastDir = null; // 'up' for yes, 'down' for no
  let lastTopicIdx = ptr;
  let lastAns = "u";

  while (steps < 3) {
    const topic = TOPIC_BY_LEVEL[ptr] || "academic";
    if (asked.has(topic)) break; // never ask same topic twice
    asked.add(topic);
    lastTopicIdx = ptr;

    const ans = ynu(await rl.questionAsync(promptForTopic(topic)));
    lastAns = ans;
    trace.push({ topic, ans, at: ptr });

    const currDir = (ans === "y") ? "up" : "down";

    // Direction flip on adjacent topics -> stop immediately (matrix stop)
    if (lastDir && currDir != lastDir) {
      break;
    }

    // Move pointer
    if (ans === "y") {
      ptr = capIdx(ptr + 1);
    } else {
      ptr = capIdx(ptr - 1);
    }

    steps += 1;
    lastDir = currDir;
  }
  console.log("");

  // Start-level rule: last 'y' => start at lastTopicIdx; last 'n' => previous level
  let proposed = (lastAns === "y") ? lastTopicIdx : capIdx(lastTopicIdx - 1);

  // Clamp to ±3 around hours
  if (proposed > hourIdx + 3) proposed = hourIdx + 3;
  if (proposed < hourIdx - 3) proposed = hourIdx - 3;

  return { gateFail: false, name, email, totalHours, hourIdx, startIdx: capIdx(proposed), trace, extremeBeginner: false };
}
