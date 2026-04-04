import React, { useState, useEffect, useRef } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';

function UploadPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('stem_user');
    if (!savedUser) {
      window.location.href = '/login';
      return;
    }
    const userData = JSON.parse(savedUser);
    setUser(userData);
    setIsLoggedIn(true);
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      const data = await response.json();
      // 过滤出允许用户上传的目录
      const allowedCategories = user?.role === 'admin' ? data : data.filter(c => c.allowUserUpload);
      setCategories(allowedCategories.sort((a, b) => a.order - b.order));
      if (allowedCategories.length > 0) {
        setSelectedCategory(allowedCategories[0].id);
      }
    } catch (error) {
      console.error('加载目录失败:', error);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.docx?$/i)) {
      setMessage('请上传 Word 文档 (.doc 或 .docx)');
      return;
    }

    setUploading(true);
    setMessage('上传中...');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('username', user.username);
    formData.append('category', selectedCategory);

    try {
      const response = await fetch('/api/upload', { method: 'POST', body: formData });
      const result = await response.json();
      if (result.success) {
        setMessage(`✅ ${result.title} 上传成功！`);
        setUploadedFiles(prev => [...prev, { ...result, uploader: user.username, category: selectedCategory }]);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        setMessage('上传失败: ' + result.error);
      }
    } catch (error) {
      setMessage('上传失败: ' + error.message);
    }
    setUploading(false);
  };

  const handleDelete = async (file) => {
    if (!confirm(`确定要删除 "${file.title}" 吗？`)) {
      return;
    }

    try {
      const response = await fetch('/api/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.fileName,
          username: user.username,
          role: user.role
        })
      });
      const result = await response.json();
      if (result.success) {
        setMessage(`✅ ${file.title} 已删除`);
        setUploadedFiles(prev => prev.filter(f => f.fileName !== file.fileName));
      } else {
        setMessage('删除失败: ' + result.error);
      }
    } catch (error) {
      setMessage('删除失败: ' + error.message);
    }
  };

  const handleRebuild = async () => {
    setMessage('🔄 正在重新构建网站...');
    try {
      await fetch('/api/rebuild', { method: 'POST' });
      setMessage('✅ 构建完成！页面将刷新...');
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      setMessage('构建失败: ' + error.message);
    }
  };

  if (!isLoggedIn) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>正在跳转...</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>📤 上传工艺手册</h2>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        上传 Word 文档后，系统将自动转换为网页格式。标题层级将与 Word 中的标题样式对应。
      </p>

      {/* 目录选择 */}
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <label style={{ fontWeight: 'bold', marginRight: '10px' }}>选择上传目录：</label>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{ padding: '8px 15px', fontSize: '16px', borderRadius: '5px', border: '1px solid #ddd', minWidth: '200px' }}
        >
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
        {categories.length === 0 && (
          <span style={{ color: '#e53e3e', marginLeft: '10px' }}>暂无允许上传的目录</span>
        )}
      </div>

      <div style={{ border: '2px dashed #10b981', borderRadius: '12px', padding: '40px', textAlign: 'center', backgroundColor: '#f0fdf4', marginBottom: '20px', opacity: categories.length === 0 ? 0.5 : 1 }}>
        <input ref={fileInputRef} type="file" accept=".doc,.docx" onChange={handleUpload} disabled={uploading || categories.length === 0} id="file-upload" style={{ display: 'none' }} />
        <label htmlFor="file-upload" style={{ cursor: 'pointer' }}>
          <div style={{ fontSize: '48px', marginBottom: '10px' }}>📄</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#10b981' }}>
            {uploading ? '上传中...' : '点击选择 Word 文档'}
          </div>
          <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>支持 .doc 和 .docx 格式</div>
        </label>
      </div>

      {message && (
        <div style={{ padding: '15px', borderRadius: '8px', backgroundColor: message.includes('✅') ? '#d1fae5' : '#fee2e2', color: message.includes('✅') ? '#065f46' : '#991b1b', marginBottom: '20px' }}>
          {message}
        </div>
      )}

      {uploadedFiles.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h3>📋 已上传文件</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {uploadedFiles.map((file, index) => (
              <li key={index} style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '5px', marginBottom: '5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>✅ {file.title}</span>
                {(file.uploader === user.username || user.role === 'admin') && (
                  <button
                    onClick={() => handleDelete(file)}
                    style={{
                      padding: '5px 15px',
                      backgroundColor: '#e53e3e',
                      color: 'white',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    删除
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button onClick={handleRebuild} style={{ padding: '12px 30px', fontSize: '16px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', marginRight: '10px' }}>
        🔄 发布到网站
      </button>

      <button onClick={() => window.location.href = '/'} style={{ padding: '12px 30px', fontSize: '16px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
        🏠 返回首页
      </button>

      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#fff3cd', borderRadius: '8px', fontSize: '14px', color: '#856404' }}>
        💡 提示：上传多个文件后，点击"发布到网站"统一构建和发布。只有上传者本人和管理员可以删除文件。
      </div>
    </div>
  );
}

export default function Upload() {
  return <BrowserOnly fallback={<div style={{ textAlign: 'center', padding: '50px' }}>加载中...</div>}>{() => <UploadPage />}</BrowserOnly>;
}