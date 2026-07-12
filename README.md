# Aurum

**Live demo: [aurum-rho-three.vercel.app](https://aurum-rho-three.vercel.app)** (the free-tier API sleeps when idle, so the first search can take up to a minute to wake it)

Aurum is an institutional-grade equity valuation terminal with a dark, gold-on-black aesthetic. It pairs a Next.js frontend with a FastAPI backend that serves live market data, and it will grow into a full valuation workbench with DCF models, SEC filings, and exportable tearsheets. This phase is the foundation: the design system, the app shell, and one proven end-to-end data slice from ticker search to live quote.

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

- Frontend: Vercel at https://aurum-rho-three.vercel.app, project root `frontend/`, env var `NEXT_PUBLIC_API_URL` pointing at the backend URL
- Backend: Render at https://aurum-api-bqrb.onrender.com, defined by `render.yaml` at the repo root (root `backend/`, uvicorn start command), env var `FRONTEND_ORIGIN` set to the frontend URL for CORS

To reproduce: deploy the backend first (Render reads `render.yaml` as a Blueprint), then point the frontend at it. Note that `NEXT_PUBLIC_API_URL` is baked in at build time, so changing it on Vercel requires a redeploy.
