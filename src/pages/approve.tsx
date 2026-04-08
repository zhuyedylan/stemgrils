import React, { useState, useEffect } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';

const ApprovePage = () => {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState('');

  const supabaseUrl = 'https://jyhmhksdpjkzkhqlkuqh.supabase.co';
  const supabaseKey = 'sb_publishable_a0zC2QDTxicG-HbxojKkTQ_medLD1JW';

  useEffect(() => {
    const storedUser = localStorage.getItem('stem_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  useEffect(() => {
    loadPendingDocs();
  }, []);

  const loadPendingDocs = async () => {
    try {
      // 加载待审批的文档
      const response = await fetch(
        `${supabaseUrl}/rest/v1/documents?approved=eq.false&hidden=eq.false&select=*&order=created_at.desc`,
        {
          headers: { 'apikey': supabaseKey, 'Authorization': 'Bearer ' + supabaseKey }
        }
      );
      const data = await response.json();
      setDocs(data);
    } catch (error) {
      console.error('加载失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (filename) => {
    try {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/documents?filename=eq.${encodeURIComponent(filename)}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': 'Bearer ' + supabaseKey,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ approved: true })
        }
      );
      if (response.ok) {
        setMessage(`✅ ${filename} 已审批通过`);
        loadPendingDocs();
        // 触发重新部署
        try {
          await fetch('https://api.vercel.com/v1/integrations/deploy/prj_pdsffwCNPJcY904M0JMZUtzRjOCg/1PuxGzixwB', { method: 'POST' });
        } catch (e) {}
      }
    } catch (error) {
      setMessage('审批失败: ' + error.message);
    }
  };

  const handleReject = async (filename) => {
    try {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/documents?filename=eq.${encodeURIComponent(filename)}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': 'Bearer ' + supabaseKey,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ approved: false, hidden: true, rejection_reason: '管理员拒绝' })
        }
      );
      if (response.ok) {
        setMessage(`❌ ${filename} 已拒绝`);
        loadPendingDocs();
      }
    } catch (error) {
      setMessage('操作失败: ' + error.message);
    }
  };

  const handleDelete = async (filename) => {
    if (!confirm(`确定删除 ${filename} 吗？此操作不可恢复！`)) return;
    try {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/documents?filename=eq.${encodeURIComponent(filename)}`,
        {
          method: 'DELETE',
          headers: {
            'apikey': supabaseKey,
            'Authorization': 'Bearer ' + supabaseKey
          }
        }
      );
      if (response.ok) {
        setMessage(`🗑️ ${filename} 已删除`);
        loadPendingDocs();
      }
    } catch (error) {
      setMessage('删除失败: ' + error.message);
    }
  };

  if (!user) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>请先登录</h2>
        <p>请从首页登录后再访问审批页面</p>
        <a href="/" style={{ color: '#10b981' }}>返回首页</a>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>权限不足</h2>
        <p>只有管理员可以访问审批页面</p>
        <a href="/" style={{ color: '#10b981' }}>返回首页</a>
      </div>
    );
  }

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>加载中...</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>📋 文档审批</h1>

      {message && (
        <div style={{ padding: '10px', marginBottom: '20px', backgroundColor: '#e0f2fe', borderRadius: '4px' }}>
          {message}
        </div>
      )}

      {docs.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
          <p>暂无待审批的文档</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '15px' }}>
          {docs.map((doc) => (
            <div
              key={doc.filename}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '16px',
                backgroundColor: 'white'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: '0 0 8px 0' }}>{doc.filename}</h3>
                  <p style={{ margin: '0 0 8px 0', color: '#6b7280', fontSize: '14px' }}>
                    上传者: {doc.uploader} | 分类: {doc.category}
                  </p>
                  <p style={{ margin: 0, color: '#9ca3af', fontSize: '12px' }}>
                    上传时间: {new Date(doc.created_at).toLocaleString('zh-CN')}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleApprove(doc.filename)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    ✅ 通过
                  </button>
                  <button
                    onClick={() => handleReject(doc.filename)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#f59e0b',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    ❌ 拒绝
                  </button>
                  <button
                    onClick={() => handleDelete(doc.filename)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    🗑️ 删除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: '30px' }}>
        <a href="/" style={{ color: '#6b7280' }}>← 返回首页</a>
      </div>
    </div>
  );
};

export default function Approve() {
  return (
    <BrowserOnly fallback={<div>加载中...</div>}>
      {() => <ApprovePage />}
    </BrowserOnly>
  );
}