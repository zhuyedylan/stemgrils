const supabaseUrl = 'https://jyhmhksdpjkzkhqlkuqh.supabase.co';
const supabaseKey = 'sb_publishable_a0zC2QDTxicG-HbxojKkTQ_medLD1JW';

module.exports = async (req, res) => {
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

  const oldFilename = oldName.replace('.md', '');
  const newFilename = newName.replace('.md', '');

  try {
    // 检查新文件名是否已存在
    const checkNew = await fetch(`${supabaseUrl}/rest/v1/documents?filename=eq.${encodeURIComponent(newFilename)}&select=id`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    const newExists = await checkNew.json();

    if (newExists && newExists.length > 0) {
      return res.status(400).json({ error: '新文件名已存在' });
    }

    // 获取旧文档
    const checkOld = await fetch(`${supabaseUrl}/rest/v1/documents?filename=eq.${encodeURIComponent(oldFilename)}&select=content,category,uploader`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    const oldDoc = await checkOld.json();

    if (!oldDoc || oldDoc.length === 0) {
      return res.status(404).json({ error: '原文件不存在' });
    }

    // 删除旧文档
    const deleteResp = await fetch(`${supabaseUrl}/rest/v1/documents?filename=eq.${encodeURIComponent(oldFilename)}`, {
      method: 'DELETE',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=minimal'
      }
    });

    if (!deleteResp.ok) {
      const err = await deleteResp.text();
      throw new Error(err);
    }

    // 创建新文档
    const insertResp = await fetch(`${supabaseUrl}/rest/v1/documents`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        filename: newFilename,
        content: oldDoc[0].content,
        category: oldDoc[0].category,
        uploader: oldDoc[0].uploader
      })
    });

    if (!insertResp.ok) {
      const err = await insertResp.text();
      throw new Error(err);
    }

    res.json({ success: true, newName });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};