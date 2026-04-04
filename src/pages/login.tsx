import React, { useState, useEffect } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loginUsername, setLoginUsername] = useState(''); // 保存登录时的用户名

  // 默认用户列表
  const defaultUsers = {
    'xxe': { password: '2026', role: 'user', changed: false, name: '邢雪儿' },
    'wjy': { password: '2026', role: 'user', changed: false, name: '王佳艺' },
    'zkr': { password: '2026', role: 'user', changed: false, name: '朱可人' },
    'yql': { password: '2026', role: 'user', changed: false, name: '袁其乐' },
    'lxr': { password: '2026', role: 'user', changed: false, name: '李雪睿' },
    'lbh': { password: '2026', role: 'user', changed: false, name: '李博涵' },
    'tsj': { password: '2026', role: 'user', changed: false, name: '田苏佳' },
    'wcx': { password: '2026', role: 'user', changed: false, name: '吴采晞' },
    'nyk': { password: '2026', role: 'user', changed: false, name: '宁逸可' },
    'hsy': { password: '2026', role: 'user', changed: false, name: '何思媛' },
    'ljh': { password: '2026', role: 'user', changed: false, name: '李吉豪' },
    'admin': { password: '2014', role: 'admin', changed: true, name: '管理员' }
  };

  const loadUsers = () => {
    const saved = localStorage.getItem('stem_users');
    if (saved) {
      return JSON.parse(saved);
    }
    localStorage.setItem('stem_users', JSON.stringify(defaultUsers));
    return defaultUsers;
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('stem_user');
    if (savedUser) {
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    const users = loadUsers();
    const inputUsername = username.toLowerCase();
    const user = users[inputUsername];

    if (!user) {
      setError('用户名不存在');
      return;
    }

    if (user.password !== password) {
      setError('密码错误');
      return;
    }

    // 检查是否首次登录
    if (!user.changed && password === '2026') {
      setLoginUsername(inputUsername);
      setIsChangingPassword(true);
      return;
    }

    localStorage.setItem('stem_user', JSON.stringify({
      username: inputUsername,
      role: user.role,
      name: user.name
    }));
    setIsLoggedIn(true);
    setError('');
    window.location.href = '/';
  };

  const handleChangePassword = (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    if (newPassword.length !== 4 || !/^\d{4}$/.test(newPassword)) {
      setError('密码必须是4位数字');
      return;
    }

    const users = loadUsers();
    users[loginUsername] = {
      ...users[loginUsername],
      password: newPassword,
      changed: true
    };
    localStorage.setItem('stem_users', JSON.stringify(users));

    localStorage.setItem('stem_user', JSON.stringify({
      username: loginUsername,
      role: users[loginUsername].role,
      name: users[loginUsername].name
    }));
    setIsLoggedIn(true);
    setIsChangingPassword(false);
    window.location.href = '/';
  };

  const handleLogout = () => {
    localStorage.removeItem('stem_user');
    setIsLoggedIn(false);
    setUsername('');
    setPassword('');
    window.location.href = '/';
  };

  if (isChangingPassword) {
    return (
      <div style={{ maxWidth: '400px', margin: '50px auto', textAlign: 'center', padding: '20px' }}>
        <h2>🔐 首次登录</h2>
        <p style={{ color: '#666', marginBottom: '20px' }}>请修改您的初始密码（4位数字）</p>
        <form onSubmit={handleChangePassword}>
          <div style={{ marginBottom: '15px' }}>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="输入新密码（4位数字）" maxLength={4} style={{ padding: '10px', fontSize: '16px', width: '250px', border: '1px solid #ddd', borderRadius: '5px' }} />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="确认新密码（4位数字）" maxLength={4} style={{ padding: '10px', fontSize: '16px', width: '250px', border: '1px solid #ddd', borderRadius: '5px' }} />
          </div>
          {error && <p style={{ color: 'red', marginBottom: '10px' }}>{error}</p>}
          <button type="submit" style={{ padding: '10px 40px', fontSize: '16px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>确认修改</button>
        </form>
      </div>
    );
  }

  if (isLoggedIn) {
    const user = JSON.parse(localStorage.getItem('stem_user') || '{}');
    return (
      <div style={{ padding: '20px', maxWidth: '400px', margin: '50px auto', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '10px' }}>✅</div>
        <h2>已登录</h2>
        <p>欢迎，<strong>{user.name || user.username}</strong></p>
        <p style={{ color: '#666' }}>角色: {user.role === 'admin' ? '管理员' : '用户'}</p>
        <div style={{ marginTop: '20px' }}>
          <button onClick={() => window.location.href = '/'} style={{ marginRight: '10px', padding: '10px 30px', fontSize: '16px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>🏠 返回首页</button>
          <button onClick={handleLogout} style={{ padding: '10px 30px', fontSize: '16px', backgroundColor: '#e53e3e', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>退出登录</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', textAlign: 'center', padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <button onClick={() => window.location.href = '/'} style={{ padding: '8px 20px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          🏠 返回首页
        </button>
      </div>
      <h2>🔐 登录</h2>
      <div style={{ padding: '15px', backgroundColor: '#fff3cd', borderRadius: '8px', marginBottom: '20px', color: '#856404', fontSize: '14px' }}>
        ⚠️ 网站修改功能仅限于项目小组成员维护使用，需要输入账号密码，普通用户没有修改权限
      </div>
      <p style={{ color: '#666', marginBottom: '20px' }}>请输入用户名和密码</p>
      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: '15px' }}>
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="用户名" style={{ padding: '10px', fontSize: '16px', width: '250px', border: '1px solid #ddd', borderRadius: '5px' }} />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="密码" style={{ padding: '10px', fontSize: '16px', width: '250px', border: '1px solid #ddd', borderRadius: '5px' }} />
        </div>
        {error && <p style={{ color: 'red', marginBottom: '10px' }}>{error}</p>}
        <button type="submit" style={{ padding: '10px 40px', fontSize: '16px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>登录</button>
      </form>
    </div>
  );
}

export default function Login() {
  return <BrowserOnly fallback={<div style={{ textAlign: 'center', padding: '50px' }}>加载中...</div>}>{() => <LoginPage />}</BrowserOnly>;
}