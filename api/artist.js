export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const key    = process.env.DISCOGS_CONSUMER_KEY;
  const secret = process.env.DISCOGS_CONSUMER_SECRET;
  if (!key || !secret) return res.status(500).json({ error: 'Discogs credentials not configured' });

  const { action, name, id, page } = req.query;

  try {
    // ── Action: search for artist by name → return top match
    if (action === 'search') {
      if (!name) return res.status(400).json({ error: 'Missing name' });
      const url = `https://api.discogs.com/database/search?q=${encodeURIComponent(name)}&type=artist&per_page=5&key=${key}&secret=${secret}`;
      const resp = await fetch(url, { headers: { 'User-Agent': 'DiscogsSceneArchaeologist/1.0' } });
      if (!resp.ok) return res.status(resp.status).json({ error: 'Discogs search failed' });
      const data = await resp.json();
      return res.status(200).json({ results: data.results || [] });
    }

    // ── Action: get artist profile
    if (action === 'profile') {
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const url = `https://api.discogs.com/artists/${id}?key=${key}&secret=${secret}`;
      const resp = await fetch(url, { headers: { 'User-Agent': 'DiscogsSceneArchaeologist/1.0' } });
      if (!resp.ok) return res.status(resp.status).json({ error: 'Discogs artist fetch failed' });
      const data = await resp.json();
      return res.status(200).json(data);
    }

    // ── Action: get artist releases (paginated)
    if (action === 'releases') {
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const url = `https://api.discogs.com/artists/${id}/releases?per_page=100&page=${page||1}&sort=year&sort_order=asc&key=${key}&secret=${secret}`;
      const resp = await fetch(url, { headers: { 'User-Agent': 'DiscogsSceneArchaeologist/1.0' } });
      if (resp.status === 429) return res.status(429).json({ error: 'Rate limited' });
      if (!resp.ok) return res.status(resp.status).json({ error: 'Discogs releases fetch failed' });
      const data = await resp.json();
      return res.status(200).json(data);
    }

    return res.status(400).json({ error: 'Unknown action' });

  } catch (err) {
    return res.status(500).json({ error: `Server error: ${err.message}` });
  }
}
