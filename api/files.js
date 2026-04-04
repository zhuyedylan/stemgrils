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
    const docsDir = '/var/task/build/docs';
    console.log('docsDir:', docsDir, 'exists:', fs.existsSync(docsDir));
    console.log('cwd:', process.cwd());

    if (!fs.existsSync(docsDir)) {
      return res.json([]);
    }

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