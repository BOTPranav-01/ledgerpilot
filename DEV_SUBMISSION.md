---
title: "LedgerPilot: a private cashflow copilot for the one-person business"
published: false
tags: devchallenge, hf26challenge, ai, opensource
---

*This is a submission for the [Hacktoberfest Open-Source AI Challenge Week 2: Side Hustle](https://dev.to/challenges/hacktoberfest-week2-2026-10-12).*

## What I Built

LedgerPilot is a small cashflow copilot for freelancers and one-person businesses.

I built it around a simple observation: most independent workers do not need another finance dashboard. They need to know whether this month is healthy, how long their cash will last if work slows down, and what to do next.

LedgerPilot takes a CSV export from a bank, Stripe, PayPal, or accounting tool and turns it into:

- a clear income, expense, and net-cashflow summary
- category-level spending signals
- a six-month expected and cautious-case projection
- three specific actions, written in plain language

The product is intentionally narrow. It is a five-minute monthly review for someone who invoices clients, not an attempt to replace an accountant or become a full accounting platform. The thing it sells is reduced uncertainty.

## Demo

**Try it here:** [LedgerPilot on Render](https://ledgerpilot.onrender.com)

Open the app and click **Try live demo** to see the complete flow with sample data. You can also upload a CSV with these columns:

```text
date,description,amount,category
```

The deployed health endpoint is available at [`/api/health`](https://ledgerpilot.onrender.com/api/health).

## Code

The complete source is on GitHub:

[github.com/BOTPranav-01/ledgerpilot](https://github.com/BOTPranav-01/ledgerpilot)

The project is deliberately small enough to understand in one sitting:

- [`server.py`](https://github.com/BOTPranav-01/ledgerpilot/blob/main/server.py) handles the API, CSV parsing, summaries, forecasts, and AI adapter
- [`public/index.html`](https://github.com/BOTPranav-01/ledgerpilot/blob/main/public/index.html) contains the product experience
- [`public/styles.css`](https://github.com/BOTPranav-01/ledgerpilot/blob/main/public/styles.css) contains the responsive visual system
- [`public/app.js`](https://github.com/BOTPranav-01/ledgerpilot/blob/main/public/app.js) connects the interface to the analysis API
- [`render.yaml`](https://github.com/BOTPranav-01/ledgerpilot/blob/main/render.yaml) describes the Render deployment

## How I Built It

The important design decision was to keep the numbers and the language separate.

First, the server parses the CSV and calculates the facts: income, expenses, category totals, monthly net cashflow, average monthly change, volatility, and runway. The forecast is deterministic and explainable. It is not asking a language model to do arithmetic that ordinary code can do more reliably.

Then the product can pass that structured summary to an open-weight model for interpretation. If `OLLAMA_URL` is configured, LedgerPilot uses Ollama and the `qwen2.5:3b` model by default. The model is asked for a short JSON action plan: a headline, three actions, and one watchout.

There is also a deterministic fallback. That matters because the product should still work on the first visit, without a model download, an API key, or a surprise bill. The interface makes the provider visible, so the user can tell whether the briefing came from a local model or the built-in fallback.

The app has no database and does not require a bank connection. A user can run it locally with:

```powershell
python server.py
```

It is deployed as a Python web service on Render, with `/api/health` used as the health check.

## Why Does Open Innovation Matter?

A financial export is not generic text. It can contain client names, invoice amounts, recurring expenses, and a very accurate picture of a small business. Sending all of that to a closed API is a serious product decision for the exact people LedgerPilot is meant to help.

Open AI makes the privacy promise practical rather than aspirational. A freelancer can run the workflow locally with Ollama and keep the file on their own machine. They can choose a different open-weight model, host inference somewhere they trust, or use the deterministic fallback when they do not want inference at all.

It also changes the economics. A solo business checking its cashflow once a month should not need to accept an unpredictable per-request cost before the product is useful.

The open model is not being used as decoration. It is the replaceable reasoning layer that turns calculated facts into a short, useful plan. The arithmetic stays in ordinary code; the model adds interpretation. That division makes the system easier to audit, cheaper to run, and less dependent on one vendor.

## Prize Categories

- **Best Use of Render** — Render hosts the public LedgerPilot app, serves the frontend and API, and monitors the `/api/health` endpoint.

Thanks for reading.
