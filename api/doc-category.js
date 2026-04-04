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

  const { fileName, category } = req.body || {};
  if (!fileName) {
    return res.status(400).json({ error: '缺少文件名' });
  }

  const uploadersFile = path.join(docsDir, '.uploaders.json');
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
};