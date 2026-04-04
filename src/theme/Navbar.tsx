import React from 'react';
import NavbarOriginal from '@theme-original/Navbar';
import BrowserOnly from '@docusaurus/BrowserOnly';

function NavbarAuth() {
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    const checkAuth = () => {
      const savedUser = localStorage.getItem('stem_user');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    };
    checkAuth();
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('stem_user');
    window.location.href = '/';
  };

  if (!user) {
    return null;
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '10px' }}>
      <span style={{ color: 'white', fontSize: '14px' }}>
        👤 {user.name || user.username}
      </span>
      {user.role === 'admin' && (
        <>
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
          <a
            href="/categories"
            style={{
              color: '#fff',
              backgroundColor: '#3b82f6',
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '12px',
              textDecoration: 'none'
            }}
          >
            目录管理
          </a>
        </>
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

export default function Navbar() {
  return (
    <>
      <NavbarOriginal />
      <BrowserOnly fallback={<span></span>}>
        {() => {
          // 在 navbar 渲染后添加登录状态
          setTimeout(() => {
            const navbarRight = document.querySelector('.navbar__items--right');
            if (navbarRight && !document.getElementById('auth-container')) {
              const container = document.createElement('div');
              container.id = 'auth-container';
              const authHtml = (() => {
                const user = localStorage.getItem('stem_user');
                const baseUrl = '/stemgirls/';
                if (!user) {
                  return `<a href="${baseUrl}login" style="color:white;background:#10b981;padding:5px 15px;border-radius:4px;text-decoration:none;font-size:14px;margin-right:10px">登录</a>`;
                }
                const u = JSON.parse(user);
                let html = `<span style="color:white;font-size:14px;margin-right:10px">👤 ${u.name || u.username}</span>`;
                html += `<a href="${baseUrl}editor" style="color:#fff;background:#10b981;padding:5px 12px;border-radius:4px;text-decoration:none;font-size:13px;margin-right:8px">编辑</a>`;
                html += `<a href="${baseUrl}upload" style="color:#fff;background:#10b981;padding:5px 12px;border-radius:4px;text-decoration:none;font-size:13px;margin-right:8px">上传</a>`;
                if (u.role === 'admin') {
                  html += `<a href="${baseUrl}admin" style="color:#fff;background:#f59e0b;padding:4px 10px;border-radius:4px;font-size:12px;text-decoration:none;margin-right:10px">用户管理</a>`;
                  html += `<a href="${baseUrl}categories" style="color:#fff;background:#3b82f6;padding:4px 10px;border-radius:4px;font-size:12px;text-decoration:none;margin-right:10px">目录管理</a>`;
                }
                html += `<button onclick="localStorage.removeItem('stem_user');window.location.href='${baseUrl}'" style="background:transparent;border:1px solid rgba(255,255,255,0.5);color:white;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:12px">退出</button>`;
                return html;
              })();
              container.innerHTML = authHtml;
              navbarRight.appendChild(container);
            }
          }, 100);
          return <span></span>;
        }}
      </BrowserOnly>
    </>
  );
}