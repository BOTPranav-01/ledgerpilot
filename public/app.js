const demoTransactions = [
  { date: "2026-05-03", description: "Acme Studio retainer", amount: 4200, category: "Client income" },
  { date: "2026-05-05", description: "Figma", amount: -15, category: "Software" },
  { date: "2026-05-12", description: "Coworking studio", amount: -220, category: "Workspace" },
  { date: "2026-05-20", description: "Northstar website", amount: 1800, category: "Client income" },
  { date: "2026-06-02", description: "Acme Studio retainer", amount: 4200, category: "Client income" },
  { date: "2026-06-06", description: "Adobe Creative Cloud", amount: -65, category: "Software" },
  { date: "2026-06-14", description: "Coworking studio", amount: -220, category: "Workspace" },
  { date: "2026-06-18", description: "Northstar website", amount: 2400, category: "Client income" },
  { date: "2026-07-02", description: "Acme Studio retainer", amount: 4200, category: "Client income" },
  { date: "2026-07-08", description: "Software subscriptions", amount: -620, category: "Software" },
  { date: "2026-07-15", description: "Coworking studio", amount: -220, category: "Workspace" },
  { date: "2026-07-22", description: "Northstar website", amount: 1900, category: "Client income" },
  { date: "2026-08-02", description: "Acme Studio retainer", amount: 4200, category: "Client income" },
  { date: "2026-08-09", description: "Software subscriptions", amount: -620, category: "Software" },
  { date: "2026-08-14", description: "Coworking studio", amount: -220, category: "Workspace" },
  { date: "2026-08-22", description: "Northstar website", amount: 2100, category: "Client income" },
  { date: "2026-09-02", description: "Acme Studio retainer", amount: 4200, category: "Client income" },
  { date: "2026-09-07", description: "Software subscriptions", amount: -620, category: "Software" },
  { date: "2026-09-13", description: "Coworking studio", amount: -220, category: "Workspace" },
  { date: "2026-09-25", description: "Northstar website", amount: 2300, category: "Client income" },
  { date: "2026-10-02", description: "Acme Studio retainer", amount: 4200, category: "Client income" },
  { date: "2026-10-07", description: "Software subscriptions", amount: -620, category: "Software" },
  { date: "2026-10-13", description: "Coworking studio", amount: -220, category: "Workspace" }
];

const $ = (selector) => document.querySelector(selector);
const money = (value) => `$${Math.round(value).toLocaleString()}`;

function render(result) {
  const { summary, projection, advice } = result;
  $("#netMetric").textContent = money(summary.net);
  $("#netTrend").innerHTML = `${summary.net >= 0 ? "↑" : "↓"} ${Math.abs(summary.net / Math.max(summary.income, 1) * 100).toFixed(1)}% <small>net margin</small>`;
  $("#netTrend").className = `trend ${summary.net >= 0 ? "positive" : "negative"}`;
  $("#runwayMetric").innerHTML = `${projection.runwayMonths} <small>mo</small>`;
  $(".runway span").style.width = `${Math.min(100, projection.runwayMonths / 12 * 100)}%`;
  $("#adviceHeadline").textContent = advice.headline;
  $("#actions").innerHTML = advice.actions.map((action, index) => `<div class="action"><b>0${index + 1} &nbsp; ${action.title}</b><span>${action.detail}</span><small>${action.impact}</small></div>`).join("");
  $("#watchout").innerHTML = `<span>◎</span> ${advice.watchout}`;
  document.querySelector(".privacy-pill").textContent = advice.provider.includes("Ollama") ? "⌁ Ollama · local model" : "⌁ Local-first mode";
  $("#workspace").scrollIntoView({ behavior: "smooth", block: "start" });
}

async function analyze(transactions) {
  const response = await fetch("/api/analyze", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ transactions }) });
  if (!response.ok) throw new Error("Could not analyze this file");
  render(await response.json());
}

$("#startBtn").addEventListener("click", () => analyze(demoTransactions));
$("#loadDemo").addEventListener("click", () => analyze(demoTransactions));
$("#uploadBtn").addEventListener("click", () => $("#fileInput").click());
$("#fileInput").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const csv = await file.text();
  const response = await fetch("/api/analyze", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ csv }) });
  if (!response.ok) return alert("Please upload a CSV with date, description, amount, and optional category columns.");
  render(await response.json());
});
