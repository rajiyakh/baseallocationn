export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { address } = req.body;
  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return res.status(400).json({ error: 'Invalid address' });
  }
  res.status(200).json({ ok: true });
}
