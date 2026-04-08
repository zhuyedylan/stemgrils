import React, { useState, useEffect } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { useLocation } from '@docusaurus/router';
import BrowserOnly from '@docusaurus/BrowserOnly';
import Layout from '@theme/Layout';

const supabaseUrl = 'https://jyhmhksdpjkzkhqlkuqh.supabase.co';
const supabaseKey = 'sb_publishable_a0zC2QDTxicG-HbxojKkTQ_medLD1JW';

function DocContent() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    const match = path.match(/^\/(?:docs|doc)\/(.+)$/);
    if (!match) {
      setError('无效的文档路径');
      setLoading(false);
      return;
    }

    const fileName = decodeURIComponent(match[1]);

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

  // 简单的 markdown 转 HTML
  const renderMarkdown = (text) => {
    if (!text) return '';

    let html = text
      .replace(/^#### (.*$)/gm, '<h4>$1</h4>')
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/!\[(.*?)\]\((.*?)\)/g, '<img alt="$1" src="$2" style="max-width:100%;height:auto" />')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')
      .replace(/\n/g, '<br/>');

    return html;
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '24px' }}>⏳ 加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>📄</div>
        <h2>文档加载失败</h2>
        <p style={{ color: '#666' }}>{error}</p>
        <a href="/">← 返回首页</a>
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
    <div style={{ padding: '20px' }}>
      {title && <h1>{title}</h1>}
      <div
        style={{ lineHeight: '1.8', fontSize: '16px' }}
        dangerouslySetInnerHTML={{ __html: renderMarkdown(bodyContent) }}
      />
    </div>
  );
}

export default function DocPage() {
  const { siteConfig } = useDocusaurusContext();
  const location = useLocation();

  // 从路径获取标题
  const match = location.pathname.match(/^\/(?:docs|doc)\/(.+)$/);
  const title = match ? decodeURIComponent(match[1]) : '文档';

  return (
    <Layout title={title} description={siteConfig.tagline}>
      <main>
        <BrowserOnly fallback={<div style={{padding:'40px',textAlign:'center'}}>加载中...</div>}>
          {() => <DocContent />}
        </BrowserOnly>
      </main>
    </Layout>
  );
}