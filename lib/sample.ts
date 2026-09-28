const PEOPLE = ["Aarav Mehta", "Sofia Rossi", "Liam Chen", "Priya Nair", "Noah Williams", "Mei Tanaka", "Omar Haddad", "Elena García"];
const COMPANIES = ["Northwind", "Globex", "Initech", "Umbrella", "Stark Labs", "Wayne Fin", "Acme Corp", "Hooli"];
const STATUSES = ["Needs review", "Approved", "In progress", "Flagged", "Done", "Waiting"];
const PRIORITY = ["Urgent", "High", "Medium", "Low"];
const SUBJECTS = ["Refund not received", "Can't log in", "Invoice mismatch", "Feature question", "Delivery delayed", "Account locked"];
const DOCS = ["Passport", "Utility bill", "Bank statement", "Driver licence", "Tax ID"];

export function sampleValue(field: string, i: number): string {
  const f = field.toLowerCase();
  const pick = <T,>(arr: T[]) => arr[(i * 7 + f.length) % arr.length];
  if (/(^|_)(name|customer|owner|candidate|vendor)$/.test(f) || f === "customer") return pick(PEOPLE);
  if (f.includes("company")) return pick(COMPANIES);
  if (f.includes("status") || f.includes("stage")) return pick(STATUSES);
  if (f.includes("priority")) return pick(PRIORITY);
  if (f.includes("subject") || f.includes("title")) return pick(SUBJECTS);
  if (f.includes("document")) return pick(DOCS);
  if (f.includes("email")) return `${pick(PEOPLE).split(" ")[0].toLowerCase()}@${pick(COMPANIES).toLowerCase().replace(/\s/g, "")}.com`;
  if (f.includes("amount")) return `$${((i + 3) * 1379 % 9800 + 120).toLocaleString()}`;
  if (f.includes("score") || f.includes("confidence")) return `${(i * 17 + 41) % 59 + 40}`;
  if (f.includes("sentiment")) return ["Positive", "Neutral", "Frustrated", "Angry"][i % 4];
  if (f.includes("missing")) return ["—", "Address proof", "—", "Signature", "Selfie"][i % 5];
  if (f.includes("match")) return ["Matched", "Partial", "No PO"][i % 3];
  if (f.includes("tokens")) return `${(i * 311 + 900) % 4000}`;
  if (f.includes("sources")) return `${(i % 9) + 3}`;
  if (f.includes("topic") || f.includes("role")) return ["AI agents", "Pricing", "Hiring", "Security", "Growth"][i % 5];
  if (f.includes("at") || f.includes("date") || f.includes("touch")) return `${(i % 5) + 1}h ago`;
  return `${field.replace(/_/g, " ")} ${i + 1}`;
}

export function humanize(field: string) {
  const s = field.replace(/_/g, " ");
  return s[0].toUpperCase() + s.slice(1);
}

export function tone(value: string): "ok" | "warn" | "bad" | "neutral" {
  if (/approved|done|matched|positive|low/i.test(value)) return "ok";
  if (/review|progress|waiting|partial|medium|neutral|high/i.test(value)) return "warn";
  if (/flagged|urgent|angry|frustrated|no po/i.test(value)) return "bad";
  return "neutral";
}
