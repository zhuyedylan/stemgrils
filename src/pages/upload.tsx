import React, { useState, useEffect, useRef } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';

function UploadPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [mammothReady, setMammothReady] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('process');
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

    // 加载分类
    loadCategories();

    // 动态加载 mammoth
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
    script.onload = () => setMammothReady(true);
    document.head.appendChild(script);
  }, []);

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      const data = await response.json();
      // 根据用户角色过滤分类
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

    if (!mammothReady) {
      setMessage('正在加载转换工具，请稍后重试');
      return;
    }

    setUploading(true);
    setMessage('转换中...');

    try {
      const arrayBuffer = await file.arrayBuffer();
      // @ts-ignore
      const result = await window.mammoth.convertToMarkdown({ arrayBuffer });
      const markdownContent = result.value;

      const fileName = file.name.replace(/\.docx?$/i, '');
      const title = fileName;

      const fullContent = `---
id: ${title}
title: ${title}
---

${markdownContent}`;

      const response = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: title + '.md',
          content: fullContent,
          category: selectedCategory,
          uploader: user.username
        })
      });

      const saveResult = await response.json();

      if (saveResult.success) {
        setMessage(`✅ ${title} 上传成功！正在部署，请稍后刷新查看`);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        setMessage('上传失败: ' + saveResult.error);
      }
    } catch (error) {
      setMessage('转换失败: ' + error.message);
    }

    setUploading(false);
  };

  if (!isLoggedIn) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>正在跳转...</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>📤 上传文档</h2>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        上传 Word 文档，系统将自动转换为网页格式。
      </p>

      {/* 分类选择 */}
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <label style={{ fontWeight: 'bold', marginRight: '10px' }}>选择分类：</label>
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
          <span style={{ color: '#e53e3e', marginLeft: '10px' }}>暂无允许上传的分类</span>
        )}
      </div>

      <div style={{ border: '2px dashed #10b981', borderRadius: '12px', padding: '60px', textAlign: 'center', backgroundColor: '#f0fdf4', opacity: categories.length === 0 ? 0.5 : 1 }}>
        <input ref={fileInputRef} type="file" accept=".doc,.docx" onChange={handleUpload} disabled={uploading || !mammothReady || categories.length === 0} id="file-upload" style={{ display: 'none' }} />
        <label htmlFor="file-upload" style={{ cursor: (mammothReady && categories.length > 0) ? 'pointer' : 'not-allowed' }}>
          <div style={{ fontSize: '48px', marginBottom: '10px' }}>📄</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#10b981' }}>
            {uploading ? '转换中...' : (!mammothReady ? '加载中...' : '点击选择 Word 文档')}
          </div>
          <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>支持 .doc 和 .docx 格式</div>
        </label>
      </div>

      {message && (
        <div style={{ padding: '15px', borderRadius: '8px', backgroundColor: message.includes('✅') ? '#d1fae5' : '#fee2e2', color: message.includes('✅') ? '#065f46' : '#991b1b', marginTop: '20px' }}>
          {message}
        </div>
      )}

      <button onClick={() => window.location.href = '/'} style={{ marginTop: '20px', padding: '12px 30px', fontSize: '16px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
        🏠 返回首页
      </button>
    </div>
  );
}

export default function Upload() {
  return <BrowserOnly fallback={<div style={{ textAlign: 'center', padding: '50px' }}>加载中...</div>}>{() => <UploadPage />}</BrowserOnly>;
}