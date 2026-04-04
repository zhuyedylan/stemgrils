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

  const method = req.method;

  // GET - 获取待审批文档
  if (method === 'GET') {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/documents?select=*&approved=eq.false&order=created_at.desc`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });
      const docs = await response.json();
      res.json(docs);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
    return;
  }

  // POST - 审批通过
  const { fileName, action } = req.body || {};

  if (!fileName) {
    return res.status(400).json({ error: '缺少文件名' });
  }

  const filename = fileName.replace('.md', '');

  try {
    if (action === 'approve') {
      // 审批通过
      const response = await fetch(`${supabaseUrl}/rest/v1/documents?filename=eq.${encodeURIComponent(filename)}`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          approved: true,
          approval_date: new Date().toISOString()
        })
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(err);
      }
    } else if (action === 'hide') {
      // 隐藏/显示文档
      const response = await fetch(`${supabaseUrl}/rest/v1/documents?filename=eq.${encodeURIComponent(filename)}`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          hidden: true
        })
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(err);
      }
    } else if (action === 'show') {
      // 显示文档
      const response = await fetch(`${supabaseUrl}/rest/v1/documents?filename=eq.${encodeURIComponent(filename)}`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          hidden: false
        })
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(err);
      }
    } else if (action === 'reject') {
      // 拒绝（删除）
      const response = await fetch(`${supabaseUrl}/rest/v1/documents?filename=eq.${encodeURIComponent(filename)}`, {
        method: 'DELETE',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Prefer': 'return=minimal'
        }
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(err);
      }
    }

    // 触发 Vercel 重新部署
    try {
      await fetch(DEPLOY_HOOK, { method: 'POST' });
    } catch (e) {
      console.log('Trigger deploy failed:', e.message);
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};