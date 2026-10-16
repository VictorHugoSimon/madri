const { neon } = require('@neondatabase/serverless');
module.exports = async function handler(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  if(!process.env.DATABASE_URL) return res.status(500).json({ok:false,error:'database_not_configured'});
  const sql = neon(process.env.DATABASE_URL);
  const item='__DB_CHECK__';
  try{
    if(req.query && req.query.cleanup==='1'){
      await sql`delete from descriptions where item_id=${item}`;
      return res.status(200).json({ok:true,cleaned:true});
    }
    const rows = await sql`
      insert into descriptions (item_id,text_content,author,created_at,updated_at)
      values (${item},'persistencia_ok','db-check',now(),now())
      on conflict (item_id) do update set text_content=excluded.text_content, author=excluded.author, updated_at=now()
      returning item_id,text_content,author,updated_at
    `;
    const verify = await sql`select item_id,text_content,author,updated_at from descriptions where item_id=${item}`;
    return res.status(200).json({ok:true,written:rows[0]||null,verified:verify[0]||null});
  }catch(err){
    console.error('db_check_error',err);
    return res.status(500).json({ok:false,error:String(err&&err.message||err)});
  }
};
