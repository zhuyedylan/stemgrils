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
    // 获取文档的所有备份版本
    const response = await fetch(
      `${supabaseUrl}/rest/v1/documents_backup?filename=eq.${encodeURIComponent(filename)}&select=*&order=created_at.desc`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      }
    );

    const backups = await response.json();
    res.json(backups.map(b => ({
      id: b.id,
      filename: b.filename,
      content: b.content,
      backup_time: b.created_at,
      operator: b.operator
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};