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
    // 尝试多个路径
    const paths = ['/var/task/docs', '/var/task/build/docs'];
    let docsDir = null;

    for (const p of paths) {
      console.log('checking:', p, fs.existsSync(p));
      if (fs.existsSync(p)) {
        docsDir = p;
        break;
      }
    }

    if (!docsDir) {
      console.log('cwd:', process.cwd());
      return res.json([]);
    }

    console.log('using docsDir:', docsDir);

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