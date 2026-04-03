/**
 * Word 转 Markdown 转换脚本
 * 使用方法: node scripts/convert-docx.js
 */

const mammoth = require('mammoth');
const fs = require('fs-extra');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const DOCS_DIR = path.join(__dirname, '..', 'docs');
const IMAGES_DIR = path.join(__dirname, '..', 'static', 'img', 'manuals');

// 清理转换后的内容，移除冗余的锚点ID
function cleanContent(content) {
  // 移除 Word 生成的空锚点标签
  content = content.replace(/<a id="_[^"]*"><\/a>/g, '');
  // 移除残留的锚点ID
  content = content.replace(/<a id="_[^"]*">/g, '');
  // 修复连续的标题标记
  content = content.replace(/#{2,}/g, '##');
  // 将 __ 加粗标记转换为 **
  content = content.replace(/__([^_]+)__/g, '**$1**');
  // 清理多余的空行
  content = content.replace(/\n{3,}/g, '\n\n');
  return content;
}

async function convertDocx() {
  // 确保目录存在
  await fs.ensureDir(DOCS_DIR);
  await fs.ensureDir(IMAGES_DIR);

  // 获取 uploads 目录下的所有 docx 文件
  const files = await fs.readdir(UPLOADS_DIR);
  const docxFiles = files.filter(f => f.endsWith('.docx'));

  if (docxFiles.length === 0) {
    console.log('📂 uploads 目录中没有 .docx 文件');
    return;
  }

  console.log(`找到 ${docxFiles.length} 个 Word 文件\n`);

  for (const file of docxFiles) {
    const inputPath = path.join(UPLOADS_DIR, file);
    const fileName = path.basename(file, '.docx');
    // 使用 kebab-case 命名
    const outputName = fileName
      .replace(/[\(（\)]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^\u4e00-\u9fa5a-zA-Z0-9-]/g, '')
      .toLowerCase();

    console.log(`📄 转换: ${file}`);

    try {
      // 读取 Word 文件
      const result = await mammoth.convertToMarkdown({ path: inputPath }, {
        styleMap: [
          "p[style-name='Heading 1'] => h1",
          "p[style-name='Heading 2'] => h2",
          "p[style-name='Heading 3'] => h3",
        ]
      });

      // 清理内容
      let markdownContent = cleanContent(result.value);

      // 生成 YAML Frontmatter
      const frontmatter = `---
id: ${outputName}
title: ${fileName}
sidebar_label: ${fileName}
---

`;

      // 合并内容
      const content = frontmatter + markdownContent;

      // 输出到 docs 目录
      const outputPath = path.join(DOCS_DIR, `${outputName}.md`);
      await fs.writeFile(outputPath, content, 'utf8');

      console.log(`✅ 已生成: docs/${outputName}.md\n`);
    } catch (error) {
      console.error(`❌ 转换失败: ${file}`, error.message, '\n');
    }
  }

  console.log('🎉 转换完成！');
}

convertDocx();