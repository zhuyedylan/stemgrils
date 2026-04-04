import React, { useState, useEffect } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';

function NavbarAuth() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkAuth = () => {
      const savedUser = localStorage.getItem('stem_user');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    };
    checkAuth();
    // 检查变化
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('stem_user');
    window.location.href = '/';
  };

  if (!user) {
    return (
      <a
        href="/login"
        style={{
          color: 'white',
          backgroundColor: '#10b981',
          padding: '5px 15px',
          borderRadius: '4px',
          textDecoration: 'none',
          fontSize: '14px',
          marginRight: '10px'
        }}
      >
        登录
      </a>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '10px' }}>
      <span style={{ color: 'white', fontSize: '14px' }}>
        👤 {user.name || user.username}
      </span>
      {user.role === 'admin' && (
        <a
          href="/admin"
          style={{
            color: '#fff',
            backgroundColor: '#f59e0b',
            padding: '4px 10px',
            borderRadius: '4px',
            fontSize: '12px',
            textDecoration: 'none'
          }}
        >
          用户管理
        </a>
      )}
      <button
        onClick={handleLogout}
        style={{
          backgroundColor: 'transparent',
          border: '1px solid rgba(255,255,255,0.5)',
          color: 'white',
          padding: '4px 10px',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px'
        }}
      >
        退出
      </button>
    </div>
  );
}

// 客户端仅渲染
export default function NavbarAuthWrapper() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <span></span>;
  }

  return <NavbarAuth />;
}