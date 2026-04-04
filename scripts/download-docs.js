const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://jyhmhksdpjkzkhqlkuqh.supabase.co';
const supabaseKey = 'sb_publishable_a0zC2QDTxicG-HbxojKkTQ_medLD1JW';

// 本地开发路径
const localDocsDir = '/Users/dylanmba/Desktop/@贝贝/编程/工艺手册/docs';

// Vercel 路径
const vercelDocsDir = process.env.VERCEL ? '/vercel/path0/docs' : null;

const docsDir = vercelDocsDir || localDocsDir;

async function downloadDocs() {
  try {
    // 确保目录存在
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/documents?select=*`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    const docs = await response.json();
    console.log(`Found ${docs.length} documents to sync`);

    for (const doc of docs) {
      const filename = doc.filename + '.md';
      const filePath = path.join(docsDir, filename);

      // 去除已有的 frontmatter 和 HTML 标签
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
      console.log(`✓ Saved: ${filename}`);
    }

    console.log('Docs sync completed');
  } catch (error) {
    console.error('Error downloading docs:', error.message);
    // 不退出，让构建继续
  }
}

downloadDocs();