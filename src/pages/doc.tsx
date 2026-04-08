import React, { useState, useEffect } from 'react';
import { useLocation } from '@docusaurus/router';
import BrowserOnly from '@docusaurus/BrowserOnly';

const supabaseUrl = 'https://jyhmhksdpjkzkhqlkuqh.supabase.co';
const supabaseKey = 'sb_publishable_a0zC2QDTxicG-HbxojKkTQ_medLD1JW';

function DocViewer() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const location = useLocation();

  useEffect(() => {
    // 从 URL 获取文件名
    const path = location.pathname;
    // 支持 /docs/文件名 或 /doc/文件名 格式
    const match = path.match(/^\/(?:docs|doc)\/(.+)$/);
    if (!match) {
      setError('无效的文档路径');
      setLoading(false);
      return;
    }

    const fileName = decodeURIComponent(match[1]);

    // 从 API 获取内容
    fetch(`/api/read?filePath=${encodeURIComponent(fileName + '.md')}`)
      .then(res => {
        if (!res.ok) throw new Error('文档不存在或未发布');
        return res.json();
      })
      .then(data => {
        setContent(data.content || '');
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [location.pathname]);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '24px', marginBottom: '10px' }}>⏳ 加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>📄</div>
        <h2>文档加载失败</h2>
        <p style={{ color: '#666' }}>{error}</p>
        <a href="/" style={{ color: '#10b981' }}>← 返回首页</a>
      </div>
    );
  }

  // 解析 frontmatter
  let title = '';
  let bodyContent = content;
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];
    const titleMatch = frontmatter.match(/title:\s*(.+)/);
    if (titleMatch) title = titleMatch[1].trim();
    bodyContent = content.slice(frontmatterMatch[0].length);
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      {title && <h1>{title}</h1>}
      <div
        style={{ lineHeight: '1.8', fontSize: '16px' }}
        dangerouslySetInnerHTML={{ __html: bodyContent
          .replace(/^### (.*$)/gm, '<h3>$1</h3>')
          .replace(/^## (.*$)/gm, '<h2>$1</h2>')
          .replace(/^# (.*$)/gm, '<h1>$1</h1>')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/\n\n/g, '</p><p>')
          .replace(/!\[(.*?)\]\((.*?)\)/g, '<img alt="$1" src="$2" style="max-width:100%" />')
          .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')
          .replace(/\|(.+)\|/g, (match) => {
            const cells = match.split('|').filter(c => c.trim());
            if (cells.some(c => c.includes('---'))) return '';
            return '<tr>' + cells.map(c => `<td>${c.trim()}</td>`).join('') + '</tr>';
          })
        }}
      />
    </div>
  );
}

export default function DocPage() {
  return (
    <BrowserOnly fallback={<div>加载中...</div>}>
      {() => <DocViewer />}
    </BrowserOnly>
  );
}

// 配置文档路径
DocPage.path = 'docs/:slug*';