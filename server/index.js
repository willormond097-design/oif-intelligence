require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Main brief generation endpoint
app.post('/api/brief', async (req, res) => {
  const { company, sections } = req.body;

  if (!company || !sections || !sections.length) {
    return res.status(400).json({ error: 'Missing company or sections.' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured on server.' });
  }

  const sectionDescriptions = {
    business: 'What the company does and their business model (product, revenue model, target customers, stage)',
    team:     'Founding team and key people (backgrounds, previous companies, LinkedIn signals, notable hires)',
    funding:  'Funding history and investors (rounds, amounts, lead investors, total raised, valuation if known)',
    market:   'Competitors and market context (main competitors, market size, positioning, differentiation)',
    news:     'Recent news and signals (last 12 months: product launches, hires, partnerships, press, red flags)',
  };

  const sectionDesc = sections
    .map(s => sectionDescriptions[s])
    .filter(Boolean)
    .join('\n');

  const systemPrompt = `You are an expert venture capital analyst at OIF Ventures, a leading Australian early-stage VC firm. Your job is to produce fast, sharp, high-signal company intelligence briefs that give analysts everything they need to decide whether to pursue a deal.

When researching a company, you:
- Search the web for current, accurate information
- Prioritise primary sources (company website, Crunchbase, LinkedIn, recent press)
- Are concise but thorough — no padding, no obvious statements
- Flag anything uncertain with (unconfirmed) or (approx.)
- Surface non-obvious insights a junior analyst might miss

You MUST respond with a valid JSON object ONLY — no markdown, no preamble, no backticks.

The JSON schema is:
{
  "company": "Exact company name",
  "tagline": "One crisp sentence describing what they do",
  "stage": "e.g. Series A / Seed / Pre-seed / Growth",
  "sector": "e.g. SaaS / Fintech / Healthtech",
  "hq": "City, Country",
  "founded": "Year or approx. year",
  "sections": {
    "business": { "bullets": ["...", "..."] },
    "team":     { "bullets": ["...", "..."] },
    "funding":  { "bullets": ["...", "..."] },
    "market":   { "bullets": ["...", "..."] },
    "news":     { "bullets": ["...", "..."] }
  },
  "verdict": "2-3 sentence analyst take: what is interesting, what is the risk, worth pursuing?"
}

Only include keys in sections for the sections requested. Each section should have 4-6 tight, high-signal bullet points. The verdict should be genuinely opinionated.`;

  const userPrompt = `Research and produce a company intelligence brief for: ${company}

Sections to include:
${sectionDesc}

Search the web thoroughly. Be specific with numbers, dates, and names wherever possible. Flag anything uncertain.`;

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    const data = await anthropicRes.json();

    if (!anthropicRes.ok) {
      console.error('Anthropic error:', data);
      return res.status(500).json({ error: data.error?.message || 'Anthropic API error.' });
    }

    // Find the final text block (comes after any tool use blocks)
    const textBlock = data.content?.find(b => b.type === 'text');
    if (!textBlock) {
      return res.status(500).json({ error: 'No text response returned from model.' });
    }

    let raw = textBlock.text.trim();
    raw = raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();

    const brief = JSON.parse(raw);
    return res.json({ brief });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: err.message || 'Unexpected server error.' });
  }
});

// Catch-all: serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`OIF Intelligence running on port ${PORT}`);
});
