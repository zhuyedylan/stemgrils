const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://jyhmhksdpjkzkhqlkuqh.supabase.co';
const supabaseKey = 'sb_publishable_a0zC2QDTxicG-HbxojKkTQ_medLD1JW';

const docsDir = '/Users/dylanmba/Desktop/@贝贝/编程/工艺手册/docs';

async function downloadDocs() {
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

    // 过滤掉 HTML 标签
    let content = doc.content || '';
    content = content.replace(/<[^>]+>/g, '');

    // 使用文件名作为 ID，确保与 sidebars 匹配
    const frontmatter = `---
id: ${doc.filename}
title: ${doc.filename}
---

`;
    const fullContent = frontmatter + content;

    fs.writeFileSync(filePath, fullContent, 'utf8');
    console.log(`✓ 保存: ${filename} (id: ${doc.filename})`);
  }
}

downloadDocs();