const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://jyhmhksdpjkzkhqlkuqh.supabase.co";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "sb_publishable_a0zC2QDTxicG-HbxojKkTQ_medLD1JW";

console.log("upload-doc function started");

export default async (req: Request): Promise<Response> => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { filename, username, category, markdown, images } = body;

    if (!filename || !markdown) {
      return new Response(JSON.stringify({ error: "缺少文件名或内容" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Document:", filename, "Images:", images?.length || 0);

    let finalMarkdown = markdown;
    const uploadedImageUrls: string[] = [];

    if (images && images.length > 0) {
      const safeFilename = filename.replace(/[^一-龥a-zA-Z0-9_-]/g, "-");

      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const imageFileName = `${safeFilename}-${Date.now()}-${i + 1}-${img.name}`;

        const binaryString = atob(img.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let j = 0; j < binaryString.length; j++) {
          bytes[j] = binaryString.charCodeAt(j);
        }

        const uploadResponse = await fetch(
          `${SUPABASE_URL}/storage/v1/object/images/${imageFileName}`,
          {
            method: "POST",
            headers: {
              "apikey": SUPABASE_SERVICE_KEY,
              "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
              "Content-Type": img.type || "image/png",
              "x-upsert": "true",
            },
            body: bytes,
          }
        );

        if (uploadResponse.ok) {
          const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/images/${imageFileName}`;
          uploadedImageUrls.push(publicUrl);
          finalMarkdown = finalMarkdown.replace(new RegExp(img.ref, "g"), publicUrl);
        }
      }
    }

    const fullContent = `---
id: ${filename}
title: ${filename}
---

${finalMarkdown}`;

    const docResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/documents`,
      {
        method: "POST",
        headers: {
          "apikey": SUPABASE_SERVICE_KEY,
          "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=minimal",
        },
        body: JSON.stringify({
          filename: filename,
          content: fullContent,
          category: category || "process",
          uploader: username || "unknown",
          approved: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      }
    );

    if (!docResponse.ok) {
      const errorText = await docResponse.text();
      return new Response(JSON.stringify({ error: `存储失败: ${errorText}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        filename: filename,
        imagesUploaded: uploadedImageUrls.length,
        message: uploadedImageUrls.length > 0
          ? `上传成功，${uploadedImageUrls.length} 张图片已上传`
          : "上传成功",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: `处理失败: ${error.message || error}` }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};