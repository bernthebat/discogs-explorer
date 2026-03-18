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

  try {
    let releaseId = id;

    // Masters don't have extraartists — resolve to main release first
    if (type === 'master') {
      const masterUrl = `https://api.discogs.com/masters/${id}?key=${key}&secret=${secret}`;
      const masterResp = await fetch(masterUrl, {
        headers: { 'User-Agent': 'DiscogsSceneArchaeologist/1.0' }
      });
      if (masterResp.status === 429) return res.status(429).json({ error: 'Rate limited' });
      if (!masterResp.ok) return res.status(masterResp.status).json({ error: 'Master fetch failed' });
      const masterData = await masterResp.json();
      // Use main_release ID if available
      if (masterData.main_release) {
        releaseId = masterData.main_release;
      } else {
        // No main release — nothing we can do
        return res.status(200).json({ id, extraartists: [], tracklist: [] });
      }
    }

    const url = `https://api.discogs.com/releases/${releaseId}?key=${key}&secret=${secret}`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'DiscogsSceneArchaeologist/1.0' }
    });
    if (resp.status === 429) return res.status(429).json({ error: 'Rate limited' });
    if (!resp.ok) return res.status(resp.status).json({ error: `Discogs error: ${resp.statusText}` });

    const data = await resp.json();

    // Collect ALL extraartists: root level + per-track level
    const rootExtras  = data.extraartists || [];
    const trackExtras = (data.tracklist || []).flatMap(t => t.extraartists || []);
    const allExtras   = [...rootExtras, ...trackExtras];

    return res.status(200).json({
      id:           releaseId,
      title:        data.title,
      extraartists: allExtras,
      artists:      data.artists || [],
    });

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
