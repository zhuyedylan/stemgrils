const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 硬编码测试数据 - 确认 API 工作
    const testFiles = [
      { path: 'project-intro.md', label: 'project-intro' },
      { path: '探知未来科技女性培养计划.md', label: '探知未来科技女性培养计划' },
      { path: '家庭废旧ABS制品再生3d打印线材工艺手册.md', label: '家庭废旧ABS制品再生3d打印线材工艺手册' },
      { path: '再生PLA与咖啡渣混合打印线材工艺指南.md', label: '再生PLA与咖啡渣混合打印线材工艺指南' }
    ];

    console.log('Returning test files');
    res.json(testFiles);

    const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.md') && !f.startsWith('.'));
    console.log('files:', files);

    res.json(files.map(f => ({
      path: f,
      label: f.replace('.md', '')
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};