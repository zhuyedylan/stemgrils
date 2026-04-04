import React, { useState, useEffect } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';

// 用户数据管理
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

function UserManager() {
  const [users, setUsers] = useState({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // 检查是否是管理员
    const savedUser = localStorage.getItem('stem_user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      if (user.role === 'admin') {
        setIsAdmin(true);
      }
    }
    // 加载用户数据
    loadUsers();
  }, []);

  const loadUsers = () => {
    const saved = localStorage.getItem('stem_users');
    if (saved) {
      setUsers(JSON.parse(saved));
    } else {
      setUsers(defaultUsers);
      localStorage.setItem('stem_users', JSON.stringify(defaultUsers));
    }
  };

  const resetPassword = (username) => {
    if (!confirm(`确定要重置用户 "${username}" 的密码吗？`)) {
      return;
    }

    const updatedUsers = { ...users };
    updatedUsers[username] = {
      ...updatedUsers[username],
      password: '2026',
      changed: false
    };

    setUsers(updatedUsers);
    localStorage.setItem('stem_users', JSON.stringify(updatedUsers));
    setMessage(`✅ 用户 ${username} 密码已重置为 2026`);
  };

  const updatePassword = (username, newPassword) => {
    if (newPassword.length !== 4 || !/^\d{4}$/.test(newPassword)) {
      setMessage('密码必须是4位数字');
      return;
    }

    const updatedUsers = { ...users };
    updatedUsers[username] = {
      ...updatedUsers[username],
      password: newPassword,
      changed: true
    };

    setUsers(updatedUsers);
    localStorage.setItem('stem_users', JSON.stringify(updatedUsers));
    setMessage(`✅ 用户 ${username} 密码已修改`);
  };

  if (!isAdmin) {
    return (
      <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <h2>🚫 无权限</h2>
        <p>只有管理员可以访问此页面</p>
        <button onClick={() => window.location.href = '/'} style={{ padding: '10px 30px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          返回首页
        </button>
      </div>
    );
  }

  const userList = Object.entries(users).filter(([name]) => name !== 'admin');

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      <h2>👥 用户管理</h2>
      <p style={{ color: '#666', marginBottom: '20px' }}>管理员可以重置或修改用户密码</p>

      {message && (
        <div style={{ padding: '10px', backgroundColor: '#d1fae5', color: '#065f46', borderRadius: '5px', marginBottom: '20px' }}>
          {message}
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden' }}>
        <thead>
          <tr style={{ backgroundColor: '#f5f5f5' }}>
            <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>用户名</th>
            <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>角色</th>
            <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>密码状态</th>
            <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {userList.map(([username, data]) => (
            <tr key={username}>
              <td style={{ padding: '12px', border: '1px solid #ddd' }}><strong>{username}</strong></td>
              <td style={{ padding: '12px', border: '1px solid #ddd' }}>{data.role === 'admin' ? '管理员' : '用户'}</td>
              <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                {data.changed ? '✅ 已修改' : '❌ 初始密码'}
              </td>
              <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                <button
                  onClick={() => resetPassword(username)}
                  style={{ padding: '6px 15px', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginRight: '10px' }}
                >
                  重置密码
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: '20px' }}>
        <button onClick={() => window.location.href = '/'} style={{ padding: '10px 30px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          🏠 返回首页
        </button>
      </div>
    </div>
  );
}

export default function Admin() {
  return (
    <BrowserOnly fallback={<div style={{ textAlign: 'center', padding: '50px' }}>加载中...</div>}>
      {() => <UserManager />}
    </BrowserOnly>
  );
}