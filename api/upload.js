const supabaseUrl = 'https://jyhmhksdpjkzkhqlkuqh.supabase.co';
const supabaseKey = 'sb_publishable_a0zC2QDTxicG-HbxojKkTQ_medLD1JW';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 检查是否是 multipart/form-data
  const contentType = req.headers['content-type'] || '';

  if (!contentType.includes('multipart/form-data')) {
    return res.status(400).json({ error: '需要 multipart/form-data' });
  }

  // 手动解析 multipart 数据（简化版）
  // 由于 Vercel 无文件系统，我们需要使用其他方式
  // 这里返回一个提示，说明需要客户端处理

  res.status(501).json({ error: '上传功能开发中，请直接在编辑器中创建文档' });
};