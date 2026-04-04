const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://jyhmhksdpjkzkhqlkuqh.supabase.co';
const supabaseKey = 'sb_publishable_a0zC2QDTxicG-HbxojKkTQ_medLD1JW';

const docsDir = '/Users/dylanmba/Desktop/@贝贝/编程/工艺手册/docs';

// 检查是否在 Vercel 环境
const isVercel = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_VERSION;

async function downloadDocs() {
  // Vercel 环境下跳过本地文件写入（API 端点直接读取 Supabase）
  if (isVercel) {
    console.log('Running on Vercel, skipping local docs sync');
    return;
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/documents?select=*`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    const docs = await response.json();

    for (const doc of docs) {
      const filename = doc.filename + '.md';
      const filePath = path.join(docsDir, filename);

      // 去除已有的 frontmatter
      let content = doc.content || '';
      content = content.replace(/<[^>]+>/g, '');
      content = content.replace(/^---[\s\S]*?---\n/, '');
      content = content.trim();

      // 使用文件名作为 ID
      const frontmatter = `---
id: ${doc.filename}
title: ${doc.filename}
---

`;
      const fullContent = frontmatter + content;

      fs.writeFileSync(filePath, fullContent, 'utf8');
      console.log(`✓ 保存: ${filename}`);
    }
  } catch (error) {
    console.error('Error downloading docs:', error.message);
  }
}

downloadDocs();