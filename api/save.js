const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jyhmhksdpjkzkhqlkuqh.supabase.co';
const supabaseKey = 'sb_publishable_a0zC2QDTxicG-HbxojKkTQ_medLD1JW';

const supabase = createClient(supabaseUrl, supabaseKey);

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
    const { data: existing } = await supabase
      .from('documents')
      .select('id')
      .eq('filename', fileName)
      .single();

    if (existing) {
      // 更新现有文档
      const { error } = await supabase
        .from('documents')
        .update({
          content: content,
          updated_at: new Date().toISOString()
        })
        .eq('filename', fileName);

      if (error) throw error;
    } else {
      // 插入新文档
      const { error } = await supabase
        .from('documents')
        .insert({
          filename: fileName,
          content: content,
          category: category || 'process',
          uploader: uploader || 'admin'
        });

      if (error) throw error;
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};