const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const PORT = process.env.PORT || 3000;

// 静态文件
app.use(express.static(path.join(__dirname, 'build')));

// 保存文件 API
app.post('/api/save', (req, res) => {
  const { filePath, content } = req.body;
  const fullPath = path.join(__dirname, 'docs', filePath);
  fs.writeFileSync(fullPath, content, 'utf8');
  res.json({ success: true });
});

// 读取文件
app.get('/api/read', (req, res) => {
  const { filePath } = req.query;
  const fullPath = path.join(__dirname, 'docs', filePath);
  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ error: '文件不存在' });
  }
  res.json({ content: fs.readFileSync(fullPath, 'utf8') });
});

// 获取文件列表
app.get('/api/files', (req, res) => {
  const docsDir = path.join(__dirname, 'docs');
  const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.md') && !f.startsWith('.'));
  res.json(files.map(f => ({ path: f, label: f.replace('.md', '') })));
});

// 获取目录
app.get('/api/categories', (req, res) => {
  const file = path.join(__dirname, 'docs', '.categories.json');
  const categories = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
  res.json(categories);
});

// 删除文档
app.post('/api/delete', (req, res) => {
  const { fileName } = req.body;
  const filePath = path.join(__dirname, 'docs', `${fileName}.md`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  res.json({ success: true });
});

// 重命名
app.post('/api/rename', (req, res) => {
  const { oldName, newName } = req.body;
  const oldPath = path.join(__dirname, 'docs', `${oldName}.md`);
  const newPath = path.join(__dirname, 'docs', `${newName}.md`);
  if (fs.existsSync(oldPath)) {
    fs.renameSync(oldPath, newPath);
  }
  res.json({ success: true });
});

// 文档分类
app.get('/api/doc-category', (req, res) => {
  res.json({ category: '' });
});

app.post('/api/doc-category', (req, res) => {
  res.json({ success: true });
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});