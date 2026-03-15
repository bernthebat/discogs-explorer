export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Missing query parameter' });

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'YouTube API key not configured on server' });

  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=${encodeURIComponent(q)}&key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      const reason = data?.error?.errors?.[0]?.reason || 'unknown';
      const message = data?.error?.message || `YouTube API error ${response.status}`;
      // Quota exceeded
      if (response.status === 403 && reason === 'quotaExceeded') {
        return res.status(429).json({ error: 'YouTube quota exceeded' });
      }
      return res.status(response.status).json({ error: message });
    }

    const item = data.items?.[0];
    const videoId = item?.id?.videoId || null;
    const title   = item?.snippet?.title || null;
    return res.status(200).json({ videoId, title });

  } catch (err) {
    return res.status(500).json({ error: `Server error: ${err.message}` });
  }
}
