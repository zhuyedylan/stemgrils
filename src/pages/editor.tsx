import React, { useState } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';

function EditorComponent() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [content, setContent] = useState('');
  const [filePath, setFilePath] = useState('docs/咖啡渣和PLA再生打印线材工艺指南-朱可人.md');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const CORRECT_PASSWORD = '2014';

  // 可编辑的文件列表
  const editableFiles = [
    'docs/咖啡渣和PLA再生打印线材工艺指南-朱可人.md',
    'docs/project-intro.md',
  ];

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === CORRECT_PASSWORD) {
      setIsAuthenticated(true);
      loadFile(filePath);
    } else {
      setMessage('密码错误，请重试');
    }
  };

  const loadFile = async (path) => {
    try {
      const response = await fetch(`/${path}`);
      const text = await response.text();
      // 移除 frontmatter
      const withoutFrontmatter = text.replace(/^---[\s\S]*?---\n/, '');
      setContent(withoutFrontmatter);
    } catch (error) {
      setMessage('加载文件失败');
    }
  };

  const handleFileChange = (e) => {
    setFilePath(e.target.value);
    loadFile(e.target.value);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('保存功能需要配置 Gitee Token，请手动下载文件');

    // 生成下载
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filePath.split('/').pop();
    a.click();
    URL.revokeObjectURL(url);

    setSaving(false);
  };

  if (!isAuthenticated) {
    return (
      <div style={{ maxWidth: '400px', margin: '50px auto', textAlign: 'center' }}>
        <h2>文档编辑器</h2>
        <p>请输入密码访问</p>
        <form onSubmit={handleLogin}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="请输入密码"
            style={{ padding: '10px', fontSize: '16px', width: '200px', marginRight: '10px' }}
          />
          <button
            type="submit"
            style={{ padding: '10px 20px', fontSize: '16px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '5px' }}
          >
            进入
          </button>
        </form>
        {message && <p style={{ color: 'red' }}>{message}</p>}
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>文档编辑器</h2>

      <div style={{ marginBottom: '20px' }}>
        <label>选择文件：</label>
        <select value={filePath} onChange={handleFileChange} style={{ padding: '5px', marginLeft: '10px' }}>
          {editableFiles.map(f => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        style={{
          width: '100%',
          height: '500px',
          padding: '10px',
          fontFamily: 'monospace',
          fontSize: '14px',
          border: '1px solid #ddd',
          borderRadius: '5px'
        }}
      />

      <div style={{ marginTop: '20px' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '10px 30px',
            fontSize: '16px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          {saving ? '保存中...' : '保存'}
        </button>
        {message && <span style={{ marginLeft: '20px', color: '#666' }}>{message}</span>}
      </div>
    </div>
  );
}

export default function Editor() {
  return (
    <BrowserOnly fallback={<div>加载中...</div>}>
      {() => <EditorComponent />}
    </BrowserOnly>
  );
}