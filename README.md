# OIF Intelligence — Company Brief Tool

Drop in a company name, get a live research brief in under a minute.
Built with Node.js + Express + Anthropic API (Claude with web search).

---

## Local Development

1. Install dependencies:
   ```
   npm install
   ```

2. Create your environment file:
   ```
   cp .env.example .env
   ```
   Then open `.env` and paste your Anthropic API key.

3. Run locally:
   ```
   npm start
   ```
   Open http://localhost:3000

---

## Deploy to Railway (permanent hosted URL)

Railway gives you a permanent HTTPS URL. Free tier is fine for internal team use.

### Step 1 — Push to GitHub
1. Go to github.com → New repository → name it `oif-intelligence` → Create
2. In your terminal (in this project folder):
   ```
   git init
   git add .
   git commit -m "Initial build"
   git remote add origin https://github.com/YOUR_USERNAME/oif-intelligence.git
   git push -u origin main
   ```

### Step 2 — Deploy on Railway
1. Go to railway.app → Log in with GitHub
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your `oif-intelligence` repo
4. Railway auto-detects Node.js and deploys

### Step 3 — Add your API key
1. In Railway dashboard → click your project → "Variables" tab
2. Add variable:
   - Name:  `ANTHROPIC_API_KEY`
   - Value: `sk-ant-your-key-here`
3. Railway automatically redeploys

### Step 4 — Get your URL
1. Click "Settings" tab → "Domains"
2. Click "Generate Domain"
3. You'll get something like: `oif-intelligence-production.up.railway.app`

Share that URL with the team. Done. No maintenance required.

---

## Costs

Each brief costs roughly $0.01–0.03 USD in API usage (Claude Sonnet + web search).
For a team running 10–20 briefs per day, that's under $10/month.
OIF can set up their own Anthropic account and swap the API key at any time.

---

## Project Structure

```
oif-intelligence/
├── server/
│   └── index.js        # Express backend — holds API key, calls Anthropic
├── public/
│   └── index.html      # Frontend — what users see
├── .env.example        # Template for environment variables
├── .gitignore          # Keeps .env out of git
├── package.json
└── README.md
```
