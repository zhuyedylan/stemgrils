const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL || 'https://jyhmhksdpjkzkhqlkuqh.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5aG1oa3NkcGpremtocWxrdXFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMDEwNTYsImV4cCI6MjA5MDg3NzA1Nn0.e5iYCkY-UNumjWWnsPugc5nIUKOkITccuhODLPBCiwc';

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

    // 获取已审批且未隐藏的文档，包括分类字段（order 字段可能不存在）
    // 先尝试带 order 字段的查询，如果失败则不带 order
    let response = await fetch(`${supabaseUrl}/rest/v1/documents?select=filename,content,category,order&approved=eq.true&hidden=eq.false&order=category,filename.asc`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    // 如果失败（order 字段不存在），则不带 order 字段查询
    if (!response.ok) {
      console.log('Note: order column not found, using basic query');
      response = await fetch(`${supabaseUrl}/rest/v1/documents?select=filename,content,category&approved=eq.true&hidden=eq.false&order=category,filename.asc`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error: ${response.status} - ${errorText}`);
      process.exit(1);
    }

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

    // 保存分类和排序信息到 .supabase-categories.json
    const categoriesData = {
      categories: {},
      orders: {}
    };
    for (const doc of docs) {
      if (doc.category) {
        categoriesData.categories[doc.filename] = doc.category;
      }
      if (doc.order !== undefined && doc.order !== null) {
        categoriesData.orders[doc.filename] = doc.order;
      }
    }
    fs.writeFileSync(path.join(docsDir, '.supabase-categories.json'), JSON.stringify(categoriesData, null, 2), 'utf8');
    console.log('✓ Saved categories and orders data');

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

      // MDX兼容性修复：将 <br> 转换为 <br/>
      content = content.replace(/<br>/g, '<br/>');

      // 移除不存在图片的引用（project-images 目录下的图片）
      content = content.replace(/!\[.*?\]\(\/img\/project-images\/.*?\)/g, '');

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