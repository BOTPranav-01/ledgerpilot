import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const publicDir = join(root, "public");
const port = Number(process.env.PORT || 3000);

const headers = { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*" };

function json(res, body, status = 200) {
  res.writeHead(status, headers);
  res.end(JSON.stringify(body));
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((v) => v.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cells = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g)?.map((v) => v.replace(/^"|"$/g, "").trim()) || [];
    const row = Object.fromEntries(headers.map((key, i) => [key, cells[i] || ""]));
    return {
      date: row.date || row.transaction_date || row.posted || "",
      description: row.description || row.memo || row.name || "Transaction",
      amount: Number(row.amount || row.value || 0),
      category: row.category || "Uncategorised",
      type: (row.type || "").toLowerCase()
    };
  }).filter((row) => Number.isFinite(row.amount));
}

function summarize(transactions) {
  const income = transactions.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
  const expenses = transactions.filter((t) => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const byCategory = {};
  for (const t of transactions) {
    if (t.amount < 0) byCategory[t.category] = (byCategory[t.category] || 0) + Math.abs(t.amount);
  }
  const months = [...new Set(transactions.map((t) => String(t.date).slice(0, 7)).filter(Boolean))].sort();
  const monthly = months.map((month) => ({
    month,
    income: transactions.filter((t) => String(t.date).startsWith(month) && t.amount > 0).reduce((s, t) => s + t.amount, 0),
    expenses: transactions.filter((t) => String(t.date).startsWith(month) && t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)
  }));
  return { income, expenses, net: income - expenses, byCategory, monthly };
}

function forecast(summary, startingCash = 8200) {
  const history = summary.monthly.length ? summary.monthly : [{ income: 4800, expenses: 3100 }, { income: 5200, expenses: 3300 }, { income: 4900, expenses: 3450 }];
  const net = history.map((m) => m.income - m.expenses);
  const average = net.reduce((a, b) => a + b, 0) / net.length;
  const volatility = Math.sqrt(net.reduce((a, n) => a + (n - average) ** 2, 0) / Math.max(1, net.length - 1));
  const points = Array.from({ length: 6 }, (_, i) => ({
    month: `M+${i + 1}`,
    baseline: Math.round(startingCash + average * (i + 1)),
    cautious: Math.round(startingCash + (average - volatility * 0.55) * (i + 1))
  }));
  return { averageMonthlyNet: Math.round(average), volatility: Math.round(volatility), runwayMonths: average < 0 ? Math.max(0, Math.round(startingCash / Math.abs(average))) : 12, points };
}

async function aiAdvice(summary, forecastData) {
  const prompt = `You are a concise financial operations coach for a freelancer. Based on this JSON, return valid JSON with keys: headline, actions (array of 3 objects with title, detail, impact), watchout. Do not give regulated financial advice. Data: ${JSON.stringify({ summary, forecast: forecastData })}`;
  if (process.env.OLLAMA_URL) {
    try {
      const response = await fetch(`${process.env.OLLAMA_URL.replace(/\/$/, "")}/api/generate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ model: process.env.OLLAMA_MODEL || "qwen2.5:3b", prompt, format: "json", stream: false })
      });
      if (response.ok) {
        const result = await response.json();
        return { ...JSON.parse(result.response), provider: "Ollama · open-weight" };
      }
    } catch {
      // The deterministic plan below keeps the product usable without a model server.
    }
  }
  const biggest = Object.entries(summary.byCategory).sort((a, b) => b[1] - a[1])[0];
  return {
    headline: summary.net >= 0 ? "Your base is healthy — turn consistency into leverage." : "Protect runway first, then rebuild predictable income.",
    actions: [
      { title: "Create a tax reserve", detail: `Move ${Math.round(Math.max(0.15, Math.min(0.3, summary.expenses / Math.max(summary.income, 1) * 0.25)) * 100)}% of every client payment into a separate pot.`, impact: "Reduces surprise cash squeezes" },
      { title: biggest ? `Audit ${biggest[0].toLowerCase()}` : "Tag your recurring costs", detail: biggest ? `You spent $${Math.round(biggest[1]).toLocaleString()} here. Mark one cost to pause or renegotiate.` : "A second pass on categories unlocks a sharper forecast.", impact: "Finds a fast margin win" },
      { title: "Invoice before the work lands", detail: "Use a 50/50 milestone on new projects and set a seven-day follow-up reminder.", impact: "Shortens time-to-cash" }
    ],
    watchout: forecastData.averageMonthlyNet < 0 ? "At the current burn rate, runway is the constraint. Pause non-essential subscriptions this week." : "Your positive trend is encouraging, but one large client can still hide concentration risk.",
    provider: "LedgerPilot · local fallback"
  };
}

async function body(req) {
  let data = "";
  for await (const chunk of req) data += chunk;
  return JSON.parse(data || "{}");
}

async function serve(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === "OPTIONS") {
    res.writeHead(204, { "access-control-allow-origin": "*", "access-control-allow-methods": "GET,POST,OPTIONS", "access-control-allow-headers": "content-type" });
    return res.end();
  }
  if (url.pathname === "/api/analyze" && req.method === "POST") {
    const data = await body(req);
    const transactions = data.transactions || parseCsv(data.csv || "");
    const summary = summarize(transactions);
    const projection = forecast(summary, Number(data.startingCash) || 8200);
    return json(res, { summary, projection, advice: await aiAdvice(summary, projection), transactions });
  }
  if (url.pathname === "/api/health") return json(res, { ok: true, service: "LedgerPilot" });
  const requested = url.pathname === "/" ? "/index.html" : url.pathname;
  const safePath = normalize(join(publicDir, requested));
  if (!safePath.startsWith(publicDir)) return json(res, { error: "Not found" }, 404);
  try {
    const file = await readFile(safePath);
    const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml" };
    res.writeHead(200, { "content-type": types[extname(safePath)] || "application/octet-stream" });
    res.end(file);
  } catch {
    json(res, { error: "Not found" }, 404);
  }
}

http.createServer((req, res) => serve(req, res).catch((error) => json(res, { error: error.message }, 500))).listen(port, () => {
  console.log(`LedgerPilot running at http://localhost:${port}`);
});
