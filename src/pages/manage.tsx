import React, { useState, useEffect } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';

declare global {
  interface Window {
    SUPABASE_URL?: string;
    SUPABASE_KEY?: string;
  }
}

const ManagePage = () => {
  const [docs, setDocs] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [editingDoc, setEditingDoc] = useState<any>(null);

  const supabaseUrl = window.SUPABASE_URL || 'https://jyhmhksdpjkzkhqlkuqh.supabase.co';
  const supabaseKey = window.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5aG1oa3NkcGpremtocWxrdXFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMDEwNTYsImV4cCI6MjA5MDg3NzA1Nn0.e5iYCkY-UNumjWWnsPugc5nIUKOkITccuhODLPBCiwc';

  useEffect(() => {
    const storedUser = localStorage.getItem('stem_user');
    if (!storedUser) {
      window.location.href = '/login';
      return;
    }
    const userData = JSON.parse(storedUser);
    if (userData.role !== 'admin') {
      window.location.href = '/';
      return;
    }
    setUser(userData);
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // 加载所有已批准的文档
      const docsRes = await fetch(
        `${supabaseUrl}/rest/v1/documents?approved=eq.true&hidden=eq.false&select=*&order=category,order.asc,filename.asc`,
        {
          headers: { 'apikey': supabaseKey, 'Authorization': 'Bearer ' + supabaseKey }
        }
      );
      const docsData = await docsRes.json();
      setDocs(docsData);

      // 加载分类 - 直接调用 Supabase
      const catRes = await fetch(
        `${supabaseUrl}/rest/v1/categories?order=order.asc`,
        {
          headers: { 'apikey': supabaseKey, 'Authorization': 'Bearer ' + supabaseKey }
        }
      );
      const catData = await catRes.json();
      setCategories(catData.sort((a: any, b: any) => a.order - b.order));
    } catch (error: any) {
      setMessage('加载失败: ' + error.message);
    }
    setLoading(false);
  };

  // 按分类分组文档
  const getDocsByCategory = () => {
    const grouped: Record<string, any[]> = {};
    categories.forEach(cat => {
      grouped[cat.id] = docs.filter(d => d.category === cat.id).sort((a, b) => (a.order || 0) - (b.order || 0));
    });
    return grouped;
  };

  // 拖拽开始
  const handleDragStart = (e: React.DragEvent, doc: any) => {
    setDraggedItem(doc);
    e.dataTransfer.effectAllowed = 'move';
  };

  // 拖拽到目标位置
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // 拖拽放下 - 调整排序
  const handleDrop = async (e: React.DragEvent, targetDoc: any) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.filename === targetDoc.filename) return;

    // 同分类内排序调整
    if (draggedItem.category === targetDoc.category) {
      const categoryDocs = docs.filter(d => d.category === draggedItem.category).sort((a, b) => (a.order || 0) - (b.order || 0));
      const draggedIndex = categoryDocs.findIndex(d => d.filename === draggedItem.filename);
      const targetIndex = categoryDocs.findIndex(d => d.filename === targetDoc.filename);

      // 重新计算排序
      const newOrder = categoryDocs.map((d, i) => {
        if (i === draggedIndex) return { ...d, order: targetIndex };
        if (i === targetIndex) return { ...d, order: draggedIndex };
        return d;
      }).sort((a, b) => a.order - b.order);

      // 更新排序
      for (let i = 0; i < newOrder.length; i++) {
        await fetch(`${supabaseUrl}/rest/v1/documents?filename=eq.${encodeURIComponent(newOrder[i].filename)}`, {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': 'Bearer ' + supabaseKey,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ order: i })
        });
      }

      setMessage('✅ 排序已更新');
      loadData();
    }

    setDraggedItem(null);
  };

  // 移动到其他分类
  const handleCategoryChange = async (filename: string, newCategory: string) => {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/documents?filename=eq.${encodeURIComponent(filename)}`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': 'Bearer ' + supabaseKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ category: newCategory })
      });

      if (res.ok) {
        setMessage('✅ 分类已更改');
        loadData();
      } else {
        setMessage('分类更改失败');
      }
    } catch (error: any) {
      setMessage('操作失败: ' + error.message);
    }
    setEditingDoc(null);
  };

  // 上移
  const handleMoveUp = async (doc: any) => {
    const categoryDocs = docs.filter(d => d.category === doc.category).sort((a, b) => (a.order || 0) - (b.order || 0));
    const currentIndex = categoryDocs.findIndex(d => d.filename === doc.filename);
    if (currentIndex <= 0) return;

    // 交换排序
    const prevDoc = categoryDocs[currentIndex - 1];
    await fetch(`${supabaseUrl}/rest/v1/documents?filename=eq.${encodeURIComponent(doc.filename)}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': 'Bearer ' + supabaseKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ order: currentIndex - 1 })
    });

    await fetch(`${supabaseUrl}/rest/v1/documents?filename=eq.${encodeURIComponent(prevDoc.filename)}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': 'Bearer ' + supabaseKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ order: currentIndex })
    });

    setMessage('✅ 排序已更新');
    loadData();
  };

  // 下移
  const handleMoveDown = async (doc: any) => {
    const categoryDocs = docs.filter(d => d.category === doc.category).sort((a, b) => (a.order || 0) - (b.order || 0));
    const currentIndex = categoryDocs.findIndex(d => d.filename === doc.filename);
    if (currentIndex >= categoryDocs.length - 1) return;

    // 交换排序
    const nextDoc = categoryDocs[currentIndex + 1];
    await fetch(`${supabaseUrl}/rest/v1/documents?filename=eq.${encodeURIComponent(doc.filename)}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': 'Bearer ' + supabaseKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ order: currentIndex + 1 })
    });

    await fetch(`${supabaseUrl}/rest/v1/documents?filename=eq.${encodeURIComponent(nextDoc.filename)}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': 'Bearer ' + supabaseKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ order: currentIndex })
    });

    setMessage('✅ 排序已更新');
    loadData();
  };

  if (!user || loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>加载中...</div>;
  }

  const groupedDocs = getDocsByCategory();

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>📚 文档排序与分类管理</h1>
        <button onClick={() => window.location.href = '/'} style={{ padding: '8px 20px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          🏠 返回首页
        </button>
      </div>

      <p style={{ color: '#666', marginBottom: '20px' }}>
        拖拽文档可调整顺序，点击分类下拉框可移动到其他分类。
      </p>

      {message && (
        <div style={{ padding: '10px', marginBottom: '20px', backgroundColor: message.includes('✅') ? '#d1fae5' : '#fee2e2', color: message.includes('✅') ? '#065f46' : '#991b1b', borderRadius: '8px' }}>
          {message}
        </div>
      )}

      {categories.map(category => {
        const categoryDocs = groupedDocs[category.id] || [];
        if (categoryDocs.length === 0) return null;

        return (
          <div key={category.id} style={{ marginBottom: '30px' }}>
            <h2 style={{ marginBottom: '15px', borderBottom: '2px solid #10b981', paddingBottom: '8px' }}>
              {category.name} ({categoryDocs.length} 个文档)
            </h2>

            <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              {categoryDocs.map((doc, index) => (
                <div
                  key={doc.filename}
                  draggable
                  onDragStart={(e) => handleDragStart(e, doc)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, doc)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderBottom: index < categoryDocs.length - 1 ? '1px solid #f3f4f6' : 'none',
                    backgroundColor: draggedItem?.filename === doc.filename ? '#eff6ff' : 'white',
                    cursor: 'grab'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ color: '#9ca3af', fontSize: '14px', width: '30px' }}>{index + 1}</span>
                    <span style={{ fontWeight: 500 }}>{doc.filename}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* 上移/下移按钮 */}
                    <button
                      onClick={() => handleMoveUp(doc)}
                      disabled={index === 0}
                      style={{
                        padding: '4px 8px',
                        fontSize: '12px',
                        backgroundColor: index === 0 ? '#e5e7eb' : '#10b981',
                        color: index === 0 ? '#9ca3af' : 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: index === 0 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => handleMoveDown(doc)}
                      disabled={index === categoryDocs.length - 1}
                      style={{
                        padding: '4px 8px',
                        fontSize: '12px',
                        backgroundColor: index === categoryDocs.length - 1 ? '#e5e7eb' : '#10b981',
                        color: index === categoryDocs.length - 1 ? '#9ca3af' : 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: index === categoryDocs.length - 1 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      ↓
                    </button>

                    {/* 分类选择 */}
                    <select
                      value={doc.category}
                      onChange={(e) => handleCategoryChange(doc.filename, e.target.value)}
                      style={{
                        padding: '4px 8px',
                        fontSize: '14px',
                        borderRadius: '4px',
                        border: '1px solid #ddd'
                      }}
                    >
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>

                    {/* 编辑链接 */}
                    <a
                      href={`/editor?file=${encodeURIComponent(doc.filename)}`}
                      style={{
                        padding: '4px 8px',
                        fontSize: '12px',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        borderRadius: '4px',
                        textDecoration: 'none'
                      }}
                    >
                      编辑
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* 空分类提示 */}
      {docs.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
          <p>暂无已批准的文档</p>
        </div>
      )}
    </div>
  );
};

export default function Manage() {
  return (
    <BrowserOnly fallback={<div>加载中...</div>}>
      {() => <ManagePage />}
    </BrowserOnly>
  );
}