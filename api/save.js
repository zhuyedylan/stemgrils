const supabaseUrl = 'https://jyhmhksdpjkzkhqlkuqh.supabase.co';
const supabaseKey = 'sb_publishable_a0zC2QDTxicG-HbxojKkTQ_medLD1JW';

const DEPLOY_HOOK = 'https://api.vercel.com/v1/integrations/deploy/prj_pdsffwCNPJcY904M0JMZUtzRjOCg/1PuxGzixwB';

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
    // 检查文档是否存在，获取原上传者
    const checkResp = await fetch(`${supabaseUrl}/rest/v1/documents?filename=eq.${encodeURIComponent(fileName)}&select=id,uploader`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    const existing = await checkResp.json();

    if (existing && existing.length > 0) {
      // 更新现有文档，保留原上传者
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
          category: category || existing[0]?.category || 'process',
          updated_at: new Date().toISOString()
        })
      });

      if (!updateResp.ok) {
        const err = await updateResp.text();
        throw new Error(err);
      }
    } else {
      // 新文档需要审批，默认 approved=false
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
          uploader: uploader || 'admin',
          approved: false,  // 新上传需要审批
          hidden: false
        })
      });

      if (!insertResp.ok) {
        const err = await insertResp.text();
        throw new Error(err);
      }
    }

    // 触发 Vercel 重新部署
    try {
      await fetch(DEPLOY_HOOK, { method: 'POST' });
    } catch (e) {
      console.log('Trigger deploy failed:', e.message);
    }

    res.json({ success: true, needsApproval: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};