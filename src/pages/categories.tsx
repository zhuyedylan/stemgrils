import React, { useState, useEffect } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';

function CategoryManager() {
  const [categories, setCategories] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [message, setMessage] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('stem_user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      if (user.role === 'admin') {
        setIsAdmin(true);
        loadCategories();
      } else {
        window.location.href = '/stemgirls/';
      }
    } else {
      window.location.href = '/stemgirls/login';
    }
  }, []);

  const loadCategories = async () => {
    try {
      const response = await fetch('/stemgirls/api/stemgirls/categories');
      const data = await response.json();
      setCategories(data.sort((a, b) => a.order - b.order));
    } catch (error) {
      setMessage('加载目录失败: ' + error.message);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      setMessage('请输入目录名称');
      return;
    }

    try {
      const response = await fetch('/stemgirls/api/stemgirls/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/stemgirls/json' },
        body: JSON.stringify({ name: newCategoryName.trim() })
      });
      const result = await response.json();
      if (result.success) {
        setMessage('✅ 目录添加成功');
        setNewCategoryName('');
        setShowAddForm(false);
        loadCategories();
        await rebuild();
      } else {
        setMessage('添加失败: ' + result.error);
      }
    } catch (error) {
      setMessage('添加失败: ' + error.message);
    }
  };

  const handleDeleteCategory = async (id) => {
    const cat = categories.find(c => c.id === id);
    if (!confirm(`确定要删除目录 "${cat.name}" 吗？`)) return;
    if (!confirm(`再次确认：此操作不可恢复！`)) return;

    try {
      const response = await fetch(`/stemgirls/api/stemgirls/categories/stemgirls/${id}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        setMessage('✅ 目录已删除');
        loadCategories();
        await rebuild();
      } else {
        setMessage('删除失败: ' + result.error);
      }
    } catch (error) {
      setMessage('删除失败: ' + error.message);
    }
  };

  const handleToggleUpload = async (id, currentValue) => {
    try {
      const cat = categories.find(c => c.id === id);
      const response = await fetch(`/stemgirls/api/stemgirls/categories/stemgirls/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/stemgirls/json' },
        body: JSON.stringify({ name: cat.name, allowUserUpload: !currentValue })
      });
      const result = await response.json();
      if (result.success) {
        setMessage(`✅ 已${!currentValue ? '允许' : '禁止'}普通用户上传到该目录`);
        loadCategories();
        await rebuild();
      } else {
        setMessage('更新失败: ' + result.error);
      }
    } catch (error) {
      setMessage('更新失败: ' + error.message);
    }
  };

  const handleUpdateCategory = async (id) => {
    const cat = categories.find(c => c.id === id);
    const newName = prompt('请输入新的目录名称:', cat.name);
    if (!newName || newName === cat.name) return;

    const allowUpload = confirm('是否允许普通用户上传到该目录？');

    try {
      const response = await fetch(`/stemgirls/api/stemgirls/categories/stemgirls/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/stemgirls/json' },
        body: JSON.stringify({ name: newName, allowUserUpload: allowUpload })
      });
      const result = await response.json();
      if (result.success) {
        setMessage('✅ 目录已更新');
        loadCategories();
        await rebuild();
      } else {
        setMessage('更新失败: ' + result.error);
      }
    } catch (error) {
      setMessage('更新失败: ' + error.message);
    }
  };

  const handleMoveUp = async (index) => {
    if (index === 0) return;
    const newOrder = [...categories];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    const orderIds = newOrder.map(c => c.id);

    try {
      await fetch('/stemgirls/api/stemgirls/categories/stemgirls/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/stemgirls/json' },
        body: JSON.stringify({ order: orderIds })
      });
      loadCategories();
      await rebuild();
    } catch (error) {
      setMessage('排序失败: ' + error.message);
    }
  };

  const handleMoveDown = async (index) => {
    if (index === categories.length - 1) return;
    const newOrder = [...categories];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    const orderIds = newOrder.map(c => c.id);

    try {
      await fetch('/stemgirls/api/stemgirls/categories/stemgirls/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/stemgirls/json' },
        body: JSON.stringify({ order: orderIds })
      });
      loadCategories();
      await rebuild();
    } catch (error) {
      setMessage('排序失败: ' + error.message);
    }
  };

  const rebuild = async () => {
    await fetch('/stemgirls/api/stemgirls/rebuild', { method: 'POST' });
  };

  if (!isAdmin) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>正在跳转...</stemgirls/div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>📁 目录管理</stemgirls/h2>
        <button onClick={() => window.location.href = '/stemgirls/'} style={{ padding: '8px 20px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          🏠 返回首页
        </stemgirls/button>
      </stemgirls/div>

      {message && (
        <div style={{ padding: '15px', borderRadius: '8px', backgroundColor: message.includes('✅') ? '#d1fae5' : '#fee2e2', color: message.includes('✅') ? '#065f46' : '#991b1b', marginBottom: '20px' }}>
          {message}
        </stemgirls/div>
      )}

      <div style={{ backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
        <p style={{ margin: '0 0 10px 0', color: '#666' }}>
          💡 管理一级目录，可以添加、删除、重命名目录，调整顺序，设置是否允许普通用户上传文档。
        </stemgirls/p>
      </stemgirls/div>

      <div style={{ marginBottom: '20px' }}>
        <button onClick={() => setShowAddForm(!showAddForm)} style={{ padding: '10px 20px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          {showAddForm ? '取消添加' : '+ 添加目录'}
        </stemgirls/button>
      </stemgirls/div>

      {showAddForm && (
        <div style={{ padding: '20px', backgroundColor: '#f0fdf4', borderRadius: '8px', marginBottom: '20px', border: '2px solid #10b981' }}>
          <h3 style={{ marginTop: 0 }}>添加新目录</stemgirls/h3>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="请输入目录名称"
              style={{ padding: '10px', fontSize: '16px', border: '1px solid #ddd', borderRadius: '5px', flex: 1 }}
            /stemgirls/>
            <button onClick={handleAddCategory} style={{ padding: '10px 30px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
              添加
            </stemgirls/button>
          </stemgirls/div>
        </stemgirls/div>
      )}

      <div style={{ backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', color: '#6b7280' }}>顺序</stemgirls/th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', color: '#6b7280' }}>目录名称</stemgirls/th>
              <th style={{ padding: '12px', textAlign: 'center', fontSize: '14px', color: '#6b7280' }}>允许上传</stemgirls/th>
              <th style={{ padding: '12px', textAlign: 'center', fontSize: '14px', color: '#6b7280' }}>操作</stemgirls/th>
            </stemgirls/tr>
          </stemgirls/thead>
          <tbody>
            {categories.map((cat, index) => (
              <tr key={cat.id} style={{ borderBottom: index < categories.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                <td style={{ padding: '12px' }}>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      style={{ padding: '5px 10px', backgroundColor: index === 0 ? '#e5e7eb' : '#10b981', color: 'white', border: 'none', borderRadius: '3px', cursor: index === 0 ? 'not-allowed' : 'pointer', opacity: index === 0 ? 0.5 : 1 }}
                    >
                      ↑
                    </stemgirls/button>
                    <button
                      onClick={() => handleMoveDown(index)}
                      disabled={index === categories.length - 1}
                      style={{ padding: '5px 10px', backgroundColor: index === categories.length - 1 ? '#e5e7eb' : '#10b981', color: 'white', border: 'none', borderRadius: '3px', cursor: index === categories.length - 1 ? 'not-allowed' : 'pointer', opacity: index === categories.length - 1 ? 0.5 : 1 }}
                    >
                      ↓
                    </stemgirls/button>
                  </stemgirls/div>
                </stemgirls/td>
                <td style={{ padding: '12px', fontWeight: 'bold' }}>{cat.name}</stemgirls/td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <button
                    onClick={() => handleToggleUpload(cat.id, cat.allowUserUpload)}
                    style={{
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: cat.allowUserUpload ? '#10b981' : '#9ca3af',
                      color: 'white',
                      transition: 'all 0.2s'
                    }}
                  >
                    {cat.allowUserUpload ? '✅ 允许' : '❌ 禁止'}
                  </stemgirls/button>
                </stemgirls/td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <button
                    onClick={() => handleUpdateCategory(cat.id)}
                    style={{ padding: '6px 15px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginRight: '5px' }}
                  >
                    ✏️ 编辑
                  </stemgirls/button>
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    style={{ padding: '6px 15px', backgroundColor: '#e53e3e', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                  >
                    🗑️ 删除
                  </stemgirls/button>
                </stemgirls/td>
              </stemgirls/tr>
            ))}
          </stemgirls/tbody>
        </stemgirls/table>
      </stemgirls/div>

      {categories.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
          暂无目录，请添加
        </stemgirls/div>
      )}
    </stemgirls/div>
  );
}

export default function Categories() {
  return <BrowserOnly fallback={<div style={{ textAlign: 'center', padding: '50px' }}>加载中...</stemgirls/div>}>{() => <CategoryManager /stemgirls/>}</stemgirls/BrowserOnly>;
}