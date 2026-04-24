import React, { useState, useEffect } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';

// 环境变量注入到 window 对象
declare global {
  interface Window {
    SUPABASE_URL?: string;
    SUPABASE_KEY?: string;
  }
}

const DEPLOY_HOOK = 'https://api.vercel.com/v1/integrations/deploy/prj_pdsffwCNPJcY904M0JMZUtzRjOCg/1PuxGzixwB';

const ApprovePage = () => {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [message, setMessage] = useState('');

  // 从 window 对象获取环境变量（由 Docusaurus customFields 注入）
  const supabaseUrl = window.SUPABASE_URL || 'https://jyhmhksdpjkzkhqlkuqh.supabase.co';
  const supabaseKey = window.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5aG1oa3NkcGpremtocWxrdXFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMDEwNTYsImV4cCI6MjA5MDg3NzA1Nn0.e5iYCkY-UNumjWWnsPugc5nIUKOkITccuhODLPBCiwc';

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

  const handleApprove = async (filename: string) => {
    try {
      setMessage(`正在审批 ${filename}...`);
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
        // 触发重新部署
        setMessage(`✅ ${filename} 已审批通过，正在触发重新部署...`);
        try {
          const deployRes = await fetch(DEPLOY_HOOK, { method: 'POST' });
          if (deployRes.ok) {
            setMessage(`✅ ${filename} 已审批通过！网站将在约1分钟后自动更新。`);
          } else {
            setMessage(`✅ ${filename} 已审批通过，但部署触发失败。请手动推送代码。`);
          }
        } catch (e) {
          setMessage(`✅ ${filename} 已审批通过，部署触发失败。请手动推送代码。`);
        }
        loadPendingDocs();
      } else {
        const err = await response.text();
        setMessage('审批失败: ' + err);
      }
    } catch (error: any) {
      setMessage('审批失败: ' + error.message);
    }
  };

  const handleReject = async (filename: string) => {
    const reason = prompt('请输入拒绝理由:');
    if (!reason) return;

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
          body: JSON.stringify({ approved: false, hidden: true, rejection_reason: reason })
        }
      );
      if (response.ok) {
        setMessage(`❌ ${filename} 已拒绝`);
        loadPendingDocs();
      }
    } catch (error: any) {
      setMessage('操作失败: ' + error.message);
    }
  };

  const handleDelete = async (filename: string) => {
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
    } catch (error: any) {
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
      <p style={{ color: '#666', marginBottom: '15px' }}>
        审批通过的文档将自动触发网站重新部署，约1分钟后生效。
      </p>

      {message && (
        <div style={{ padding: '10px', marginBottom: '20px', backgroundColor: message.includes('✅') ? '#d1fae5' : '#fee2e2', color: message.includes('✅') ? '#065f46' : '#991b1b', borderRadius: '4px' }}>
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