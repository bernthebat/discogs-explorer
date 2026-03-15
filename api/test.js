export default async function handler(req, res) {
  res.status(200).json({
    hasYoutubeKey: !!process.env.YOUTUBE_API_KEY,
    keyPreview: process.env.YOUTUBE_API_KEY?.slice(0, 6) || 'missing'
  });
}
