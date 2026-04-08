const supabaseUrl = 'https://jyhmhksdpjkzkhqlkuqh.supabase.co';
const supabaseKey = 'sb_publishable_a0zC2QDTxicG-HbxojKkTQ_medLD1JW';

// Vercel 上的上传处理
// 由于无文件系统，文档内容直接存 Supabase
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 检查是否是 multipart/form-data
  const contentType = req.headers['content-type'] || '';

  if (!contentType.includes('multipart/form-data')) {
    return res.status(400).json({ error: '需要 multipart/form-data' });
  }

  // Vercel 函数无法直接处理文件上传
  // 客户端需要先解析文件内容，通过 base64 传输
  const { fileName, content, category, username } = req.body;

  if (!fileName || !content) {
    return res.status(400).json({ error: '缺少文件或内容' });
  }

  try {
    // 检查是否已存在
    const checkResp = await fetch(
      `${supabaseUrl}/rest/v1/documents?filename=eq.${encodeURIComponent(fileName)}&select=id`,
      {
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
      }
    );
    const existing = await checkResp.json();

    if (existing.length > 0) {
      // 更新
      const updateResp = await fetch(
        `${supabaseUrl}/rest/v1/documents?filename=eq.${encodeURIComponent(fileName)}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            content,
            category: category || 'process',
            updated_at: new Date().toISOString()
          })
        }
      );

      if (!updateResp.ok) {
        const err = await updateResp.text();
        return res.status(500).json({ error: err });
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
          content,
          category: category || 'process',
          uploader: username || 'unknown',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      });

      if (!insertResp.ok) {
        const err = await insertResp.text();
        return res.status(500).json({ error: err });
      }
    }

    res.json({ success: true, fileName });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};