const supabaseUrl = 'https://jyhmhksdpjkzkhqlkuqh.supabase.co';
const supabaseKey = 'sb_publishable_a0zC2QDTxicG-HbxojKkTQ_medLD1JW';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 检查 URL 参数，如果是编辑器页面，返回所有文档
    const referer = req.headers.referer || '';
    const isEditor = referer.includes('/editor') || referer.includes('/upload') || referer.includes('/admin') || referer.includes('/categories');

    // 编辑器和后台返回所有文档，前台只返回已公开的
    let filter = '';
    if (!isEditor) {
      filter = '&approved=eq.true&hidden=eq.false';
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/documents?select=*${filter}&order=created_at.desc`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    const files = await response.json();

    res.json(files.map(f => ({
      path: f.filename,
      label: f.filename,
      uploader: f.uploader,
      category: f.category,
      approved: f.approved,
      hidden: f.hidden,
      rejection_reason: f.rejection_reason
    })));
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: error.message });
  }
};