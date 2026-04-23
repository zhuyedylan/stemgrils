const SUPABASE_URL = "https://jyhmhksdpjkzkhqlkuqh.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5aG1oa3NkcGpremtocWxrdXFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMDEwNTYsImV4cCI6MjA5MDg3NzA1Nn0.e5iYCkY-UNumjWWnsPugc5nIUKOkITccuhODLPBCiwc";

export default async (req: Request): Promise<Response> => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { filename, markdown, images, username, category } = body;

    if (!filename || !markdown) {
      return new Response(JSON.stringify({ error: "缺少参数" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let finalMarkdown = markdown;

    // 上传图片
    if (images?.length > 0) {
      for (const img of images) {
        const bytes = Uint8Array.from(atob(img.data), c => c.charCodeAt(0));
        const res = await fetch(`${SUPABASE_URL}/storage/v1/object/images/${img.name}`, {
          method: "POST",
          headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
            "Content-Type": img.type || "image/png",
          },
          body: bytes,
        });
        if (res.ok) {
          const url = `${SUPABASE_URL}/storage/v1/object/public/images/${img.name}`;
          finalMarkdown = finalMarkdown.replace(img.ref, url);
        }
      }
    }

    // 存入数据库
    const content = `---\nid: ${filename}\ntitle: ${filename}\n---\n\n${finalMarkdown}`;
    await fetch(`${SUPABASE_URL}/rest/v1/documents`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({
        filename,
        content,
        category: category || "process",
        uploader: username || "unknown",
        approved: false,
        created_at: new Date().toISOString(),
      }),
    });

    return new Response(JSON.stringify({ success: true, filename }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};