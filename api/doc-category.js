const supabaseUrl = 'https://jyhmhksdpjkzkhqlkuqh.supabase.co';
const supabaseKey = 'sb_publishable_a0zC2QDTxicG-HbxojKkTQ_medLD1JW';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { fileName } = req.query;
  if (!fileName) {
    return res.status(400).json({ error: '缺少文件名' });
  }

  const filename = fileName.replace('.md', '');

  try {
    // 从 Supabase 获取文档的分类
    const response = await fetch(`${supabaseUrl}/rest/v1/documents?filename=eq.${encodeURIComponent(filename)}&select=category`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    const data = await response.json();

    if (data && data.length > 0) {
      res.json({ category: data[0].category || '' });
    } else {
      res.json({ category: '' });
    }
  } catch (error) {
    res.json({ category: '' });
  }
};