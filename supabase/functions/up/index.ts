const SUPABASE_URL = "https://jyhmhksdpjkzkhqlkuqh.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5aG1oa3NkcGpremtocWxrdXFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMDEwNTYsImV4cCI6MjA5MDg3NzA1Nn0.e5iYCkY-UNumjWWnsPugc5nIUKOkITccuhODLPBCiwc";

export default async (req: Request): Promise<Response> => {
  const h = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, Authorization" };
  if (req.method === "OPTIONS") return new Response(null, { headers: h });

  try {
    const b = await req.json();
    const { filename, markdown, images, username, category } = b;

    if (!filename || !markdown) {
      return new Response(JSON.stringify({ error: "缺少参数" }), { status: 400, headers: h });
    }

    let md = markdown;

    if (images?.length) {
      for (const img of images) {
        const bytes = Uint8Array.from(atob(img.data), c => c.charCodeAt(0));
        const r = await fetch(`${SUPABASE_URL}/storage/v1/object/images/${img.name}`, {
          method: "POST",
          headers: { "apikey": KEY, "Authorization": `Bearer ${KEY}`, "Content-Type": img.type || "image/png" },
          body: bytes
        });
        if (r.ok) md = md.replace(img.ref, `${SUPABASE_URL}/storage/v1/object/public/images/${img.name}`);
      }
    }

    const content = `---\nid: ${filename}\ntitle: ${filename}\n---\n\n${md}`;

    await fetch(`${SUPABASE_URL}/rest/v1/documents`, {
      method: "POST",
      headers: { "apikey": KEY, "Authorization": `Bearer ${KEY}`, "Content-Type": "application/json", "Prefer": "return=minimal" },
      body: JSON.stringify({ filename, content, category: category || "process", uploader: username || "unknown", approved: false, created_at: new Date().toISOString() })
    });

    return new Response(JSON.stringify({ success: true, filename }), { headers: h });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: h });
  }
};