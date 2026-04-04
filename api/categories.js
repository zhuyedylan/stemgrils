const fs = require('fs');
const path = require('path');

const docsDir = '/var/task/docs';

// 确保 docs 目录存在
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

module.exports = (req, res) => {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 获取分类列表
    const file = path.join(docsDir, '.categories.json');
    const categories = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [
      { id: 'intro', name: '项目介绍', order: 0, allowUserUpload: true },
      { id: 'process', name: '工艺手册', order: 1, allowUserUpload: true }
    ];
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};