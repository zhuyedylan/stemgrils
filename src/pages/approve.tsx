import React, { useState, useEffect } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';

function ApprovePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [pendingDocs, setPendingDocs] = useState([]);
  const [allDocs, setAllDocs] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('stem_user');
    if (!savedUser) {
      window.location.href = '/login';
      return;
    }
    const userData = JSON.parse(savedUser);
    if (userData.role !== 'admin') {
      window.location.href = '/';
      return;
    }
    setUser(userData);
    setIsLoggedIn(true);
    loadDocs();
  }, []);

  const loadDocs = async () => {
    setLoading(true);
    try {
      const [pendingRes, allRes] = await Promise.all([
        fetch('/api/approve'),
        fetch('/api/files?t=' + Date.now())
      ]);
      const pending = await pendingRes.json();
      const all = await allRes.json();

      // 获取所有文档（包括未审批的）用于管理
      const supabaseUrl = 'https://jyhmhksdpjkzkhqlkuqh.supabase.co';
      const supabaseKey = 'sb_publishable_a0zC2QDTxicG-HbxojKkTQ_medLD1JW';
      const fullRes = await fetch(`${supabaseUrl}/rest/v1/documents?select=*&order=created_at.desc`, {
        headers: { 'apikey': supabaseKey, 'Authorization': 'Bearer ' + supabaseKey }
      });
      const fullDocs = await fullRes.json();

      setPendingDocs(pending);
      setAllDocs(fullDocs);
    } catch (error) {
      console.error('加载失败:', error);
    }
    setLoading(false);
  };

  const handleApprove = async (filename) => {
    try {
      const response = await fetch('/api/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: filename, action: 'approve' })
      });
      const result = await response.json();
      if (result.success) {
        setMessage('✅ 审批通过！');
        loadDocs();
      } else {
        setMessage('❌ 审批失败: ' + result.error);
      }
    } catch (error) {
      setMessage('❌ 审批失败: ' + error.message);
    }
  };

  const handleReject = async (filename) => {
    if (!confirm('确定要拒绝并删除该文档吗？')) return;
    try {
      const response = await fetch('/api/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: filename, action: 'reject' })
      });
      const result = await response.json();
      if (result.success) {
        setMessage('✅ 已拒绝并删除');
        loadDocs();
      } else {
        setMessage('❌ 操作失败: ' + result.error);
      }
    } catch (error) {
      setMessage('❌ 操作失败: ' + error.message);
    }
  };

  const handleHide = async (filename) => {
    try {
      const response = await fetch('/api/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: filename, action: 'hide' })
      });
      const result = await response.json();
      if (result.success) {
        setMessage('✅ 已隐藏');
        loadDocs();
      } else {
        setMessage('❌ 操作失败: ' + result.error);
      }
    } catch (error) {
      setMessage('❌ 操作失败: ' + error.message);
    }
  };

  const handleShow = async (filename) => {
    try {
      const response = await fetch('/api/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: filename, action: 'show' })
      });
      const result = await response.json();
      if (result.success) {
        setMessage('✅ 已显示');
        loadDocs();
      } else {
        setMessage('❌ 操作失败: ' + result.error);
      }
    } catch (error) {
      setMessage('❌ 操作失败: ' + error.message);
    }
  };

  if (!isLoggedIn || loading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>加载中...</div>;
  }

  const visibleDocs = allDocs.filter(d => d.approved && !d.hidden);
  const hiddenDocs = allDocs.filter(d => d.approved && d.hidden);

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>📋 文档审批管理</h2>
        <button onClick={() => window.location.href = '/'} style={{ padding: '8px 20px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          🏠 返回首页
        </button>
      </div>

      {message && (
        <div style={{ padding: '15px', borderRadius: '8px', backgroundColor: message.includes('✅') ? '#d1fae5' : '#fee2e2', color: message.includes('✅') ? '#065f46' : '#991b1b', marginBottom: '20px' }}>
          {message}
        </div>
      )}

      {/* 待审批列表 */}
      <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#fffbeb', borderRadius: '12px', border: '2px solid #f59e0b' }}>
        <h3 style={{ marginTop: 0, color: '#92400e' }}>⏳ 待审批文档 ({pendingDocs.length})</h3>
        {pendingDocs.length === 0 ? (
          <p style={{ color: '#92400e' }}>暂无待审批的文档</p>
        ) : (
          <div style={{ display: 'grid', gap: '10px' }}>
            {pendingDocs.map((doc, idx) => (
              <div key={idx} style={{ padding: '15px', backgroundColor: 'white', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 'bold' }}>📄 {doc.filename}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '5px' }}>
                    上传者: {doc.uploader} | 分类: {doc.category} | 日期: {new Date(doc.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <button onClick={() => handleApprove(doc.filename)} style={{ padding: '8px 20px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginRight: '10px' }}>
                    ✅ 通过
                  </button>
                  <button onClick={() => handleReject(doc.filename)} style={{ padding: '8px 20px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                    ❌ 拒绝
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 已公开文档 */}
      <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#f0fdf4', borderRadius: '12px', border: '2px solid #10b981' }}>
        <h3 style={{ marginTop: 0, color: '#065f46' }}>✅ 已公开文档 ({visibleDocs.length})</h3>
        {visibleDocs.length === 0 ? (
          <p style={{ color: '#065f46' }}>暂无已公开的文档</p>
        ) : (
          <div style={{ display: 'grid', gap: '10px' }}>
            {visibleDocs.map((doc, idx) => (
              <div key={idx} style={{ padding: '15px', backgroundColor: 'white', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 'bold' }}>📄 {doc.filename}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '5px' }}>
                    上传者: {doc.uploader} | 审批日期: {doc.approval_date ? new Date(doc.approval_date).toLocaleDateString() : '-'}
                  </div>
                </div>
                <button onClick={() => handleHide(doc.filename)} style={{ padding: '8px 20px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                  👁️ 隐藏
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 已隐藏文档 */}
      <div style={{ padding: '20px', backgroundColor: '#f3f4f6', borderRadius: '12px', border: '2px solid #9ca3af' }}>
        <h3 style={{ marginTop: 0, color: '#374151' }}>👁️‍🗨️ 已隐藏文档 ({hiddenDocs.length})</h3>
        {hiddenDocs.length === 0 ? (
          <p style={{ color: '#6b7280' }}>暂无已隐藏的文档</p>
        ) : (
          <div style={{ display: 'grid', gap: '10px' }}>
            {hiddenDocs.map((doc, idx) => (
              <div key={idx} style={{ padding: '15px', backgroundColor: 'white', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 'bold' }}>📄 {doc.filename}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '5px' }}>
                    上传者: {doc.uploader}
                  </div>
                </div>
                <button onClick={() => handleShow(doc.filename)} style={{ padding: '8px 20px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                  👁️ 显示
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Approve() {
  return <BrowserOnly fallback={<div style={{ textAlign: 'center', padding: '50px' }}>加载中...</div>}>{() => <ApprovePage />}</BrowserOnly>;
}