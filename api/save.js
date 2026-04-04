const supabaseUrl = 'https://jyhmhksdpjkzkhqlkuqh.supabase.co';
const supabaseKey = 'sb_publishable_a0zC2QDTxicG-HbxojKkTQ_medLD1JW';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { filePath, content, category, uploader } = req.body || {};
  if (!filePath || !content) {
    return res.status(400).json({ error: '缺少参数' });
  }

  const fileName = filePath.replace('.md', '');

  try {
    // 检查文档是否存在
    const checkResp = await fetch(`${supabaseUrl}/rest/v1/documents?filename=eq.${encodeURIComponent(fileName)}&select=id`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    const existing = await checkResp.json();

    if (existing && existing.length > 0) {
      // 更新现有文档
      const updateResp = await fetch(`${supabaseUrl}/rest/v1/documents?filename=eq.${encodeURIComponent(fileName)}`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          content: content,
          updated_at: new Date().toISOString()
        })
      });

      if (!updateResp.ok) {
        const err = await updateResp.text();
        throw new Error(err);
      }
    } else {
      // 插入新文档
      const insertResp = await fetch(`${supabaseUrl}/rest/v1/documents`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          filename: fileName,
          content: content,
          category: category || 'process',
          uploader: uploader || 'admin'
        })
      });

      if (!insertResp.ok) {
        const err = await insertResp.text();
        throw new Error(err);
      }
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};