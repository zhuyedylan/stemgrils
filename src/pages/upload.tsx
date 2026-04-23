import React, { useState, useEffect, useRef } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import mammoth from 'mammoth';
import JSZip from 'jszip';

const SUPABASE_URL = 'https://jyhmhksdpjkzkhqlkuqh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5aG1oa3NkcGpremtocWxrdXFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMDEwNTYsImV4cCI6MjA5MDg3NzA1Nn0.e5iYCkY-UNumjWWnsPugc5nIUKOkITccuhODLPBCiwc';

// 日志记录函数
const addLog = async (action: string, details: any, username?: string) => {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/logs`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        action,
        details: JSON.stringify(details),
        username: username || 'system',
        created_at: new Date().toISOString(),
      }),
    });
  } catch (e) {
    console.error('Log error:', e);
  }
};

function UploadPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
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
      addLog('error_load_categories', { error: error.message }, user?.username);
    }
  };

  const loadMyDocs = async () => {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/documents?uploader=eq.${user?.username}&order=created_at.desc`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      const docs = await response.json();
      setMyDocs(docs);
    } catch (error) {
      console.error('加载我的文档失败:', error);
      addLog('error_load_docs', { error: error.message }, user?.username);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.docx?$/i)) {
      setMessage('请上传 Word 文档 (.doc 或 .docx)');
      addLog('upload_invalid_format', { filename: file.name }, user?.username);
      return;
    }

    setUploading(true);
    setMessage('正在转换文档...');
    const filename = file.name.replace(/\.docx?$/i, '');

    try {
      addLog('upload_start', { filename, size: file.size }, user?.username);

      // 读取文件
      const arrayBuffer = await file.arrayBuffer();

      // ===== 前端 mammoth 转换 =====
      setMessage('正在解析 Word 文档...');
      const result = await mammoth.convertToMarkdown({ arrayBuffer });
      let markdown = result.value;

      addLog('convert_success', { filename, contentLength: markdown.length }, user?.username);

      // ===== 提取图片 =====
      setMessage('正在提取图片...');
      const zip = await JSZip.loadAsync(arrayBuffer);
      const mediaFiles = zip.file(/word\/media\/.*/);
      const images: Array<{ name: string; data: string; type: string; ref: string }> = [];

      for (const zipFile of mediaFiles) {
        const originalName = zipFile.name.replace('word/media/', '');
        const imageData = await zipFile.async('base64');
        const mimeType = originalName.endsWith('.png') ? 'image/png'
          : originalName.endsWith('.jpg') || originalName.endsWith('.jpeg') ? 'image/jpeg'
          : originalName.endsWith('.gif') ? 'image/gif'
          : 'image/png';

        images.push({
          name: `${filename}-${Date.now()}-${originalName}`,
          data: imageData,
          type: mimeType,
          ref: `media/${originalName}`
        });
      }

      addLog('images_extracted', { filename, count: images.length }, user?.username);

      // ===== 格式后处理 =====
      markdown = markdown.replace(/^(#{1,6})([^\s])/gm, '$1 $2');
      markdown = markdown.replace(/([^\n])\n([-*+] )/g, '$1\n\n$2');
      markdown = markdown.replace(/([^\n])\n(\d+\. )/g, '$1\n\n$2');
      markdown = markdown.replace(/\n{3,}/g, '\n\n');
      markdown = markdown.replace(/ +\n/g, '\n');
      markdown = markdown.replace(/([^\n])\n(\|)/g, '$1\n\n$2');
      markdown = markdown.replace(/(\|)\n([^\n|])/g, '$1\n\n$2');

      setMessage(`转换完成，${images.length} 张图片待上传...`);

      // ===== 直接上传图片到 Supabase Storage =====
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        setMessage(`正在上传图片 ${i + 1}/${images.length}...`);

        const binaryString = atob(img.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let j = 0; j < binaryString.length; j++) {
          bytes[j] = binaryString.charCodeAt(j);
        }

        const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/images/${img.name}`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': img.type,
            'x-upsert': 'true',
          },
          body: bytes,
        });

        if (uploadRes.ok) {
          const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/images/${img.name}`;
          markdown = markdown.replace(new RegExp(img.ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), publicUrl);
          addLog('image_upload_success', { name: img.name }, user?.username);
        } else {
          addLog('image_upload_failed', { name: img.name, status: uploadRes.status }, user?.username);
        }
      }

      // ===== 直接存储文档到 Supabase =====
      setMessage('正在保存文档...');
      const fullContent = `---
id: ${filename}
title: ${filename}
---

${markdown}`;

      const docRes = await fetch(`${SUPABASE_URL}/rest/v1/documents`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          filename,
          content: fullContent,
          category: selectedCategory,
          uploader: user?.username || 'unknown',
          approved: false,
          created_at: new Date().toISOString(),
        }),
      });

      if (docRes.ok) {
        setMessage(`✅ ${filename} 上传成功！${images.length > 0 ? `已上传 ${images.length} 张图片。` : ''}等待管理员审批`);
        addLog('upload_success', { filename, category: selectedCategory, images: images.length }, user?.username);
        if (fileInputRef.current) fileInputRef.current.value = '';
        loadMyDocs();
      } else {
        const errText = await docRes.text();
        setMessage('保存失败: ' + errText);
        addLog('upload_save_failed', { filename, error: errText }, user?.username);
      }
    } catch (error) {
      setMessage('上传失败: ' + error.message);
      addLog('upload_error', { filename, error: error.message }, user?.username);
    }

    setUploading(false);
  };

  const handleResubmit = async (doc) => {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/documents?filename=eq.${encodeURIComponent(doc.filename)}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          approved: false,
          hidden: false,
          rejection_reason: null,
          updated_at: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        setMessage('✅ 已重新提交，等待审批');
        addLog('resubmit', { filename: doc.filename }, user?.username);
        loadMyDocs();
      } else {
        setMessage('❌ 提交失败');
      }
    } catch (error) {
      setMessage('❌ 提交失败: ' + error.message);
    }
  };

  const handleApproveFromUpload = async (filename) => {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/documents?filename=eq.${encodeURIComponent(filename)}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ approved: true }),
      });
      if (response.ok) {
        setMessage(`✅ ${filename} 已审批通过`);
        addLog('approve', { filename }, user?.username);
        loadMyDocs();
      }
    } catch (error) {
      setMessage('操作失败: ' + error.message);
    }
  };

  const handleRejectFromUpload = async (filename) => {
    const reason = prompt('请输入拒绝理由:');
    if (!reason) return;

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/documents?filename=eq.${encodeURIComponent(filename)}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ approved: false, hidden: true, rejection_reason: reason }),
      });
      if (response.ok) {
        setMessage(`❌ ${filename} 已拒绝`);
        addLog('reject', { filename, reason }, user?.username);
        loadMyDocs();
      }
    } catch (error) {
      setMessage('操作失败: ' + error.message);
    }
  };

  const getStatusBadge = (doc) => {
    if (doc.hidden && doc.rejection_reason) {
      return <span style={{ padding: '2px 8px', backgroundColor: '#ef4444', color: 'white', borderRadius: '4px', fontSize: '12px' }}>已拒绝</span>;
    }
    if (doc.hidden) {
      return <span style={{ padding: '2px 8px', backgroundColor: '#6b7280', color: 'white', borderRadius: '4px', fontSize: '12px' }}>已隐藏</span>;
    }
    if (doc.approved) {
      return <span style={{ padding: '2px 8px', backgroundColor: '#10b981', color: 'white', borderRadius: '4px', fontSize: '12px' }}>已公开</span>;
    }
    return <span style={{ padding: '2px 8px', backgroundColor: '#f59e0b', color: 'white', borderRadius: '4px', fontSize: '12px' }}>待审批</span>;
  };

  if (!isLoggedIn) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>正在跳转...</div>;
  }

  const pendingDocs = myDocs.filter(d => !d.approved && !d.hidden);
  const rejectedDocs = myDocs.filter(d => !d.approved && d.hidden && d.rejection_reason);
  const approvedDocs = myDocs.filter(d => d.approved && !d.hidden);
  const hiddenDocs = myDocs.filter(d => d.approved && d.hidden);

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
        <input ref={fileInputRef} type="file" accept=".doc,.docx" onChange={handleUpload} disabled={uploading} id="file-upload" style={{ display: 'none' }} />
        <label htmlFor="file-upload" style={{ cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.5 : 1 }}>
          <div style={{ fontSize: '48px', marginBottom: '10px' }}>📄</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#10b981' }}>
            {uploading ? message : '点击选择 Word 文档'}
          </div>
          <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>支持 .doc 和 .docx 格式</div>
        </label>
      </div>

      {message && !uploading && (
        <div style={{ padding: '15px', borderRadius: '8px', backgroundColor: message.includes('✅') ? '#d1fae5' : '#fee2e2', color: message.includes('✅') ? '#065f46' : '#991b1b', marginBottom: '20px' }}>
          {message}
        </div>
      )}

      {/* 待审批 */}
      {pendingDocs.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h3>⏳ 待审批 ({pendingDocs.length})</h3>
          {pendingDocs.map((doc, idx) => (
            <div key={idx} style={{ padding: '12px', backgroundColor: '#fffbeb', borderRadius: '8px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{doc.filename}</span>
                {getStatusBadge(doc)}
              </div>
              {user?.role === 'admin' && (
                <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                  <button onClick={() => handleApproveFromUpload(doc.filename)} style={{ padding: '6px 16px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '13px' }}>✅ 通过</button>
                  <button onClick={() => handleRejectFromUpload(doc.filename)} style={{ padding: '6px 16px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '13px' }}>❌ 拒绝</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 被拒绝 */}
      {rejectedDocs.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h3>❌ 被退回 ({rejectedDocs.length})</h3>
          {rejectedDocs.map((doc, idx) => (
            <div key={idx} style={{ padding: '12px', backgroundColor: '#fef2f2', borderRadius: '8px', marginBottom: '8px', border: '1px solid #fca5a5' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 'bold' }}>{doc.filename}</span>
                {getStatusBadge(doc)}
              </div>
              <div style={{ fontSize: '12px', color: '#dc2626', marginBottom: '8px' }}>
                <strong>拒绝理由：</strong>{doc.rejection_reason}
              </div>
              <button onClick={() => handleResubmit(doc)} style={{ padding: '6px 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '13px' }}>✏️ 修改后重新提交</button>
            </div>
          ))}
        </div>
      )}

      {/* 已公开 */}
      {approvedDocs.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h3>✅ 已公开 ({approvedDocs.length})</h3>
          {approvedDocs.map((doc, idx) => (
            <div key={idx} style={{ padding: '12px', backgroundColor: '#f0fdf4', borderRadius: '8px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{doc.filename}</span>
                {getStatusBadge(doc)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 已隐藏 */}
      {hiddenDocs.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h3>👁️ 已隐藏 ({hiddenDocs.length})</h3>
          {hiddenDocs.map((doc, idx) => (
            <div key={idx} style={{ padding: '12px', backgroundColor: '#f3f4f6', borderRadius: '8px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{doc.filename}</span>
                {getStatusBadge(doc)}
              </div>
            </div>
          ))}
        </div>
      )}

      {user?.role === 'admin' && (
        <button onClick={() => window.location.href = '/logs'} style={{ marginTop: '10px', padding: '12px 30px', fontSize: '16px', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
          📋 查看日志
        </button>
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