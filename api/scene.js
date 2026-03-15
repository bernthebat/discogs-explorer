export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { country, decade, page } = req.query;

  if (!country || !decade) {
    return res.status(400).json({ error: 'Missing country or decade parameter' });
  }

  const key    = process.env.DISCOGS_CONSUMER_KEY;
  const secret = process.env.DISCOGS_CONSUMER_SECRET;

  if (!key || !secret) {
    return res.status(500).json({ error: 'Discogs credentials not configured on server' });
  }

  const startYear = parseInt(decade);
  const endYear   = startYear + 9;

  // Discogs search supports year range via year= but only single year.
  // We use a broad fetch and filter client-side, but pass decade start
  // as a hint. We fetch all pages with year filter per individual year
  // on the client side — here we just proxy one page at a time.
  const yearParam = req.query.year || '';
  let url = `https://api.discogs.com/database/search?country=${encodeURIComponent(country)}&type=release&per_page=100&page=${page || 1}&key=${key}&secret=${secret}`;
  if (yearParam) url += `&year=${encodeURIComponent(yearParam)}`;

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'DiscogsSceneArchaeologist/1.0' }
    });

    if (response.status === 429) {
      return res.status(429).json({ error: 'Rate limited' });
    }

    if (!response.ok) {
      return res.status(response.status).json({ error: `Discogs API error: ${response.statusText}` });
    }

    const data = await response.json();

    // Filter to decade range client-side as well
    if (data.results) {
      data.results = data.results.filter(r => {
        const y = parseInt(r.year);
        return y >= startYear && y <= endYear;
      });
    }

    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ error: 'Failed to reach Discogs API' });
  }
}
