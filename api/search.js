export default async function handler(req, res) {
  // Allow requests from any origin (CORS)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { country, page, genre, style } = req.query;

  if (!country) {
    return res.status(400).json({ error: 'Missing country parameter' });
  }

  const key    = process.env.DISCOGS_CONSUMER_KEY;
  const secret = process.env.DISCOGS_CONSUMER_SECRET;

  if (!key || !secret) {
    return res.status(500).json({ error: 'Discogs credentials not configured on server' });
  }

  let url = `https://api.discogs.com/database/search?country=${encodeURIComponent(country)}&type=release&per_page=100&page=${page || 1}&key=${key}&secret=${secret}`;
  if (genre) url += `&genre=${encodeURIComponent(genre)}`;
  if (style) url += `&style=${encodeURIComponent(style)}`;

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'DiscogsRatioExplorer/1.0' }
    });

    if (response.status === 429) {
      return res.status(429).json({ error: 'Rate limited by Discogs, please wait a moment' });
    }

    if (!response.ok) {
      return res.status(response.status).json({ error: `Discogs API error: ${response.statusText}` });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ error: 'Failed to reach Discogs API' });
  }
}
