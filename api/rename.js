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

  const { oldName, newName } = req.body || {};
  if (!oldName || !newName) {
    return res.status(400).json({ error: '缺少参数' });
  }

  const oldFilename = oldName.replace('.md', '');
  const newFilename = newName.replace('.md', '');

  try {
    // 检查新文件名是否已存在
    const { data: existing } = await supabase
      .from('documents')
      .select('id')
      .eq('filename', newFilename)
      .single();

    if (existing) {
      return res.status(400).json({ error: '新文件名已存在' });
    }

    // 获取旧文档内容
    const { data: doc } = await supabase
      .from('documents')
      .select('content, category, uploader')
      .eq('filename', oldFilename)
      .single();

    if (!doc) {
      return res.status(404).json({ error: '原文件不存在' });
    }

    // 删除旧文档
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('filename', oldFilename);

    if (deleteError) throw deleteError;

    // 创建新文档
    const { error: insertError } = await supabase
      .from('documents')
      .insert({
        filename: newFilename,
        content: doc.content,
        category: doc.category,
        uploader: doc.uploader
      });

    if (insertError) throw insertError;

    res.json({ success: true, newName });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};