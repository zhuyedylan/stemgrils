import { convert } from "npm:pandoc-wasm";
import JSZip from "npm:jszip";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://jyhmhksdpjkzkhqlkuqh.supabase.co";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "sb_publishable_a0zC2QDTxicG-HbxojKkTQ_medLD1JW";

console.log("convert-docx function started (using pandoc-wasm)");

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
    const { file, filename, username, category } = body;

    if (!file || !filename) {
      return new Response(JSON.stringify({ error: "缺少文件或文件名" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 解码 base64 文件
    const binaryString = atob(file);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const docxBlob = new Blob([bytes]);

    console.log("文件解码完成，开始 pandoc 转换...");

    // ===== Step 1: pandoc-wasm 转换 =====
    const pandocResult = await convert(
      { from: "docx", to: "markdown", "input-file": "input.docx" },
      null,
      { "input.docx": docxBlob }
    );

    let markdownContent = pandocResult.stdout;

    console.log("pandoc 转换完成，长度:", markdownContent.length);

    // ===== Step 2: 从 docx 提取图片 =====
    const zip = await JSZip.loadAsync(bytes);
    const mediaFiles = zip.file(/word\/media\/.*/);

    console.log("提取图片数量:", mediaFiles.length);

    // ===== Step 3: 上传图片到 Supabase Storage =====
    const safeFilename = filename.replace(/[^\u4e00-\u9fa5a-zA-Z0-9_-]/g, "-");
    const uploadedImages: string[] = [];

    for (let i = 0; i < mediaFiles.length; i++) {
      const zipFile = mediaFiles[i];
      const originalName = zipFile.name.replace("word/media/", "");
      const imageFileName = `${safeFilename}-${Date.now()}-${i + 1}-${originalName}`;

      // 提取图片数据
      const imageData = await zipFile.async("uint8array");

      // 检测图片类型
      const mimeType = originalName.endsWith(".png") ? "image/png"
        : originalName.endsWith(".jpg") || originalName.endsWith(".jpeg") ? "image/jpeg"
        : originalName.endsWith(".gif") ? "image/gif"
        : "image/png";

      // 上传到 Supabase Storage
      const uploadResponse = await fetch(
        `${SUPABASE_URL}/storage/v1/object/images/${imageFileName}`,
        {
          method: "POST",
          headers: {
            "apikey": SUPABASE_SERVICE_KEY,
            "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
            "Content-Type": mimeType,
            "x-upsert": "true",
          },
          body: imageData,
        }
      );

      if (uploadResponse.ok) {
        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/images/${imageFileName}`;
        uploadedImages.push(publicUrl);

        // 替换 Markdown 中的图片路径
        markdownContent = markdownContent.replace(
          new RegExp(`media/${originalName}`, "g"),
          publicUrl
        );
        console.log(`图片上传成功: ${imageFileName}`);
      } else {
        console.error(`图片上传失败: ${originalName}`);
        markdownContent = markdownContent.replace(
          new RegExp(`media/${originalName}`, "g"),
          `[图片 ${i + 1} 上传失败]`
        );
      }
    }

    // ===== Step 4: 内容清理 =====

    // 清理多余空行
    markdownContent = markdownContent.replace(/\n{3,}/g, "\n\n");

    // 修复标题格式（确保 # 后有空格）
    markdownContent = markdownContent.replace(/^(#{1,6})([^\s#])/gm, "$1 $2");

    // ===== Step 5: 生成完整内容 =====
    const fullContent = `---
id: ${filename}
title: ${filename}
---

${markdownContent}`;

    // ===== Step 6: 存入 Supabase documents 表 =====
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

    console.log("文档存储成功:", filename);

    return new Response(
      JSON.stringify({
        success: true,
        filename: filename,
        imagesUploaded: uploadedImages.length,
        contentLength: fullContent.length,
        message: uploadedImages.length > 0
          ? `转换成功，${uploadedImages.length} 张图片已上传`
          : "转换成功",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("转换错误:", error);
    return new Response(
      JSON.stringify({ error: `转换失败: ${error.message || error}` }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};