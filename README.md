# Aurum

**Live demo: [aurum-terminal.vercel.app](https://aurum-terminal.vercel.app)** (the free-tier API sleeps when idle, so the first search can take up to a minute to wake it)

Aurum is an institutional-grade equity research and valuation terminal with a dark, gold-on-black aesthetic. It pairs a Next.js frontend with a FastAPI backend serving live market data, and rolls the tools that are usually scattered across several sites into one screen: quotes, charts, fundamentals, financial statements, analyst consensus, news, and an interactive DCF valuation model.

## Features

- Ticker autocomplete: search any company by name or symbol, keyboard-navigable dropdown of global matches
- Live quote header: price, day change, market cap, and exchange, with a watchlist star (persists in the browser)
- Interactive price chart: 1D to MAX ranges with tooltips, built on Recharts
- Key statistics: P/E (trailing and forward), EPS, dividend yield, beta, 52-week range, volume, margins, ROE, free cash flow
- Analyst consensus: mean price target, implied upside vs. the live price, and recommendation with analyst count
- Financial statements: income statement, balance sheet, and cash flow, four fiscal years side by side
- Interactive DCF valuation: live free-cash-flow fundamentals with adjustable growth, terminal, and discount assumptions; intrinsic value per share and an under/overvalued verdict recomputed as you drag the sliders (educational model, not investment advice)
- News feed: latest headlines for the active ticker

Planned next: SEC filing analysis and PDF/Excel tearsheet export.

## Stack

- Frontend: Next.js (App Router), TypeScript, Tailwind CSS v4, Recharts, Framer Motion, Lucide icons
- Backend: Python, FastAPI, uvicorn, yfinance, pandas, numpy
- Fonts: Inter (UI), JetBrains Mono (financial figures), Newsreader (report headers)

Note on Tailwind: this project uses Tailwind v4, which is configured in CSS rather than in a tailwind.config file. The design tokens live in the `@theme` block of `frontend/src/app/globals.css` and generate the same utility classes (`bg-bg`, `text-gold`, `text-gain`, and so on).

## Prerequisites

- Node.js 20 or newer (developed on Node 24 LTS)
- Python 3.11 or newer (developed on Python 3.12)

## Running locally

You need two terminals, one per service.

### Terminal 1, backend

```powershell
cd backend
python -m venv venv
venv\Scripts\activate        # on macOS or Linux: source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

The API is now at http://localhost:8000. Verify with http://localhost:8000/api/health, which should return `{"status": "ok"}`.

### Terminal 2, frontend

```powershell
cd frontend
npm install
npm run dev
```

The app is now at http://localhost:3000. Type a ticker such as AAPL into the search bar and submit, and the company card should render live data fetched through the FastAPI backend.

### Environment variables

Both services run locally with zero configuration, the defaults point at each other. To override, copy the example files and edit:

- `frontend/.env.example` to `frontend/.env.local`, sets `NEXT_PUBLIC_API_URL` (default http://localhost:8000)
- `backend/.env.example` to `backend/.env`, sets `FRONTEND_ORIGIN`, the extra origin allowed by CORS in production

## Deployment

The app is deployed and public:

- Frontend: Vercel at https://aurum-terminal.vercel.app, project root `frontend/`, env var `NEXT_PUBLIC_API_URL` pointing at the backend URL
- Backend: Render at https://aurum-api-bqrb.onrender.com, defined by `render.yaml` at the repo root (root `backend/`, uvicorn start command), env var `FRONTEND_ORIGIN` set to the frontend URL for CORS

To reproduce: deploy the backend first (Render reads `render.yaml` as a Blueprint), then point the frontend at it. Note that `NEXT_PUBLIC_API_URL` is baked in at build time, so changing it on Vercel requires a redeploy.
