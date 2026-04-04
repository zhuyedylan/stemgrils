const supabaseUrl = 'https://jyhmhksdpjkzkhqlkuqh.supabase.co';
const supabaseKey = 'sb_publishable_a0zC2QDTxicG-HbxojKkTQ_medLD1JW';

const DEFAULT_CATEGORIES = [
  { id: 'intro', name: '项目介绍', order: 0, allowUserUpload: true },
  { id: 'process', name: '工艺手册', order: 1, allowUserUpload: true }
];

const SYSTEM_CATEGORIES = [
  { id: 'pending', name: '待审批', order: 99, isSystem: true, icon: '⏳' },
  { id: 'hidden', name: '隐藏', order: 100, isSystem: true, icon: '👁️' }
];

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const method = req.method;

  // GET - 获取分类列表
  if (method === 'GET') {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/categories?select=*&order=order.asc`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });
      let data = await response.json();

      // 合并系统分类
      const allCategories = [...DEFAULT_CATEGORIES, ...SYSTEM_CATEGORIES];

      // 如果有数据库分类，用数据库的
      if (data && data.length > 0) {
        // 添加系统分类
        data = [...data, ...SYSTEM_CATEGORIES];
      } else {
        data = allCategories;
      }

      res.json(data);
    } catch (error) {
      res.json(allCategories);
    }
    return;
  }

  res.status(405).json({ error: '不支持的方法' });
};