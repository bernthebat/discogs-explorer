export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const key    = process.env.DISCOGS_CONSUMER_KEY;
  const secret = process.env.DISCOGS_CONSUMER_SECRET;
  if (!key || !secret) return res.status(500).json({ error: 'Discogs credentials not configured' });

  const { id, type } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing id' });

  const endpoint = type === 'master'
    ? `https://api.discogs.com/masters/${id}`
    : `https://api.discogs.com/releases/${id}`;

  const url = `${endpoint}?key=${key}&secret=${secret}`;

  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'DiscogsSceneArchaeologist/1.0' }
    });
    if (resp.status === 429) return res.status(429).json({ error: 'Rate limited' });
    if (!resp.ok) return res.status(resp.status).json({ error: `Discogs error: ${resp.statusText}` });
    const data = await resp.json();
    // Return only what we need to keep response small
    return res.status(200).json({
      id:           data.id,
      title:        data.title,
      extraartists: data.extraartists || [],
      artists:      data.artists      || [],
    });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
