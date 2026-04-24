const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL || 'https://jyhmhksdpjkzkhqlkuqh.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'sb_publishable_a0zC2QDTxicG-HbxojKkTQ_medLD1JW';

async function downloadDocs() {
  try {
    // 在 Vercel 和本地都使用项目根目录下的 docs 目录
    // Vercel 构建时工作目录就是项目根目录
    const docsDir = path.join(process.cwd(), 'docs');

    console.log(`Docs directory: ${docsDir}`);
    console.log(`Current working directory: ${process.cwd()}`);

    if (!fs.existsSync(docsDir)) {
      console.log(`Creating docs directory: ${docsDir}`);
      fs.mkdirSync(docsDir, { recursive: true });
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

    if (!docs || docs.length === 0) {
      console.log('No approved documents found');
      return;
    }

    const validFilenames = new Set(docs.map(d => d.filename + '.md'));

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
      // 移除已有的 frontmatter（保留原始内容）
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

    console.log('Docs sync completed');
    console.log(`Total documents saved: ${docs.length}`);
  } catch (error) {
    console.error('Error downloading docs:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1); // 让构建失败以便发现问题
  }
}

downloadDocs();