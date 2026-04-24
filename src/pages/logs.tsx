import React, { useState, useEffect } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';

declare global {
  interface Window {
    SUPABASE_URL?: string;
    SUPABASE_KEY?: string;
  }
}

function LogsPage() {
  const SUPABASE_URL = window.SUPABASE_URL || 'https://jyhmhksdpjkzkhqlkuqh.supabase.co';
  const SUPABASE_KEY = window.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5aG1oa3NkcGpremtocWxrdXFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMDEwNTYsImV4cCI6MjA5MDg3NzA1Nn0.e5iYCkY-UNumjWWnsPugc5nIUKOkITccuhODLPBCiwc';

  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

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

    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/logs?order=created_at.desc&limit=100`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      const data = await response.json();
      setLogs(data);
    } catch (error) {
      console.error('加载日志失败:', error);
    }
    setLoading(false);
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      'upload_start': '开始上传',
      'convert_success': '转换成功',
      'images_extracted': '提取图片',
      'image_upload_success': '图片上传成功',
      'image_upload_failed': '图片上传失败',
      'upload_success': '上传成功',
      'upload_save_failed': '保存失败',
      'upload_error': '上传错误',
      'upload_invalid_format': '格式无效',
      'approve': '审批通过',
      'reject': '拒绝文档',
      'resubmit': '重新提交',
      'error_load_categories': '加载目录错误',
      'error_load_docs': '加载文档错误',
      'login': '登录',
      'logout': '退出登录',
    };
    return labels[action] || action;
  };

  const getActionColor = (action: string) => {
    if (action.includes('error') || action.includes('failed')) return '#ef4444';
    if (action.includes('success') || action === 'approve') return '#10b981';
    if (action.includes('reject')) return '#f59e0b';
    return '#6b7280';
  };

  const filteredLogs = filter === 'all' ? logs : logs.filter(l => l.action.includes(filter));

  const formatTime = (time: string) => {
    return new Date(time).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <h2>📋 系统日志</h2>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        查看系统操作记录，帮助调试和监控。
      </p>

      {/* 筛选 */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <button onClick={() => setFilter('all')} style={{ padding: '8px 16px', backgroundColor: filter === 'all' ? '#3b82f6' : '#e5e7eb', color: filter === 'all' ? 'white' : '#374151', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>全部</button>
        <button onClick={() => setFilter('upload')} style={{ padding: '8px 16px', backgroundColor: filter === 'upload' ? '#3b82f6' : '#e5e7eb', color: filter === 'upload' ? 'white' : '#374151', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>上传</button>
        <button onClick={() => setFilter('error')} style={{ padding: '8px 16px', backgroundColor: filter === 'error' ? '#3b82f6' : '#e5e7eb', color: filter === 'error' ? 'white' : '#374151', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>错误</button>
        <button onClick={() => setFilter('approve')} style={{ padding: '8px 16px', backgroundColor: filter === 'approve' ? '#3b82f6' : '#e5e7eb', color: filter === 'approve' ? 'white' : '#374151', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>审批</button>
        <button onClick={loadLogs} style={{ padding: '8px 16px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginLeft: 'auto' }}>🔄 刷新</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px' }}>加载中...</div>
      ) : filteredLogs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px', color: '#666' }}>暂无日志记录</div>
      ) : (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>时间</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>操作</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>用户</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>详情</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log, idx) => (
                <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#f9fafb' }}>
                  <td style={{ padding: '12px', fontSize: '13px', color: '#6b7280' }}>{formatTime(log.created_at)}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ padding: '4px 8px', backgroundColor: getActionColor(log.action), color: 'white', borderRadius: '4px', fontSize: '12px' }}>
                      {getActionLabel(log.action)}
                    </span>
                  </td>
                  <td style={{ padding: '12px', fontSize: '13px' }}>{log.username}</td>
                  <td style={{ padding: '12px', fontSize: '13px', color: '#6b7280', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
        <button onClick={() => window.location.href = '/upload'} style={{ padding: '12px 30px', fontSize: '16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
          📤 上传页面
        </button>
        <button onClick={() => window.location.href = '/'} style={{ padding: '12px 30px', fontSize: '16px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
          🏠 返回首页
        </button>
      </div>
    </div>
  );
}

export default function Logs() {
  return <BrowserOnly fallback={<div style={{ textAlign: 'center', padding: '50px' }}>加载中...</div>}>{() => <LogsPage />}</BrowserOnly>;
}