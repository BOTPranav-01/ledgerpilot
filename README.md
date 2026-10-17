# LedgerPilot

**LedgerPilot** is a privacy-first cashflow copilot for freelancers and one-person businesses. Drop in a bank or payment-export CSV and get:

- transaction summary and category-level spending signals
- six-month baseline and cautious-case runway projection
- three concrete actions rather than an analytics dashboard
- an open-weight AI adapter that works with local Ollama models
- a deterministic fallback so the product remains usable without credentials

## Run locally

Requires Python 3.9+ (or Node.js 18+).

```powershell
python server.py
```

Open <http://localhost:3000>. Click **Try live demo** or upload a CSV with `date,description,amount,category`.

To use a local open-weight model:

```powershell
$env:OLLAMA_URL="http://localhost:11434"
$env:OLLAMA_MODEL="qwen2.5:3b"
npm start
```

The app never requires a bank connection or stores uploaded files. The server keeps the model boundary swappable so it can be deployed to Render with an Ollama-backed service or a trusted inference endpoint.

## Deploy on Render

This repository includes `render.yaml`. In Render, choose **New > Blueprint**, connect the GitHub repository, and apply the blueprint. Render will run the Python server and use `/api/health` as its health check.

For local Ollama inference in a deployment, set `OLLAMA_URL` and optionally `OLLAMA_MODEL` in the service environment. Without those variables, LedgerPilot uses its transparent deterministic fallback.

## Product thesis

The buyer is a freelancer who is already making money but does not have a finance department. LedgerPilot sells reduced uncertainty: a five-minute monthly review that finds one margin leak, one cash-flow risk, and one action worth taking now.

The open approach matters because freelancer data often includes client names, rates, and business-sensitive expenses. A local open-weight model makes privacy, cost control, and model swapping product capabilities rather than marketing claims.
