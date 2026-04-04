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
    // 检查用户是否是管理员
    const userRole = req.headers['x-user-role'];
    const isAdmin = userRole === 'admin';

    // 如果是管理员，返回所有文档；否则只返回已公开的
    let filter = '';
    if (!isAdmin) {
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