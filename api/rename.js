const fs = require('fs');
const path = require('path');

const docsDir = '/var/task/docs';

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { oldName, newName } = req.body || {};
  if (!oldName || !newName) {
    return res.status(400).json({ error: '缺少参数' });
  }

  const oldPath = path.join(docsDir, `${oldName}.md`);
  const newPath = path.join(docsDir, `${newName}.md`);

  if (!fs.existsSync(oldPath)) {
    return res.status(404).json({ error: '原文件不存在' });
  }

  if (fs.existsSync(newPath)) {
    return res.status(400).json({ error: '新文件名已存在' });
  }

  fs.renameSync(oldPath, newPath);
  res.json({ success: true, newName });
};