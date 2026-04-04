const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://jyhmhksdpjkzkhqlkuqh.supabase.co';
const supabaseKey = 'sb_publishable_a0zC2QDTxicG-HbxojKkTQ_medLD1JW';

const docsDir = '/Users/dylanmba/Desktop/@贝贝/编程/工艺手册/docs';

async function uploadDocs() {
  const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.md'));

  for (const file of files) {
    const filePath = path.join(docsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const filename = file.replace('.md', '');

    // 根据文件名判断分类
    let category = 'process';
    if (filename.includes('intro') || filename.includes('介绍') || filename.includes('计划')) {
      category = 'intro';
    }

    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/documents`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({
          filename: filename,
          content: content,
          category: category,
          uploader: 'admin'
        })
      });

      if (response.ok) {
        console.log(`✓ 上传成功: ${filename}`);
      } else {
        const err = await response.text();
        console.log(`✗ 失败: ${filename} - ${err}`);
      }
    } catch (error) {
      console.log(`✗ 错误: ${filename} - ${error.message}`);
    }
  }
}

uploadDocs();