export default async function handler(req,res){
  if(req.method!=='GET') return res.status(405).json({error:'method_not_allowed'});
  try{
    const base=process.env.MADRI_SUPABASE_URL;
    const key=process.env.MADRI_SUPABASE_PUBLISHABLE_KEY;
    if(!base||!key) return res.status(500).json({error:'missing_server_config'});
    const headers={apikey:key,Authorization:'Bearer '+key};
    const qi='item_id,kind,module,grouping_name,process_name,description,solution,observation,adherence,attendance_form,wms,criticality';
    const [ri,rn]=await Promise.all([
      fetch(`${base}/rest/v1/madri_rfi_blueprint_items?select=${encodeURIComponent(qi)}&order=item_id.asc`,{headers,cache:'no-store'}),
      fetch(`${base}/rest/v1/madri_rfi_blueprint_notes?select=item_id,description,updated_at&order=item_id.asc`,{headers,cache:'no-store'})
    ]);
    const [items,notes]=await Promise.all([ri.json(),rn.json()]);
    if(!ri.ok) throw new Error(items?.message||`items_${ri.status}`);
    if(!rn.ok) throw new Error(notes?.message||`notes_${rn.status}`);
    res.setHeader('Cache-Control','no-store');
    return res.status(200).json({items,notes});
  }catch(e){
    console.error('madri-data',e);
    return res.status(500).json({error:'load_failed'});
  }
}
