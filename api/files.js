const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 硬编码测试数据
  const testFiles = [
    { path: 'project-intro.md', label: 'project-intro' },
    { path: '探知未来科技女性培养计划.md', label: '探知未来科技女性培养计划' },
    { path: '家庭废旧ABS制品再生3d打印线材工艺手册.md', label: '家庭废旧ABS制品再生3d打印线材工艺手册' },
    { path: '再生PLA与咖啡渣混合打印线材工艺指南.md', label: '再生PLA与咖啡渣混合打印线材工艺指南' }
  ];

  res.json(testFiles);
};