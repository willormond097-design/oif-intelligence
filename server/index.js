require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/brief', async (req, res) => {
  const { company, sections } = req.body;
  if (!company || !sections || !sections.length) return res.status(400).json({ error: 'Missing company or sections.' });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured.' });

  const sectionDescriptions = {
    business: 'What the company does and their business model',
    team: 'Founding team and key people',
    funding: 'Funding history and investors',
    market: 'Competitors and market context',
    news: 'Recent news and signals (last 12 months)',
  };

  const sectionDesc = sections.map(s => sectionDescriptions[s]).filter(Boolean).join('\n');

  const systemPrompt = `You are a VC analyst at OIF Ventures. Produce company intelligence briefs.

CRITICAL: Always return ONLY a valid JSON object. No markdown, no explanation, just raw JSON.

For any company — large or small — search their website, LinkedIn, Crunchbase, and press. Extract whatever exists publicly. If a section has no data, use exactly: "No public information found."

Return this exact JSON structure:
{"company":"name","tagline":"one sentence or Unknown","stage":"stage or Unknown","sector":"sector or Unknown","hq":"city country or Unknown","founded":"year or Unknown","sections":{"business":{"bullets":["..."]},"team":{"bullets":["..."]},"funding":{"bullets":["..."]},"market":{"bullets":["..."]},"news":{"bullets":["..."]}},"verdict":"analyst take or Unknown"}

Only include requested sections. Every section needs at least one bullet.`;

  const userPrompt = `Brief for: ${company}\nSections: ${sectionDesc}\n\nSearch for "${company}", visit their website, check LinkedIn. Return valid JSON only.`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2500,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });
    const data = await r.json();
    if (!r.ok) return res.status(500).json({ error: data.error?.message || 'Anthropic API error.' });

    const textBlock = data.content?.find(b => b.type === 'text');
    if (!textBlock) return res.status(500).json({ error: 'No response from model.' });

    let raw = textBlock.text.trim().replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) raw = jsonMatch[0];

    let brief;
    try {
      brief = JSON.parse(raw);
    } catch (e) {
      brief = { company, tagline: 'Limited public information available.', stage: 'Unknown', sector: 'Unknown', hq: 'Unknown', founded: 'Unknown', sections: {}, verdict: 'Insufficient public information found.' };
      sections.forEach(id => { brief.sections[id] = { bullets: ['No public information found.'] }; });
    }
    sections.forEach(id => { if (!brief.sections) brief.sections = {}; if (!brief.sections[id]) brief.sections[id] = { bullets: ['No public information found.'] }; });

    return res.json({ brief });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Server error.' });
  }
});

app.get('*', (req, res) => { res.sendFile(path.join(__dirname, '../public/index.html')); });
app.listen(PORT, () => { console.log(`OIF Intelligence running on port ${PORT}`); });
