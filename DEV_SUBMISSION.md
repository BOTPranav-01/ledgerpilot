---
title: "LedgerPilot: a private cashflow copilot for the one-person business"
published: false
tags: devchallenge, hf26challenge, ai, opensource
---

*This is a submission for the [Hacktoberfest Open-Source AI Challenge Week 2: Side Hustle](https://dev.to/challenges/hacktoberfest-week2-2026-10-12).*

## What I Built

LedgerPilot is a privacy-first cashflow copilot for freelancers and one-person businesses.

Most independent workers do not need another finance dashboard. They need to answer three questions quickly:

1. Am I actually making money this month?
2. How long can I keep operating if work slows down?
3. What is the one money move worth making today?

LedgerPilot accepts a bank, Stripe, PayPal, or accounting CSV and turns it into a transaction summary, a six-month baseline/cautious forecast, and three specific actions. It is intentionally narrow: it is a five-minute monthly review for someone who invoices people, not a replacement for an accountant.

## Demo

**Live app:** [add deployed Render URL]

The fastest path is to open the app and click **Try live demo**. To use your own data, upload a CSV with `date,description,amount,category` columns.

## Code

This project is designed to run from a small folder with no database and no frontend build step.

- `server.py` — API, CSV parsing, forecasting, and model adapter
- `public/index.html` — product experience
- `public/styles.css` — responsive visual system
- `public/app.js` — live dashboard interactions
- `render.yaml` — one-click Render deployment

## How I Built It

The core workflow is deliberately model-swappable:

```text
CSV -> local summary -> forecast -> open-weight model -> three actions
```

The app works immediately with a deterministic local fallback, so a user never has to hand over data or configure an API key to get value. If `OLLAMA_URL` is set, the server sends the structured summary to a local Ollama model (the default is `qwen2.5:3b`) and asks it for a small, validated JSON action plan. The UI shows which provider produced the briefing.

The forecast is intentionally explainable: it uses historical monthly net cashflow and volatility to show an expected path and a cautious case. That makes the model useful for interpretation and next actions rather than asking it to invent arithmetic.

## Why Does Open Innovation Matter?

A freelancer's export can contain client names, rates, invoices, and business-sensitive expenses. Sending that file to an opaque third-party API is a meaningful product tradeoff, not a footnote.

Open AI makes three things possible here:

- **Privacy:** the same workflow can run on a laptop with Ollama and no internet connection.
- **Control:** the model is an adapter, not the product's identity. A user can swap models or host the inference endpoint themselves.
- **Economics:** a low-volume solo business can run a monthly review without a per-request bill turning the product into an expensive subscription.

This is also why LedgerPilot keeps arithmetic outside the model. Open models handle the interpretation and prioritisation; deterministic code owns the numbers.

## My First User

Replace this section with a real user story before publishing. I am deliberately not inventing one: the strongest version of this submission should include the user's role, the file format they tried, what action they took, and whether they would pay for a monthly review.

## Prize Categories

- Best Use of Render — Render hosts the web app and exposes `/api/health` for deployment health checks.

Thanks for reading.
