import React, { useState, useEffect } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';

declare global {
  interface Window {
    SUPABASE_URL?: string;
    SUPABASE_KEY?: string;
  }
}

const UsersPage = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [message, setMessage] = useState('');

  const supabaseUrl = window.SUPABASE_URL || 'https://jyhmhksdpjkzkhqlkuqh.supabase.co';
  const supabaseKey = window.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5aG1oa3NkcGpremtocWxrdXFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMDEwNTYsImV4cCI6MjA5MDg3NzA1Nn0.e5iYCkY-UNumjWWnsPugc5nIUKOkITccuhODLPBCiwc';

  useEffect(() => {
    const storedUser = localStorage.getItem('stem_user');
    if (!storedUser) {
      window.location.href = '/login';
      return;
    }
    const userData = JSON.parse(storedUser);
    if (userData.role !== 'admin') {
      window.location.href = '/';
      return;
    }
    setUser(userData);
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/users?select=*`, {
        headers: { 'apikey': supabaseKey, 'Authorization': 'Bearer ' + supabaseKey }
      });
      const data = await res.json();
      setUsers(data);
    } catch (error: any) {
      setMessage('加载失败: ' + error.message);
    }
    setLoading(false);
  };

  const handleRoleChange = async (username: string, newRole: string) => {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/users?username=eq.${encodeURIComponent(username)}`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': 'Bearer ' + supabaseKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        setMessage(`✅ ${username} 已设置为 ${newRole === 'admin' ? '管理员' : '普通用户'}`);
        loadUsers();
      } else {
        setMessage('操作失败');
      }
    } catch (error: any) {
      setMessage('操作失败: ' + error.message);
    }
  };

  const handleAddUser = async () => {
    const username = prompt('请输入用户名:');
    if (!username) return;
    const password = prompt('请输入密码:');
    if (!password) return;
    const role = confirm('设置为管理员？') ? 'admin' : 'user';

    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/users`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': 'Bearer ' + supabaseKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password,
          role: role,
          created_at: new Date().toISOString()
        })
      });
      if (res.ok) {
        setMessage(`✅ 用户 ${username} 已添加`);
        loadUsers();
      } else {
        const err = await res.text();
        setMessage('添加失败: ' + err);
      }
    } catch (error: any) {
      setMessage('添加失败: ' + error.message);
    }
  };

  const handleDeleteUser = async (username: string) => {
    if (username === user?.username) {
      setMessage('不能删除自己的账户');
      return;
    }
    if (!confirm(`确定要删除用户 "${username}" 吗？`)) return;

    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/users?username=eq.${encodeURIComponent(username)}`, {
        method: 'DELETE',
        headers: { 'apikey': supabaseKey, 'Authorization': 'Bearer ' + supabaseKey, 'Prefer': 'return=minimal' }
      });
      if (res.ok) {
        setMessage(`✅ 用户 ${username} 已删除`);
        loadUsers();
      } else {
        setMessage('删除失败');
      }
    } catch (error: any) {
      setMessage('删除失败: ' + error.message);
    }
  };

  if (!user || loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>加载中...</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>👥 用户管理</h1>
        <button onClick={() => window.location.href = '/upload'} style={{ padding: '8px 20px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          🏠 返回
        </button>
      </div>

      {message && (
        <div style={{ padding: '10px', marginBottom: '20px', backgroundColor: message.includes('✅') ? '#d1fae5' : '#fee2e2', color: message.includes('✅') ? '#065f46' : '#991b1b', borderRadius: '8px' }}>
          {message}
        </div>
      )}

      <button onClick={handleAddUser} style={{ marginBottom: '20px', padding: '10px 20px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
        + 添加用户
      </button>

      <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb' }}>
              <th style={{ padding: '12px', textAlign: 'left' }}>用户名</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>角色</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>创建时间</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, idx) => (
              <tr key={u.username} style={{ borderBottom: idx < users.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                <td style={{ padding: '12px', fontWeight: u.username === user?.username ? 'bold' : 'normal' }}>
                  {u.username}
                  {u.username === user?.username && <span style={{ marginLeft: '5px', color: '#10b981' }}>(当前)</span>}
                </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <select
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.username, e.target.value)}
                    disabled={u.username === user?.username}
                    style={{ padding: '5px 10px', borderRadius: '4px', border: '1px solid #ddd' }}
                  >
                    <option value="user">普通用户</option>
                    <option value="admin">管理员</option>
                  </select>
                </td>
                <td style={{ padding: '12px', textAlign: 'center', fontSize: '14px', color: '#666' }}>
                  {new Date(u.created_at).toLocaleDateString('zh-CN')}
                </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <button
                    onClick={() => handleDeleteUser(u.username)}
                    disabled={u.username === user?.username}
                    style={{
                      padding: '6px 15px',
                      backgroundColor: u.username === user?.username ? '#e5e7eb' : '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: u.username === user?.username ? 'not-allowed' : 'pointer'
                    }}
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {users.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>暂无用户</div>
      )}
    </div>
  );
};

export default function Users() {
  return <BrowserOnly fallback={<div style={{ textAlign: 'center', padding: '50px' }}>加载中...</div>}>{() => <UsersPage />}</BrowserOnly>;
}