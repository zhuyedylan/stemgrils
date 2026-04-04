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
  const [myDocs, setMyDocs] = useState([]);
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
    loadMyDocs();

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
    script.onload = () => setMammothReady(true);
    document.head.appendChild(script);
  }, []);

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      const data = await response.json();
      const allowedCategories = user?.role === 'admin' ? data : data.filter(c => c.allowUserUpload);
      setCategories(allowedCategories.sort((a, b) => a.order - b.order));
      if (allowedCategories.length > 0) {
        setSelectedCategory(allowedCategories[0].id);
      }
    } catch (error) {
      console.error('加载目录失败:', error);
    }
  };

  const loadMyDocs = async () => {
    // 获取用户上传的文档（包括待审批的）
    const supabaseUrl = 'https://jyhmhksdpjkzkhqlkuqh.supabase.co';
    const supabaseKey = 'sb_publishable_a0zC2QDTxicG-HbxojKkTQ_medLD1JW';
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/documents?uploader=eq.${user?.username}&order=created_at.desc`, {
        headers: { 'apikey': supabaseKey, 'Authorization': 'Bearer ' + supabaseKey }
      });
      const docs = await response.json();
      setMyDocs(docs);
    } catch (error) {
      console.error('加载我的文档失败:', error);
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
        if (saveResult.needsApproval) {
          setMessage(`✅ ${title} 上传成功！需要管理员审批后才能公开显示`);
        } else {
          setMessage(`✅ ${title} 上传成功！`);
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
        loadMyDocs();
      } else {
        setMessage('上传失败: ' + saveResult.error);
      }
    } catch (error) {
      setMessage('转换失败: ' + error.message);
    }

    setUploading(false);
  };

  const getStatusBadge = (doc) => {
    if (!doc.approved && !doc.hidden) {
      return <span style={{ padding: '2px 8px', backgroundColor: '#f59e0b', color: 'white', borderRadius: '4px', fontSize: '12px' }}>待审批</span>;
    }
    if (doc.approved && doc.hidden) {
      return <span style={{ padding: '2px 8px', backgroundColor: '#6b7280', color: 'white', borderRadius: '4px', fontSize: '12px' }}>已隐藏</span>;
    }
    if (doc.approved && !doc.hidden) {
      return <span style={{ padding: '2px 8px', backgroundColor: '#10b981', color: 'white', borderRadius: '4px', fontSize: '12px' }}>已公开</span>;
    }
    return null;
  };

  if (!isLoggedIn) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>正在跳转...</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>📤 上传文档</h2>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        上传 Word 文档，系统将自动转换为网页格式。新文档需要管理员审批后才能公开显示。
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
      </div>

      {/* 上传区域 */}
      <div style={{ border: '2px dashed #10b981', borderRadius: '12px', padding: '40px', textAlign: 'center', backgroundColor: '#f0fdf4', marginBottom: '20px' }}>
        <input ref={fileInputRef} type="file" accept=".doc,.docx" onChange={handleUpload} disabled={uploading || !mammothReady} id="file-upload" style={{ display: 'none' }} />
        <label htmlFor="file-upload" style={{ cursor: mammothReady ? 'pointer' : 'not-allowed', opacity: mammothReady ? 1 : 0.5 }}>
          <div style={{ fontSize: '48px', marginBottom: '10px' }}>📄</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#10b981' }}>
            {uploading ? '转换中...' : (!mammothReady ? '加载中...' : '点击选择 Word 文档')}
          </div>
          <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>支持 .doc 和 .docx 格式</div>
        </label>
      </div>

      {message && (
        <div style={{ padding: '15px', borderRadius: '8px', backgroundColor: message.includes('✅') ? '#d1fae5' : '#fee2e2', color: message.includes('✅') ? '#065f46' : '#991b1b', marginBottom: '20px' }}>
          {message}
        </div>
      )}

      {/* 我的文档列表 */}
      <div style={{ marginTop: '30px' }}>
        <h3>📋 我的文档 ({myDocs.length})</h3>
        {myDocs.length === 0 ? (
          <p style={{ color: '#666' }}>您还没有上传过文档</p>
        ) : (
          <div style={{ display: 'grid', gap: '10px' }}>
            {myDocs.map((doc, idx) => (
              <div key={idx} style={{ padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontWeight: 'bold' }}>{doc.filename}</span>
                  {getStatusBadge(doc)}
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '5px' }}>
                    上传时间: {new Date(doc.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button onClick={() => window.location.href = '/'} style={{ marginTop: '20px', padding: '12px 30px', fontSize: '16px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
        🏠 返回首页
      </button>
    </div>
  );
}

export default function Upload() {
  return <BrowserOnly fallback={<div style={{ textAlign: 'center', padding: '50px' }}>加载中...</div>}>{() => <UploadPage />}</BrowserOnly>;
}