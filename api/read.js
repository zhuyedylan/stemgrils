const fs = require('fs');
const path = require('path');

const docsDir = '/var/task/build/docs';

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { filePath } = req.query;
  if (!filePath) {
    return res.status(400).json({ error: '缺少文件路径' });
  }

  const fullPath = path.join(docsDir, filePath);
  console.log('fullPath:', fullPath, 'exists:', fs.existsSync(fullPath));
  console.log('docsDir exists:', fs.existsSync(docsDir));
  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ error: '文件不存在' });
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  res.json({ content });
};