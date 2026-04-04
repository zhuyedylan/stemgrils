const express = require('express');
const fs = require('fs');
const path = require('path');

const docsDir = path.join(__dirname, '../docs');

// 确保 docs 目录存在
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

const api = express();

// 保存文件
api.post('/save', (req, res) => {
  const { filePath, content } = req.body;
  if (!filePath || !content) return res.status(400).json({ error: '缺少参数' });
  const fullPath = path.join(docsDir, filePath);
  fs.writeFileSync(fullPath, content, 'utf8');
  res.json({ success: true });
});

// 读取文件
api.get('/read', (req, res) => {
  const { filePath } = req.query;
  const fullPath = path.join(docsDir, filePath);
  if (!fs.existsSync(fullPath)) return res.status(404).json({ error: '不存在' });
  res.json({ content: fs.readFileSync(fullPath, 'utf8') });
});

// 获取文件列表
api.get('/files', (req, res) => {
  const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.md') && !f.startsWith('.'));
  res.json(files.map(f => ({ path: f, label: f.replace('.md', '') })));
});

// 获取分类
api.get('/categories', (req, res) => {
  const file = path.join(docsDir, '.categories.json');
  res.json(fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : []);
});

// 删除
api.post('/delete', (req, res) => {
  const { fileName } = req.body;
  const fullPath = path.join(docsDir, `${fileName}.md`);
  if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  res.json({ success: true });
});

// 重命名
api.post('/rename', (req, res) => {
  const { oldName, newName } = req.body;
  const oldPath = path.join(docsDir, `${oldName}.md`);
  const newPath = path.join(docsDir, `${newName}.md`);
  if (fs.existsSync(oldPath)) fs.renameSync(oldPath, newPath);
  res.json({ success: true });
});

// 分类
api.get('/doc-category', (req, res) => res.json({ category: '' }));
api.post('/doc-category', (req, res) => res.json({ success: true }));

module.exports = api;