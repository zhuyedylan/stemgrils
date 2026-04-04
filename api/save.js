const fs = require('fs');
const path = require('path');

const docsDir = path.join(process.cwd(), 'build/docs');

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { filePath, content } = req.body || {};
  if (!filePath || !content) {
    return res.status(400).json({ error: '缺少参数' });
  }

  const fullPath = path.join(docsDir, filePath);
  try {
    fs.writeFileSync(fullPath, content, 'utf8');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};