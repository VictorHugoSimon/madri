const { neon } = require('@neondatabase/serverless');

function getAuthor(req) {
  const raw = req.headers['x-autor'] || '';
  try { return decodeURIComponent(String(raw)).trim().slice(0,120); }
  catch (_) { return String(raw).trim().slice(0,120); }
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (!process.env.DATABASE_URL) return res.status(500).json({ error: 'database_not_configured' });
  const sql = neon(process.env.DATABASE_URL);
  try {
    if (req.method === 'GET') {
      const rows = await sql`select item_id, text_content, author, updated_at from descriptions order by item_id`;
      const out = {};
      for (const r of rows) out[r.item_id] = { t: r.text_content, a: r.author || 'Sem nome', c: r.updated_at };
      return res.status(200).json(out);
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const item = String(body.item || '').trim();
      const texto = String(body.texto || '').trim();
      const autor = getAuthor(req) || 'Sem nome';
      if (!item || item.length > 64 || !texto || texto.length > 20000) return res.status(400).json({ error: 'invalid_payload' });
      const rows = await sql`
        insert into descriptions (item_id, text_content, author, created_at, updated_at)
        values (${item}, ${texto}, ${autor}, now(), now())
        on conflict (item_id) do update
          set text_content = excluded.text_content,
              author = excluded.author,
              updated_at = now()
        returning item_id, text_content, author, updated_at
      `;
      const r = rows[0];
      return res.status(200).json({ t: r.text_content, a: r.author || 'Sem nome', c: r.updated_at });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  } catch (err) {
    console.error('descricoes_api_error', err);
    return res.status(500).json({ error: 'database_error' });
  }
};
