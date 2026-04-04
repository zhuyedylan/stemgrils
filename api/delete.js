const fs = require('fs');
const path = require('path');

const docsDir = path.join(__dirname, '../../docs');

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { fileName } = req.body || {};
  if (!fileName) {
    return res.status(400).json({ error: '缺少文件名' });
  }

  const fullPath = path.join(docsDir, `${fileName}.md`);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
  res.json({ success: true });
};