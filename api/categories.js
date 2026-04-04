const supabaseUrl = 'https://jyhmhksdpjkzkhqlkuqh.supabase.co';
const supabaseKey = 'sb_publishable_a0zC2QDTxicG-HbxojKkTQ_medLD1JW';

// 默认分类
const DEFAULT_CATEGORIES = [
  { id: 'intro', name: '项目介绍', order: 0, allowUserUpload: true },
  { id: 'process', name: '工艺手册', order: 1, allowUserUpload: true }
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

      // 如果没有数据，返回默认分类
      if (!data || data.length === 0) {
        data = DEFAULT_CATEGORIES;
      }

      res.json(data);
    } catch (error) {
      res.json(DEFAULT_CATEGORIES);
    }
    return;
  }

  // POST - 添加分类
  if (method === 'POST') {
    const { name } = req.body || {};
    if (!name) {
      return res.status(400).json({ error: '缺少分类名称' });
    }

    try {
      // 获取当前最大 order
      const response = await fetch(`${supabaseUrl}/rest/v1/categories?select=order&order=order.desc&limit=1`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });
      const data = await response.json();
      const maxOrder = data.length > 0 ? data[0].order : 0;

      const id = name.toLowerCase().replace(/\s+/g, '-');

      const insertResp = await fetch(`${supabaseUrl}/rest/v1/categories`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          id,
          name,
          order: maxOrder + 1,
          allowUserUpload: true
        })
      });

      if (!insertResp.ok) {
        const err = await insertResp.text();
        return res.status(500).json({ error: err });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
    return;
  }

  // PUT - 更新分类
  if (method === 'PUT') {
    const { id, name, allowUserUpload } = req.body || {};
    if (!id) {
      return res.status(400).json({ error: '缺少分类ID' });
    }

    try {
      const updateData = {};
      if (name) updateData.name = name;
      if (allowUserUpload !== undefined) updateData.allowUserUpload = allowUserUpload;

      const response = await fetch(`${supabaseUrl}/rest/v1/categories?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const err = await response.text();
        return res.status(500).json({ error: err });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
    return;
  }

  // DELETE - 删除分类
  if (method === 'DELETE') {
    const id = req.query.id || req.body?.id;
    if (!id) {
      return res.status(400).json({ error: '缺少分类ID' });
    }

    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/categories?id=eq.${id}`, {
        method: 'DELETE',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Prefer': 'return=minimal'
        }
      });

      if (!response.ok) {
        const err = await response.text();
        return res.status(500).json({ error: err });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
    return;
  }

  res.status(405).json({ error: '不支持的方法' });
};