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

  const { fileName } = req.body || {};
  if (!fileName) {
    return res.status(400).json({ error: '缺少文件名' });
  }

  const filename = fileName.replace('.md', '');

  try {
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