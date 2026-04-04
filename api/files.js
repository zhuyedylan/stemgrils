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
    // 尝试多个可能的路径
    const paths = [
      path.join(process.cwd(), 'build/docs'),
      path.join(__dirname, '../../docs'),
      '/vercel/src0/docs',
      '/var/task/docs'
    ];

    let docsDir = null;
    for (const p of paths) {
      if (fs.existsSync(p)) {
        docsDir = p;
        break;
      }
    }

    console.log('trying paths:', paths);
    console.log('docsDir found:', docsDir);

    if (!docsDir) {
      return res.json([]);
    }
    const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.md') && !f.startsWith('.'));
    console.log('files:', files);
    const uploadersFile = path.join(docsDir, '.uploaders.json');
    let uploaders = {};
    if (fs.existsSync(uploadersFile)) {
      uploaders = JSON.parse(fs.readFileSync(uploadersFile, 'utf8'));
    }

    const categoriesFile = path.join(docsDir, '.categories.json');
    let categories = [];
    if (fs.existsSync(categoriesFile)) {
      categories = JSON.parse(fs.readFileSync(categoriesFile, 'utf8'));
    }

    const filesWithInfo = files.map(f => {
      const fileName = f.replace('.md', '');
      return {
        path: f,
        label: fileName,
        uploader: uploaders[fileName]?.uploader || null,
        category: categories[0]?.id || 'intro'
      };
    });

    res.json(filesWithInfo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};