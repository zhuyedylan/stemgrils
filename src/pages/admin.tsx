import React, { useState, useEffect } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';

declare global {
  interface Window {
    SUPABASE_URL?: string;
    SUPABASE_KEY?: string;
  }
}

function SystemAdmin() {
  const [user, setUser] = useState<any>(null);
  const [deploying, setDeploying] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const savedUser = localStorage.getItem('stem_user');
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      setUser(userData);
    }
  }, []);

  const handleDeploy = async () => {
    setDeploying(true);
    setMessage('正在触发部署...');
    try {
      await fetch('https://api.vercel.com/v1/integrations/deploy/prj_pdsffwCNPJcY904M0JMZUtzRjOCg/1PuxGzixwB', { method: 'POST' });
      setMessage('✅ 部署已触发，请等待约 1-2 分钟后刷新页面');
    } catch (e) {
      setMessage('❌ 部署失败');
    }
    setDeploying(false);
  };

  if (!user) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>加载中...</div>;
  }

  if (user.role !== 'admin') {
    return (
      <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <h2>🚫 无权限</h2>
        <p>只有管理员可以访问此页面</p>
        <a href="/" style={{ padding: '10px 30px', backgroundColor: '#10b981', color: 'white', borderRadius: '5px', textDecoration: 'none', display: 'inline-block' }}>
          返回首页
        </a>
      </div>
    );
  }

  const buttons = [
    { icon: '🚀', label: '发布网站', action: handleDeploy, special: true },
    { icon: '📤', label: '上传文档', href: '/upload', color: '#10b981' },
    { icon: '📚', label: '文档管理', href: '/manage', color: '#3b82f6' },
    { icon: '📁', label: '目录管理', href: '/categories', color: '#10b981' },
    { icon: '👥', label: '用户管理', href: '/users', color: '#8b5cf6' },
    { icon: '📋', label: '查看日志', href: '/logs', color: '#f59e0b' },
  ];

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '10px' }}>⚙️ 系统管理</h1>
      <p style={{ color: '#666', marginBottom: '30px' }}>管理网站内容、用户和部署</p>

      {message && (
        <div style={{
          padding: '15px',
          marginBottom: '20px',
          backgroundColor: message.includes('✅') ? '#d1fae5' : '#fee2e2',
          color: message.includes('✅') ? '#065f46' : '#991b1b',
          borderRadius: '8px'
        }}>
          {message}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
        {buttons.map(btn => (
          btn.special ? (
            <button
              key={btn.label}
              onClick={btn.action}
              disabled={deploying}
              style={{
                padding: '20px',
                fontSize: '18px',
                backgroundColor: deploying ? '#9ca3af' : '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: deploying ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <span style={{ fontSize: '32px' }}>{btn.icon}</span>
              <span>{deploying ? '部署中...' : btn.label}</span>
            </button>
          ) : (
            <a
              key={btn.label}
              href={btn.href}
              style={{
                padding: '20px',
                fontSize: '18px',
                backgroundColor: btn.color,
                color: 'white',
                borderRadius: '12px',
                textDecoration: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px',
                fontWeight: 'bold'
              }}
            >
              <span style={{ fontSize: '32px' }}>{btn.icon}</span>
              <span>{btn.label}</span>
            </a>
          )
        ))}
      </div>

      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#f3f4f6', borderRadius: '8px', fontSize: '14px', color: '#6b7280' }}>
        💡 提示：编辑、审批、排序操作后需要点击"发布网站"才能更新静态页面
      </div>

      <a href="/" style={{
        marginTop: '20px',
        padding: '12px 30px',
        backgroundColor: '#6b7280',
        color: 'white',
        borderRadius: '8px',
        textDecoration: 'none',
        display: 'inline-block'
      }}>
        🏠 返回首页
      </a>
    </div>
  );
}

export default function Admin() {
  return (
    <BrowserOnly fallback={<div style={{ textAlign: 'center', padding: '50px' }}>加载中...</div>}>
      {() => <SystemAdmin />}
    </BrowserOnly>
  );
}