## Live app
 
- **Frontend (Vercel):** `https://kjhwr-six-mu.vercel.app`
- **Backend API (Render):** `https://kjhwr-6a1e.onrender.com` (health check: `<RENDER_URL>/api/wind/health`)
 
The brief suggests Vercel or Heroku. The frontend is on Vercel. The backend is a Docker image on Render, chosen because it runs the container directly and allows longer request timeouts than Heroku's 30 second router limit.
 
## Files and directories
 
```
.
├── docker-compose.yml          # Runs api + web locally
├── .gitignore
├── README.md
├── api/                        # Backend (Python, Flask, gunicorn)
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── .env                    # Environment variable names
│   ├── requirements.txt
│   ├── requirements/
│   │   └── prod.txt
│   ├── wsgi.py                 # gunicorn entry point
│   └── conduit/
│       ├── app.py              # Application factory, blueprint and error handler registration
│       ├── extensions.py       # CORS extension
│       ├── settings.py         # Config read from environment variables
│       ├── exceptions.py       # Custom error classes and the JSON error shape
│       └── wind/
│           ├── views.py        # HTTP layer: read params, call a service, return JSON
│           ├── params.py       # Query parameter parsing and validation
│           ├── services.py     # Business logic: forecast selection, join, metrics
│           └── elexon.py       # Elexon BMRS client (retries, timeouts, error wrapping)
└── frontend/                   # React (Vite) single-page app
    ├── Dockerfile              # Multi-stage: Node build, nginx serve
    ├── nginx.conf
    ├── .dockerignore
    ├── .env.example
    ├── package.json
    └── src/
        ├── App.jsx             # State and page flow
        ├── api.js              # Fetch wrappers, timeout, error normalisation
        ├── time.js             # Europe/London time helpers
        ├── format.js           # Number and unit formatting
        ├── styles.css
        └── components/         # Controls, ForecastCard, ReplayCard, SlotTable, Skeleton, Notice
```
 
## How to start the application
 
### Option A: Docker Compose (recommended)
 
Prerequisites: Docker with Compose.
 
```bash
cp api/.env.example api/.env
docker compose up --build
```
 
- Frontend: http://localhost:3000
- API: http://localhost:8000 (try http://localhost:8000/api/wind/health)
The frontend is built with `VITE_API_BASE_URL=http://localhost:8000` (set as a build arg in `docker-compose.yml`). The value is baked in at build time, so rebuild after changing it.
 
## API
 
All endpoints are `GET`, return JSON, and live under `/api/wind`.
 
| Endpoint | Parameters | Returns |
|---|---|---|
| `/health` | none | `{"status": "ok"}` |
| `/forecast` | `delivery_date`, optional `cutoff_time` |
| `/accuracy` | `delivery_date`, optional `window_days` (default 14), optional `cutoff_time` |
| `/comparison` | `delivery_date`, optional `cutoff_time` | 
 
Errors share one shape: `{"error": {"code": 400, "messages": ["..."]}}`. Unexpected exceptions return a generic 500, and Elexon failures return 502.
 
## Deployment
 
- **API:** Docker web service on Render, built from the `api/` directory (Root Directory `api`, Dockerfile `./Dockerfile`). Health check path `/api/wind/health`. `CORS_ALLOWED_ORIGINS` is set to the Vercel URL.
- **Frontend:** Vercel project with Root Directory `frontend` and `VITE_API_BASE_URL` set to the Render URL.
- Pushing to `main` redeploys both.

## AI tools used
 
- **Frontend:** built with the help of the **Grok 4 agent**.
- **Backend:** written mostly by me, with assistance from **Claude** (Anthropic) for design discussion, code review, debugging and drafting.
- I reviewed, ran and tested the code, and take responsibility for the submission.

## Data sources
 
- Elexon BMRS FUELHH (actual generation by fuel type, filtered to `WIND`)
- Elexon BMRS WINDFOR (wind generation forecasts)
