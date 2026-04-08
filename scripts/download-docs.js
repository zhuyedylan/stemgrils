const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://jyhmhksdpjkzkhqlkuqh.supabase.co';
const supabaseKey = 'sb_publishable_a0zC2QDTxicG-HbxojKkTQ_medLD1JW';

// 本地路径
const localDocsDir = path.join(__dirname, '..', 'docs');
// Vercel 路径
const vercelDocsDir = process.env.VERCEL ? '/vercel/path0/docs' : null;

async function downloadDocs() {
  try {
    const docsDirs = [localDocsDir];
    if (vercelDocsDir) {
      docsDirs.push(vercelDocsDir);
    }

    // 获取已审批且未隐藏的文档
    const response = await fetch(`${supabaseUrl}/rest/v1/documents?select=filename,content&approved=eq.true&hidden=eq.false&order=created_at.desc`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    const docs = await response.json();
    console.log(`Found ${docs.length} approved documents`);

    const validFilenames = new Set(docs.map(d => d.filename + '.md'));

    for (const docsDir of docsDirs) {
      if (!fs.existsSync(docsDir)) {
        fs.mkdirSync(docsDir, { recursive: true });
        continue;
      }

      // 删除不在 Supabase 中的文档
      const existingFiles = fs.readdirSync(docsDir).filter(f => f.endsWith('.md') && !f.startsWith('.'));
      for (const file of existingFiles) {
        if (!validFilenames.has(file)) {
          fs.unlinkSync(path.join(docsDir, file));
          console.log(`🗑️ Deleted: ${file}`);
        }
      }

      // 保存 Supabase 中的文档
      for (const doc of docs) {
        const filename = doc.filename + '.md';
        const filePath = path.join(docsDir, filename);

        let content = doc.content || '';
        // 如果是 HTML，转为简单文本
        if (content.startsWith('<')) {
          content = content.replace(/<[^>]+>/g, '');
        }
        content = content.replace(/^---[\s\S]*?---\n/, '');
        content = content.trim();

        const frontmatter = `---
id: ${doc.filename}
title: ${doc.filename}
---

`;
        const fullContent = frontmatter + content;

        fs.writeFileSync(filePath, fullContent, 'utf8');
        console.log(`✓ Saved: ${filename}`);
      }
    }

    console.log('Docs sync completed');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

downloadDocs();