import React, { useState, useEffect } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';

declare global {
  interface Window {
    SUPABASE_URL?: string;
    SUPABASE_KEY?: string;
  }
}

function VisitorsPage() {
  const SUPABASE_URL = window.SUPABASE_URL || 'https://jyhmhksdpjkzkhqlkuqh.supabase.co';
  const SUPABASE_KEY = window.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5aG1oa3NkcGpremtocWxrdXFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMDEwNTYsImV4cCI6MjA5MDg3NzA1Nn0.e5iYCkY-UNumjWWnsPugc5nIUKOkITccuhODLPBCiwc';

  const [visitors, setVisitors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({ total: 0, countries: {}, pages: {} });

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

    loadVisitors();
  }, []);

  const loadVisitors = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/visitors?order=created_at.desc&limit=500`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      const data = await response.json();
      setVisitors(data);

      // 计算统计
      const total = data.length;
      const countries: Record<string, number> = {};
      const pages: Record<string, number> = {};
      data.forEach((v: any) => {
        if (v.country) {
          countries[v.country] = (countries[v.country] || 0) + 1;
        }
        if (v.page) {
          pages[v.page] = (pages[v.page] || 0) + 1;
        }
      });
      setStats({ total, countries, pages });
    } catch (error) {
      console.error('加载访客记录失败:', error);
    }
    setLoading(false);
  };

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
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2>👥 访客记录</h2>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        查看网站访问者的 IP 地址和地理位置信息。
      </p>

      {/* 统计概览 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
        <div style={{ padding: '15px', backgroundColor: '#10b981', color: 'white', borderRadius: '8px' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{stats.total}</div>
          <div style={{ fontSize: '14px' }}>总访问量</div>
        </div>
        <div style={{ padding: '15px', backgroundColor: '#3b82f6', color: 'white', borderRadius: '8px' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{Object.keys(stats.countries).length}</div>
          <div style={{ fontSize: '14px' }}>访问国家数</div>
        </div>
        <div style={{ padding: '15px', backgroundColor: '#f59e0b', color: 'white', borderRadius: '8px' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{Object.keys(stats.pages).length}</div>
          <div style={{ fontSize: '14px' }}>访问页面数</div>
        </div>
      </div>

      {/* 国家分布 */}
      {Object.keys(stats.countries).length > 0 && (
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
          <h4 style={{ marginBottom: '10px' }}>🌍 国家分布</h4>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {Object.entries(stats.countries)
              .sort((a: any, b: any) => b[1] - a[1])
              .slice(0, 10)
              .map(([country, count]: any) => (
                <span key={country} style={{ padding: '5px 10px', backgroundColor: '#e5e7eb', borderRadius: '4px', fontSize: '13px' }}>
                  {country}: {count}
                </span>
              ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: '15px' }}>
        <button onClick={loadVisitors} style={{ padding: '8px 16px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          🔄 刷新
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px' }}>加载中...</div>
      ) : visitors.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px', color: '#666' }}>
          暂无访客记录
          <p style={{ fontSize: '13px', marginTop: '10px' }}>
            提示：需要先在 Supabase 中创建 visitors 表
          </p>
        </div>
      ) : (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>时间</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>IP</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>国家</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>地区</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>城市</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>页面</th>
              </tr>
            </thead>
            <tbody>
              {visitors.map((v, idx) => (
                <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#f9fafb' }}>
                  <td style={{ padding: '10px', fontSize: '13px', color: '#6b7280' }}>{formatTime(v.created_at)}</td>
                  <td style={{ padding: '10px' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '13px' }}>{v.ip}</span>
                  </td>
                  <td style={{ padding: '10px' }}>{v.country || '-'}</td>
                  <td style={{ padding: '10px' }}>{v.region || '-'}</td>
                  <td style={{ padding: '10px' }}>{v.city || '-'}</td>
                  <td style={{ padding: '10px', fontSize: '13px', color: '#6b7280' }}>{v.page || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
        <button onClick={() => window.location.href = '/admin'} style={{ padding: '12px 30px', fontSize: '16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
          ⚙️ 系统管理
        </button>
        <button onClick={() => window.location.href = '/'} style={{ padding: '12px 30px', fontSize: '16px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
          🏠 返回首页
        </button>
      </div>
    </div>
  );
}

export default function Visitors() {
  return <BrowserOnly fallback={<div style={{ textAlign: 'center', padding: '50px' }}>加载中...</div>}>{() => <VisitorsPage />}</BrowserOnly>;
}