const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'build')));

// 保存文件 API
app.post('/api/save', (req, res) => {
  const { filePath, content } = req.body;

  if (!filePath || !content) {
    return res.status(400).json({ error: '缺少必要参数' });
  }

  // 确保路径安全
  const safePath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
  const fullPath = path.join(__dirname, 'docs', safePath);

  // 验证路径在 docs 目录内
  if (!fullPath.startsWith(path.join(__dirname, 'docs'))) {
    return res.status(403).json({ error: '路径不安全' });
  }

  try {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ 文件已保存: ${fullPath}`);
    res.json({ success: true, path: fullPath });
  } catch (error) {
    console.error('保存失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// 全局 multer 配置
const multer = require('multer');
const upload = multer({
  dest: 'uploads/',
  preservePath: true
});

// 上传 Word 文档并转换
app.post('/api/upload', async (req, res) => {
  // 使用 multer 处理文件上传
  upload.single('file')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: '上传失败: ' + err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: '请选择文件' });
    }

    try {
      const filePath = req.file.path;
      const originalName = req.file.originalname;

      // 生成文件名（提前定义，供 pandoc 使用）
      let baseName = path.basename(originalName, path.extname(originalName));
      try {
        baseName = decodeURIComponent(escape(baseName));
      } catch (e) {}
      const fileName = baseName
        .replace(/[\(（\)]/g, '')
        .replace(/\s+/g, '-')
        .replace(/[^\u4e00-\u9fa5a-zA-Z0-9-]/g, '')
        .toLowerCase();

      // 使用 pandoc 将 Word 转换为 Markdown (markdown 格式，表格为 pipe table)
      const tempOutput = filePath + '.md';
      // -t markdown: 输出 pipe table 格式（比 gfm 的 HTML table 更兼容 MDX）
      // --wrap=none: 避免长行自动换行
      // --extract-media: 提取图片到指定目录
      const mediaDir = path.join(__dirname, 'static', 'img', 'manuals', fileName);
      await execPromise(`pandoc "${filePath}" -t markdown --wrap=none -o "${tempOutput}" --extract-media="${mediaDir}"`);

      let content = fs.readFileSync(tempOutput, 'utf8');

      // 匹配多种图片格式：Markdown 图片（可能带属性）+ HTML <img> 标签
      // 格式：![alt](path) 或 ![alt](path){width="..."} 或 <img src="path">
      const markdownImageRegex = /!\[([^\]]*)\]\(([^)]+)\)(\{[^}]+\})?/g;
      const htmlImageRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;

      // 处理图片路径和重命名
      const imagesToProcess = [];

      // 抓取 Markdown 图片（包含可选的属性）
      let match;
      while ((match = markdownImageRegex.exec(content)) !== null) {
        imagesToProcess.push({
          original: match[2],
          alt: match[1],
          full: match[0],
          hasAttributes: !!match[3]
        });
      }

      // 抓取 HTML img 标签
      while ((match = htmlImageRegex.exec(content)) !== null) {
        imagesToProcess.push({ original: match[1], type: 'html', full: match[0] });
      }

      // 去重（同一张图片可能被重复匹配）
      const uniqueImages = Array.from(new Map(imagesToProcess.map(img => [img.original, img])).values());

      // 处理每张图片：移动到正确位置并统一为标准 Markdown 格式
      for (const img of uniqueImages) {
        const src = img.original;
        // 提取图片文件名（处理各种路径格式：media/xxx, /path/media/xxx, xxx）
        const srcFileName = path.basename(src);

        // 查找图片源文件（pandoc 提取到 mediaDir/media/ 下）
        const possibleSrcPaths = [
          path.join(mediaDir, 'media', srcFileName),
          path.join(mediaDir, srcFileName),
        ];

        let srcPath = null;
        for (const p of possibleSrcPaths) {
          if (fs.existsSync(p)) {
            srcPath = p;
            break;
          }
        }

        if (srcPath) {
          const newFileName = `${fileName}-${Date.now()}-${srcFileName}`;
          const destPath = path.join(__dirname, 'static', 'img', 'manuals', newFileName);

          // 移动图片到 static/img/manuals/
          if (srcPath !== destPath) {
            fs.renameSync(srcPath, destPath);
          }

          // 替换为标准 Markdown 格式（无属性）
          const altText = img.alt || path.basename(srcFileName, path.extname(srcFileName));
          const newMarkdown = `![${altText}](/img/manuals/${newFileName})`;
          content = content.replace(img.full, newMarkdown);
        }
      }

      // 清理提取的媒体目录（如果为空）
      if (fs.existsSync(mediaDir)) {
        // 清理 media 子目录
        const mediaSubDir = path.join(mediaDir, 'media');
        if (fs.existsSync(mediaSubDir) && fs.readdirSync(mediaSubDir).length === 0) {
          fs.rmdirSync(mediaSubDir);
        }
        if (fs.readdirSync(mediaDir).length === 0) {
          fs.rmdirSync(mediaDir);
        }
      }

      // 清理临时输出文件
      if (fs.existsSync(tempOutput)) {
        fs.unlinkSync(tempOutput);
      }

      // 清理内容，确保 MDX 兼容
      // 1. 清理 Word 生成的锚点标签
      content = content.replace(/<a id="_[^"]*"><\/a>/g, '');
      content = content.replace(/<a id="_[^"]*">/g, '');

      // 2. 清理 HTML 表格（如果残留，转为纯文本）
      content = content.replace(/<table[^>]*>[\s\S]*?<\/table>/gi, (match) => {
        // 提取表格文本内容
        return match.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      });

      // 3. 清理 HTML img 标签（如果残留）
      content = content.replace(/<img[^>]+>/gi, '');

      // 4. 清理所有 HTML 标签的 style 属性
      content = content.replace(/ style="[^"]*"/g, '');

      // 5. 清理 pandoc 图片尺寸属性 {width="..."}
      content = content.replace(/!\[([^\]]*)\]\(([^)]+)\)\{[^}]+\}/g, '![$1]($2)');

      // 6. 统一加粗格式 __xxx__ => **xxx**
      content = content.replace(/__([^_]+)__/g, '**$1**');

      // 7. 清理转义字符 \< => <
      content = content.replace(/\\</g, '<');

      // 8. 清理多余空行
      content = content.replace(/\n{3,}/g, '\n\n');

      // 转换中文章节标题为 Markdown 标题
      // 第一章、第二章... => h2
      content = content.replace(/^第([一二三四五六七八九十百千]+)章\s+(.+)$/gm, '## $2');
      // 第一节、第二节... => h3
      content = content.replace(/^第([一二三四五六七八九十百千]+)节\s+(.+)$/gm, '### $2');

      // 转换中文编号标题
      // 一、二、三、四、五、六... 开头且单独一行的 => h2
      const chineseNumbers = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
      for (const num of chineseNumbers) {
        content = content.replace(new RegExp(`^(${num}[、.]\\s*)(.+)$`, 'gm'), '## $2');
      }
      // 匹配 "（一）" "（二）" 等开头的行
      content = content.replace(/^（[一二三四五六七八九十]+）\s*(.+)$/gm, '## $2');

      // 生成 YAML Frontmatter
      const cleanTitle = baseName.replace(/\.docx?$/i, '');
      const frontmatter = `---
id: ${fileName}
title: ${cleanTitle}
---

`;

      // 保存到 docs
      const outputPath = path.join(__dirname, 'docs', `${fileName}.md`);
      fs.writeFileSync(outputPath, frontmatter + content, 'utf8');

      // 清理临时文件
      fs.unlinkSync(filePath);

      console.log(`✅ 文档已转换: ${outputPath}`);

      // 记录上传者信息
      const uploadersFile = path.join(__dirname, 'docs', '.uploaders.json');
      let uploaders = {};
      if (fs.existsSync(uploadersFile)) {
        uploaders = JSON.parse(fs.readFileSync(uploadersFile, 'utf8'));
      }
      uploaders[fileName] = {
        uploader: req.body.username || 'unknown',
        uploadedAt: new Date().toISOString(),
        category: req.body.category || 'process'
      };
      fs.writeFileSync(uploadersFile, JSON.stringify(uploaders, null, 2), 'utf8');

      res.json({ success: true, fileName: fileName, title: cleanTitle });
    } catch (error) {
      console.error('转换失败:', error);
      res.status(500).json({ error: '转换失败: ' + error.message });
    }
  });
});

// 重新构建并启动服务
app.post('/api/rebuild', async (req, res) => {
  const { exec } = require('child_process');
  const util = require('util');
  const execPromise = util.promisify(exec);

  try {
    console.log('🔄 开始构建...');
    await execPromise('npm run build', { cwd: __dirname });

    // 复制 md 文件
    const docsDir = path.join(__dirname, 'docs');
    const buildDocsDir = path.join(__dirname, 'build', 'docs');
    const files = fs.readdirSync(docsDir);
    for (const file of files) {
      if (file.endsWith('.md')) {
        fs.copyFileSync(
          path.join(docsDir, file),
          path.join(buildDocsDir, file)
        );
      }
    }

    console.log('✅ 构建完成');
    res.json({ success: true });
  } catch (error) {
    console.error('构建失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// 上传图片 API
app.post('/api/upload-image', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '没有文件' });
  }

  // 保存到 static 目录，这样重建后图片也会保留
  const staticImagesDir = path.join(__dirname, 'static', 'img', 'uploads');
  if (!fs.existsSync(staticImagesDir)) {
    fs.mkdirSync(staticImagesDir, { recursive: true });
  }

  const ext = path.extname(req.file.originalname);
  const newFileName = `${Date.now()}${ext}`;
  const staticPath = path.join(staticImagesDir, newFileName);

  fs.renameSync(req.file.path, staticPath);

  // 同时复制到 build 目录以便立即预览
  const buildImagesDir = path.join(__dirname, 'build', 'img', 'uploads');
  if (!fs.existsSync(buildImagesDir)) {
    fs.mkdirSync(buildImagesDir, { recursive: true });
  }
  fs.copyFileSync(staticPath, path.join(buildImagesDir, newFileName));

  res.json({ url: `/img/uploads/${newFileName}` });
});

// 重命名文档 API
app.post('/api/rename', (req, res) => {
  const { oldName, newName, username, role } = req.body;

  if (!oldName || !newName || !username) {
    return res.status(400).json({ error: '缺少必要参数' });
  }

  if (!newName.match(/^[\u4e00-\u9fa5a-zA-Z0-9_-]+$/)) {
    return res.status(400).json({ error: '文件名只能包含中文、英文、数字、下划线和连字符' });
  }

  const oldFilePath = path.join(__dirname, 'docs', `${oldName}.md`);
  const newFilePath = path.join(__dirname, 'docs', `${newName}.md`);

  if (!fs.existsSync(oldFilePath)) {
    return res.status(404).json({ error: '原文件不存在' });
  }

  if (fs.existsSync(newFilePath)) {
    return res.status(400).json({ error: '新文件名已存在' });
  }

  const uploadersFile = path.join(__dirname, 'docs', '.uploaders.json');
  let uploaders = {};
  if (fs.existsSync(uploadersFile)) {
    uploaders = JSON.parse(fs.readFileSync(uploadersFile, 'utf8'));
  }

  const uploader = uploaders[oldName]?.uploader;

  // 检查权限：上传者本人或管理员可以重命名
  if (uploader !== username && role !== 'admin') {
    return res.status(403).json({ error: '无权限重命名此文件' });
  }

  // 重命名文件
  fs.renameSync(oldFilePath, newFilePath);

  // 更新 uploaders 中的记录
  uploaders[newName] = uploaders[oldName];
  delete uploaders[oldName];
  fs.writeFileSync(uploadersFile, JSON.stringify(uploaders, null, 2), 'utf8');

  res.json({ success: true, newName });
});

// 删除文档 API
app.post('/api/delete', (req, res) => {
  const { fileName, username, role } = req.body;

  if (!fileName || !username) {
    return res.status(400).json({ error: '缺少必要参数' });
  }

  const uploadersFile = path.join(__dirname, 'docs', '.uploaders.json');
  let uploaders = {};
  if (fs.existsSync(uploadersFile)) {
    uploaders = JSON.parse(fs.readFileSync(uploadersFile, 'utf8'));
  }

  const uploader = uploaders[fileName]?.uploader;

  // 检查权限：上传者本人或管理员可以删除
  if (uploader !== username && role !== 'admin') {
    return res.status(403).json({ error: '无权限删除此文件' });
  }

  const filePath = path.join(__dirname, 'docs', `${fileName}.md`);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: '文件不存在' });
  }

  try {
    fs.unlinkSync(filePath);
    // 移除上传记录
    delete uploaders[fileName];
    fs.writeFileSync(uploadersFile, JSON.stringify(uploaders, null, 2), 'utf8');

    console.log(`✅ 文件已删除: ${filePath}`);
    res.json({ success: true });
  } catch (error) {
    console.error('删除失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取文件列表 API（从 Supabase 读取）
const supabaseUrl = 'https://jyhmhksdpjkzkhqlkuqh.supabase.co';
const supabaseKey = 'sb_publishable_a0zC2QDTxicG-HbxojKkTQ_medLD1JW';

app.get('/api/files', async (req, res) => {
  try {
    // 从 Supabase 获取所有文档
    const response = await fetch(`${supabaseUrl}/rest/v1/documents?select=*&order=created_at.desc`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    const files = await response.json();

    res.json(files.map(f => ({
      path: f.filename,
      label: f.filename,
      uploader: f.uploader,
      category: f.category,
      approved: f.approved,
      hidden: f.hidden,
      rejection_reason: f.rejection_reason
    })));
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({ error: error.message });
  }
});

// 读取 Markdown 文件内容 API
app.get('/api/read', (req, res) => {
  const { filePath } = req.query;
  if (!filePath) {
    return res.status(400).json({ error: '缺少文件路径' });
  }

  // 从 docs 目录读取原始 md 文件
  const fileName = filePath.split('/').pop();
  const mdFilePath = path.join(__dirname, 'docs', `${fileName}.md`);

  if (!fs.existsSync(mdFilePath)) {
    return res.status(404).json({ error: '文件不存在' });
  }

  try {
    const content = fs.readFileSync(mdFilePath, 'utf8');
    res.json({ content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== 目录管理 API =====

// 读取目录配置
app.get('/api/categories', (req, res) => {
  const categoriesFile = path.join(__dirname, 'docs', '.categories.json');
  let categories = [
    { id: 'intro', name: '简介', order: 0, allowUserUpload: true },
    { id: 'process', name: '工艺手册', order: 1, allowUserUpload: true }
  ];
  if (fs.existsSync(categoriesFile)) {
    categories = JSON.parse(fs.readFileSync(categoriesFile, 'utf8'));
  }
  res.json(categories);
});

// 创建目录
app.post('/api/categories', (req, res) => {
  const { name, allowUserUpload } = req.body;
  if (!name) {
    return res.status(400).json({ error: '目录名称不能为空' });
  }

  const categoriesFile = path.join(__dirname, 'docs', '.categories.json');
  let categories = [];
  if (fs.existsSync(categoriesFile)) {
    categories = JSON.parse(fs.readFileSync(categoriesFile, 'utf8'));
  }

  // 生成唯一ID
  const id = name.toLowerCase().replace(/\s+/g, '-').replace(/[^\u4e00-\u9fa5a-z0-9-]/g, '');
  let newId = id;
  let counter = 1;
  while (categories.find(c => c.id === newId)) {
    newId = `${id}-${counter}`;
    counter++;
  }

  const newCategory = {
    id: newId,
    name,
    order: categories.length,
    allowUserUpload: allowUserUpload !== false
  };

  categories.push(newCategory);
  fs.writeFileSync(categoriesFile, JSON.stringify(categories, null, 2), 'utf8');

  res.json({ success: true, category: newCategory });
});

// 更新目录
app.put('/api/categories/:id', (req, res) => {
  const { id } = req.params;
  const { name, allowUserUpload, order } = req.body;

  const categoriesFile = path.join(__dirname, 'docs', '.categories.json');
  if (!fs.existsSync(categoriesFile)) {
    return res.status(404).json({ error: '目录不存在' });
  }

  let categories = JSON.parse(fs.readFileSync(categoriesFile, 'utf8'));
  const index = categories.findIndex(c => c.id === id);

  if (index === -1) {
    return res.status(404).json({ error: '目录不存在' });
  }

  if (name) categories[index].name = name;
  if (allowUserUpload !== undefined) categories[index].allowUserUpload = allowUserUpload;
  if (order !== undefined) categories[index].order = order;

  fs.writeFileSync(categoriesFile, JSON.stringify(categories, null, 2), 'utf8');

  res.json({ success: true, category: categories[index] });
});

// 删除目录
app.delete('/api/categories/:id', (req, res) => {
  const { id } = req.params;

  const categoriesFile = path.join(__dirname, 'docs', '.categories.json');
  if (!fs.existsSync(categoriesFile)) {
    return res.status(404).json({ error: '目录不存在' });
  }

  let categories = JSON.parse(fs.readFileSync(categoriesFile, 'utf8'));
  const index = categories.findIndex(c => c.id === id);

  if (index === -1) {
    return res.status(404).json({ error: '目录不存在' });
  }

  categories.splice(index, 1);
  // 重新排序
  categories.forEach((c, i) => c.order = i);

  fs.writeFileSync(categoriesFile, JSON.stringify(categories, null, 2), 'utf8');

  res.json({ success: true });
});

// 重新排序目录
app.post('/api/categories/reorder', (req, res) => {
  const { order } = req.body; // 新的顺序数组 [id1, id2, ...]

  if (!order || !Array.isArray(order)) {
    return res.status(400).json({ error: '无效的顺序' });
  }

  const categoriesFile = path.join(__dirname, 'docs', '.categories.json');
  let categories = [];
  if (fs.existsSync(categoriesFile)) {
    categories = JSON.parse(fs.readFileSync(categoriesFile, 'utf8'));
  }

  // 更新顺序
  order.forEach((id, index) => {
    const cat = categories.find(c => c.id === id);
    if (cat) cat.order = index;
  });

  categories.sort((a, b) => a.order - b.order);
  fs.writeFileSync(categoriesFile, JSON.stringify(categories, null, 2), 'utf8');

  res.json({ success: true });
});

// 获取文档所属目录
app.get('/api/doc-category', (req, res) => {
  const { fileName } = req.query;
  if (!fileName) {
    return res.status(400).json({ error: '缺少文件名' });
  }

  const categoriesFile = path.join(__dirname, 'docs', '.categories.json');
  const uploadersFile = path.join(__dirname, 'docs', '.uploaders.json');

  let categories = [];
  if (fs.existsSync(categoriesFile)) {
    categories = JSON.parse(fs.readFileSync(categoriesFile, 'utf8'));
  }

  let docCategory = 'process'; // 默认
  if (fs.existsSync(uploadersFile)) {
    const uploaders = JSON.parse(fs.readFileSync(uploadersFile, 'utf8'));
    if (uploaders[fileName]?.category) {
      docCategory = uploaders[fileName].category;
    }
  }

  res.json({ category: docCategory });
});

// 设置文档所属目录
app.post('/api/doc-category', (req, res) => {
  const { fileName, category } = req.body;
  if (!fileName || !category) {
    return res.status(400).json({ error: '缺少必要参数' });
  }

  const uploadersFile = path.join(__dirname, 'docs', '.uploaders.json');
  let uploaders = {};
  if (fs.existsSync(uploadersFile)) {
    uploaders = JSON.parse(fs.readFileSync(uploadersFile, 'utf8'));
  }

  if (!uploaders[fileName]) {
    uploaders[fileName] = {};
  }
  uploaders[fileName].category = category;

  fs.writeFileSync(uploadersFile, JSON.stringify(uploaders, null, 2), 'utf8');

  res.json({ success: true });
});

// SPA fallback - 所有非 API 请求返回 index.html
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
  console.log(`💾 保存文件: POST http://localhost:${PORT}/api/save`);
  console.log(`📤 上传文档: POST http://localhost:${PORT}/api/upload`);
  console.log(`🔄 重新构建: POST http://localhost:${PORT}/api/rebuild`);
});