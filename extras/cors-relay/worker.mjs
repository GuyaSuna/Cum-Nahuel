// Alternativa opcional si el navegador bloquea las redirecciones de Apps Script.
// No almacena datos ni credenciales: Sheets y Apps Script siguen siendo el backend.
export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const headers = {'Content-Type':'application/json;charset=utf-8','Cache-Control':'no-store','Vary':'Origin'};
    const json = (status,message) => new Response(JSON.stringify({success:false,data:null,error:'RELAY',message}),{status,headers});
    if (!env.ALLOWED_ORIGIN || origin !== env.ALLOWED_ORIGIN) return json(403,'Origen no permitido.');
    headers['Access-Control-Allow-Origin'] = origin;
    if (request.method === 'OPTIONS') return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'600'}});
    if (!['GET','POST'].includes(request.method)) return json(405,'Método no permitido.');
    if (!/^https:\/\/script\.google\.com\/macros\/s\/[a-zA-Z0-9_-]+\/exec$/.test(env.APPS_SCRIPT_URL || '')) return json(500,'URL de Apps Script inválida.');
    try {
      const upstream = new URL(env.APPS_SCRIPT_URL);
      if (request.method === 'GET') {
        const params = new URL(request.url).searchParams;
        if ([...params.keys()].some(k => k !== 'action')) return json(400,'Solo se admite action en la URL.');
        upstream.searchParams.set('action',params.get('action') || 'snapshot');
      }
      const body = request.method === 'POST' ? await request.text() : undefined;
      if (body && body.length > 50000) return json(413,'Pedido demasiado grande.');
      const response = await fetch(upstream,{method:request.method,redirect:'follow',headers:{'Content-Type':'text/plain;charset=UTF-8'},body,signal:AbortSignal.timeout(25000)});
      const text = await response.text();
      if (!response.ok || !response.headers.get('Content-Type')?.includes('application/json')) return json(502,'Apps Script no devolvió JSON. Revisá su publicación y permisos.');
      JSON.parse(text);
      return new Response(text,{status:200,headers});
    } catch {return json(502,'No se pudo consultar Apps Script.');}
  },
};
