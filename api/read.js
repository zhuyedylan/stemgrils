const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jyhmhksdpjkzkhqlkuqh.supabase.co';
const supabaseKey = 'sb_publishable_a0zC2QDTxicG-HbxojKkTQ_medLD1JW';

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { filePath } = req.query;
  if (!filePath) {
    return res.status(400).json({ error: '缺少文件路径' });
  }

  const fileName = filePath.replace('.md', '');

  try {
    const { data, error } = await supabase
      .from('documents')
      .select('content')
      .eq('filename', fileName)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: '文件不存在: ' + filePath });
    }

    res.json({ content: data.content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};