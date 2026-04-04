import React, { useState, useEffect, useRef } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';

function UploadPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState('');
  const [docs, setDocs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('process');
  const [newDocTitle, setNewDocTitle] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('stem_user');
    if (!savedUser) {
      window.location.href = '/login';
      return;
    }
    const userData = JSON.parse(savedUser);
    setUser(userData);
    setIsLoggedIn(true);
    loadDocs();
    loadCategories();
  }, []);

  const loadDocs = async () => {
    try {
      const response = await fetch('/api/files?t=' + Date.now());
      const data = await response.json();
      setDocs(data);
    } catch (error) {
      console.error('加载文档失败:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      const data = await response.json();
      setCategories(data.sort((a, b) => a.order - b.order));
    } catch (error) {
      console.error('加载目录失败:', error);
    }
  };

  const handleCreateDoc = async () => {
    if (!newDocTitle.trim()) {
      setMessage('请输入文档标题');
      return;
    }

    const fileName = newDocTitle.trim().replace(/\s+/g, '-');

    setCreating(true);
    setMessage('创建中...');

    try {
      // 创建新文档（空内容）
      const response = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: fileName + '.md',
          content: '# ' + newDocTitle.trim() + '\n\n在这里开始编写您的工艺手册内容...\n',
          category: selectedCategory,
          uploader: user.username
        })
      });

      const result = await response.json();

      if (result.success) {
        setMessage('✅ 文档创建成功！正在跳转到编辑器...');
        setNewDocTitle('');
        // 跳转到编辑器
        setTimeout(() => {
          window.location.href = '/editor?file=' + fileName;
        }, 1500);
      } else {
        setMessage('创建失败: ' + result.error);
      }
    } catch (error) {
      setMessage('创建失败: ' + error.message);
    }

    setCreating(false);
  };

  const handleDelete = async (doc) => {
    if (!confirm(`确定要删除 "${doc.label}" 吗？`)) {
      return;
    }

    try {
      const response = await fetch('/api/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: doc.path })
      });
      const result = await response.json();
      if (result.success) {
        setMessage(`✅ ${doc.label} 已删除`);
        loadDocs();
      } else {
        setMessage('删除失败: ' + result.error);
      }
    } catch (error) {
      setMessage('删除失败: ' + error.message);
    }
  };

  const handleEdit = (doc) => {
    window.location.href = '/editor?file=' + doc.path.replace('.md', '');
  };

  if (!isLoggedIn) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>正在跳转...</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>📝 文档管理</h2>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        在此页面创建新文档或管理现有文档。
      </p>

      {/* 创建新文档 */}
      <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#f0f9ff', borderRadius: '12px', border: '1px solid #0ea5e9' }}>
        <h3 style={{ marginTop: 0 }}>➕ 创建新文档</h3>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontWeight: 'bold', marginRight: '10px' }}>文档标题：</label>
          <input
            type="text"
            value={newDocTitle}
            onChange={(e) => setNewDocTitle(e.target.value)}
            placeholder="输入文档标题，例如：PLA材料工艺手册"
            style={{ padding: '10px', fontSize: '16px', borderRadius: '5px', border: '1px solid #ddd', width: '60%' }}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateDoc()}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontWeight: 'bold', marginRight: '10px' }}>选择目录：</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{ padding: '10px', fontSize: '16px', borderRadius: '5px', border: '1px solid #ddd' }}
          >
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        <button
          onClick={handleCreateDoc}
          disabled={creating}
          style={{
            padding: '12px 30px',
            fontSize: '16px',
            backgroundColor: creating ? '#9ca3af' : '#0ea5e9',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: creating ? 'not-allowed' : 'pointer',
            fontWeight: 'bold'
          }}
        >
          {creating ? '创建中...' : '✨ 创建文档'}
        </button>
      </div>

      {message && (
        <div style={{ padding: '15px', borderRadius: '8px', backgroundColor: message.includes('✅') ? '#d1fae5' : '#fee2e2', color: message.includes('✅') ? '#065f46' : '#991b1b', marginBottom: '20px' }}>
          {message}
        </div>
      )}

      {/* 文档列表 */}
      <div style={{ marginBottom: '20px' }}>
        <h3>📋 现有文档 ({docs.length})</h3>
        {docs.length === 0 ? (
          <p style={{ color: '#666' }}>暂无文档，请创建新文档</p>
        ) : (
          <div style={{ display: 'grid', gap: '10px' }}>
            {docs.map((doc, index) => (
              <div key={index} style={{ padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontWeight: 'bold', fontSize: '16px' }}>📄 {doc.label}</span>
                  {doc.category && (
                    <span style={{ marginLeft: '10px', padding: '2px 8px', backgroundColor: '#e5e7eb', borderRadius: '4px', fontSize: '12px', color: '#6b7280' }}>
                      {doc.category}
                    </span>
                  )}
                </div>
                <div>
                  <button
                    onClick={() => handleEdit(doc)}
                    style={{
                      padding: '8px 20px',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      marginRight: '10px'
                    }}
                  >
                    编辑
                  </button>
                  {(user.role === 'admin' || user.username === doc.uploader) && (
                    <button
                      onClick={() => handleDelete(doc)}
                      style={{
                        padding: '8px 20px',
                        backgroundColor: '#e53e3e',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer'
                      }}
                    >
                      删除
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button onClick={() => window.location.href = '/'} style={{ padding: '12px 30px', fontSize: '16px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
        🏠 返回首页
      </button>

      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#fff3cd', borderRadius: '8px', fontSize: '14px', color: '#856404' }}>
        💡 提示：点击"编辑"后可使用富文本编辑器修改文档内容。修改后别忘了同步到静态网站（需要重新构建部署）。
      </div>
    </div>
  );
}

export default function Upload() {
  return <BrowserOnly fallback={<div style={{ textAlign: 'center', padding: '50px' }}>加载中...</div>}>{() => <UploadPage />}</BrowserOnly>;
}