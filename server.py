import csv
import json
import math
import os
import re
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).parent
PORT = int(os.environ.get("PORT", "3000"))


def parse_csv(text):
    rows = []
    for row in csv.DictReader(text.splitlines()):
        lowered = {str(key).strip().lower(): value for key, value in row.items()}
        amount = lowered.get("amount") or lowered.get("value") or "0"
        try:
            value = float(str(amount).replace("$", "").replace(",", ""))
        except ValueError:
            continue
        rows.append({
            "date": lowered.get("date") or lowered.get("transaction_date") or lowered.get("posted") or "",
            "description": lowered.get("description") or lowered.get("memo") or lowered.get("name") or "Transaction",
            "amount": value,
            "category": lowered.get("category") or "Uncategorised",
        })
    return rows


def summarize(transactions):
    income = sum(t["amount"] for t in transactions if t["amount"] > 0)
    expenses = sum(abs(t["amount"]) for t in transactions if t["amount"] < 0)
    by_category = {}
    for transaction in transactions:
        if transaction["amount"] < 0:
            category = transaction["category"]
            by_category[category] = by_category.get(category, 0) + abs(transaction["amount"])
    months = sorted({str(t["date"])[:7] for t in transactions if t["date"]})
    monthly = []
    for month in months:
        month_rows = [t for t in transactions if str(t["date"]).startswith(month)]
        monthly.append({
            "month": month,
            "income": sum(t["amount"] for t in month_rows if t["amount"] > 0),
            "expenses": sum(abs(t["amount"]) for t in month_rows if t["amount"] < 0),
        })
    return {"income": income, "expenses": expenses, "net": income - expenses, "byCategory": by_category, "monthly": monthly}


def forecast(summary, starting_cash=8200):
    history = summary["monthly"] or [{"income": 4800, "expenses": 3100}, {"income": 5200, "expenses": 3300}, {"income": 4900, "expenses": 3450}]
    nets = [m["income"] - m["expenses"] for m in history]
    average = sum(nets) / len(nets)
    volatility = math.sqrt(sum((n - average) ** 2 for n in nets) / max(1, len(nets) - 1))
    points = [{"month": f"M+{i}", "baseline": round(starting_cash + average * i), "cautious": round(starting_cash + (average - volatility * .55) * i)} for i in range(1, 7)]
    return {"averageMonthlyNet": round(average), "volatility": round(volatility), "runwayMonths": max(0, round(starting_cash / abs(average))) if average < 0 else 12, "points": points}


def advice(summary, projection):
    biggest = sorted(summary["byCategory"].items(), key=lambda pair: pair[1], reverse=True)
    return {
        "headline": "Your base is healthy — turn consistency into leverage." if summary["net"] >= 0 else "Protect runway first, then rebuild predictable income.",
        "actions": [
            {"title": "Create a tax reserve", "detail": f"Move {round(max(.15, min(.3, summary['expenses'] / max(summary['income'], 1) * .25)) * 100)}% of every client payment into a separate pot.", "impact": "Reduces surprise cash squeezes"},
            {"title": f"Audit {biggest[0][0].lower()}" if biggest else "Tag your recurring costs", "detail": f"You spent ${round(biggest[0][1]):,} here. Mark one cost to pause or renegotiate." if biggest else "A second pass on categories unlocks a sharper forecast.", "impact": "Finds a fast margin win"},
            {"title": "Invoice before the work lands", "detail": "Use a 50/50 milestone on new projects and set a seven-day follow-up reminder.", "impact": "Shortens time-to-cash"},
        ],
        "watchout": "At the current burn rate, runway is the constraint. Pause non-essential subscriptions this week." if projection["averageMonthlyNet"] < 0 else "Your positive trend is encouraging, but one large client can still hide concentration risk.",
        "provider": "LedgerPilot · local fallback",
    }


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT / "public"), **kwargs)

    def _json(self, value, status=200):
        payload = json.dumps(value).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "content-type")
        self.end_headers()

    def do_POST(self):
        if self.path != "/api/analyze":
            return self._json({"error": "Not found"}, 404)
        length = int(self.headers.get("Content-Length", 0))
        data = json.loads(self.rfile.read(length) or "{}")
        transactions = data.get("transactions") or parse_csv(data.get("csv", ""))
        summary = summarize(transactions)
        projection = forecast(summary, float(data.get("startingCash", 8200)))
        return self._json({"summary": summary, "projection": projection, "advice": advice(summary, projection), "transactions": transactions})

    def do_GET(self):
        if self.path == "/api/health":
            return self._json({"ok": True, "service": "LedgerPilot"})
        return super().do_GET()


if __name__ == "__main__":
    print(f"LedgerPilot running at http://localhost:{PORT}")
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
