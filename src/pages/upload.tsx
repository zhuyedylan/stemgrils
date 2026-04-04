import React, { useState, useEffect, useRef } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';

function UploadPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [mammothReady, setMammothReady] = useState(false);
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

    // 动态加载 mammoth
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
    script.onload = () => setMammothReady(true);
    document.head.appendChild(script);
  }, []);

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
      // 读取文件为 ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();

      // 使用 mammoth 转换为 Markdown
      // @ts-ignore
      const result = await window.mammoth.convertToMarkdown({ arrayBuffer });
      const markdownContent = result.value;

      // 使用文件名作为标题
      const fileName = file.name.replace(/\.docx?$/i, '');
      const title = fileName;

      // 构建文档内容（带 frontmatter）
      const fullContent = `---
id: ${title}
title: ${title}
---

${markdownContent}`;

      // 保存到 Supabase（会触发 Vercel 部署）
      const response = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: title + '.md',
          content: fullContent,
          category: 'process',
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

      <div style={{ border: '2px dashed #10b981', borderRadius: '12px', padding: '60px', textAlign: 'center', backgroundColor: '#f0fdf4' }}>
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