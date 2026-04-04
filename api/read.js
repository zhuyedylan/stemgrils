const fs = require('fs');
const path = require('path');

// 读取本地 docs 目录
const docsDir = path.join(__dirname, '../../docs');
let testContent = {};

// 尝试读取本地文件
try {
  if (fs.existsSync(docsDir)) {
    const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.md') && !f.startsWith('.'));
    for (const file of files) {
      const fileName = file.replace('.md', '');
      const content = fs.readFileSync(path.join(docsDir, file), 'utf8');
      testContent[fileName] = content;
    }
    console.log('Loaded files:', Object.keys(testContent));
  }
} catch (e) {
  console.log('Error loading docs:', e.message);
}

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { filePath } = req.query;
  if (!filePath) {
    return res.status(400).json({ error: '缺少文件路径' });
  }

  const fileName = filePath.replace('.md', '');
  const content = testContent[fileName];

  if (!content) {
    return res.status(404).json({ error: '文件不存在: ' + filePath });
  }

  res.json({ content });
};