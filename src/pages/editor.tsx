import React, { useState, useEffect, useRef } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';

function WYSIWYGEditor() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [content, setContent] = useState('');
  const [filePath, setFilePath] = useState('docs/咖啡渣和PLA再生打印线材工艺指南-朱可人');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [originalContent, setOriginalContent] = useState('');
  const [renderedContent, setRenderedContent] = useState('');
  const editorRef = useRef(null);

  const CORRECT_PASSWORD = '2014';

  // 可编辑的文件列表
  const editableFiles = [
    { path: 'docs/咖啡渣和PLA再生打印线材工艺指南-朱可人', label: '咖啡渣和PLA再生打印线材工艺指南-朱可人' },
    { path: 'docs/project-intro', label: '项目简介' },
  ];

  // 简单的 Markdown 转 HTML 转换器
  const parseMarkdown = (text) => {
    if (!text) return '';

    let html = text;

    // 处理标题
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // 处理加粗
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // 处理斜体
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // 处理换行（空行分段）
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');

    // 包裹在段落中
    html = '<p>' + html + '</p>';

    // 清理空段落
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p><br>/g, '<p>');
    html = html.replace(/<br><\/p>/g, '</p>');

    return html;
  };

  // 加载文件内容
  const loadFile = async (docPath) => {
    try {
      const mdPath = `${docPath}.md`;
      const response = await fetch(`/${mdPath}`);

      if (response.ok) {
        const text = await response.text();
        // 移除 frontmatter
        const withoutFrontmatter = text.replace(/^---[\s\S]*?---\n/, '');

        // 解析 Markdown 为 HTML
        const rendered = parseMarkdown(withoutFrontmatter);

        setContent(withoutFrontmatter);
        setRenderedContent(rendered);
        setOriginalContent(rendered);
        setHasChanges(false);
        setMessage('文件已加载');

        // 延迟更新 editor 内容，确保 DOM 已渲染
        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.innerHTML = rendered;
          }
        }, 100);
      } else {
        setMessage('文件不存在: ' + mdPath);
      }
    } catch (error) {
      setMessage('加载文件失败: ' + error.message);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadFile(filePath);
    }
  }, [isAuthenticated, filePath]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === CORRECT_PASSWORD) {
      setIsAuthenticated(true);
      if (filePath) {
        loadFile(filePath);
      }
    } else {
      setMessage('密码错误，请重试');
    }
  };

  const handleFileChange = (e) => {
    const newPath = e.target.value;

    if (hasChanges) {
      const confirmSwitch = window.confirm('您有未保存的更改，确定要切换文件吗？\n\n点击"确定"将放弃当前更改\n点击"取消"将留在当前文件');
      if (!confirmSwitch) {
        return;
      }
    }

    setFilePath(newPath);
  };

  // 执行富文本命令
  const execCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    // 更新内容
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      setRenderedContent(newContent);
      setHasChanges(newContent !== originalContent);
    }
  };

  // 处理内容变化
  const handleInput = () => {
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      setRenderedContent(newContent);
      setHasChanges(newContent !== originalContent);
    }
  };

  // 保存功能
  const handleSave = () => {
    setSaving(true);

    // 将 HTML 转换回简单 Markdown
    const editor = editorRef.current;
    if (!editor) {
      setSaving(false);
      return;
    }

    let html = editor.innerHTML;
    let markdown = html
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
      .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
      .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
      .replace(/<div[^>]*>(.*?)<\/div>/gi, '$1\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/\n{3,}/g, '\n\n');

    const fileName = filePath.split('/').pop() + '.md';
    const fullContent = `---
id: ${fileName.replace('.md', '')}
title: ${fileName.replace('.md', '')}
---

${markdown}`;

    const blob = new Blob([fullContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);

    setMessage('文件已下载，请手动上传到 Gitee');
    setSaving(false);
    setHasChanges(false);
    setOriginalContent(editor.innerHTML);
  };

  if (!isAuthenticated) {
    return (
      <div style={{ maxWidth: '400px', margin: '50px auto', textAlign: 'center', padding: '20px' }}>
        <h2>文档编辑器</h2>
        <p>请输入密码访问</p>
        <form onSubmit={handleLogin}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="请输入密码"
            style={{ padding: '10px', fontSize: '16px', width: '200px', marginRight: '10px', border: '1px solid #ddd', borderRadius: '5px' }}
          />
          <button
            type="submit"
            style={{ padding: '10px 20px', fontSize: '16px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
          >
            进入
          </button>
        </form>
        {message && <p style={{ color: 'red', marginTop: '10px' }}>{message}</p>}
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <h2>📝 所见即所得编辑器</h2>

      {/* 文件选择 */}
      <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <label>📄 选择文件：</label>
        <select
          value={filePath}
          onChange={handleFileChange}
          style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ddd', minWidth: '300px' }}
        >
          {editableFiles.map(f => (
            <option key={f.path} value={f.path}>{f.label}</option>
          ))}
        </select>
        <span style={{ color: hasChanges ? '#e53e3e' : '#666', fontSize: '14px' }}>
          {hasChanges ? '⚠️ 有未保存的更改' : '（切换文件会提示保存）'}
        </span>
      </div>

      {/* 工具栏 */}
      <div style={{
        marginBottom: '10px',
        padding: '10px',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        display: 'flex',
        gap: '5px',
        flexWrap: 'wrap'
      }}>
        <button onClick={() => execCommand('bold')} style={toolButtonStyle} title="粗体">🔵 <b>B</b></button>
        <button onClick={() => execCommand('italic')} style={toolButtonStyle} title="斜体">🔵 <i>I</i></button>
        <button onClick={() => execCommand('underline')} style={toolButtonStyle} title="下划线">🔵 <u>U</u></button>
        <span style={{ width: '1px', backgroundColor: '#ddd', margin: '0 5px' }}></span>
        <button onClick={() => execCommand('formatBlock', 'h1')} style={toolButtonStyle} title="标题1">标题1</button>
        <button onClick={() => execCommand('formatBlock', 'h2')} style={toolButtonStyle} title="标题2">标题2</button>
        <button onClick={() => execCommand('formatBlock', 'h3')} style={toolButtonStyle} title="标题3">标题3</button>
        <span style={{ width: '1px', backgroundColor: '#ddd', margin: '0 5px' }}></span>
        <button onClick={() => execCommand('insertUnorderedList')} style={toolButtonStyle} title="无序列表">• 列表</button>
        <button onClick={() => execCommand('insertOrderedList')} style={toolButtonStyle} title="有序列表">1. 列表</button>
      </div>

      {/* 编辑器 - 使用与网站一致的样式 */}
      <div
        ref={editorRef}
        id="wysiwyg-editor"
        contentEditable
        onInput={handleInput}
        style={{
          minHeight: '500px',
          padding: '20px',
          border: '2px solid #10b981',
          borderRadius: '8px',
          backgroundColor: 'white',
          fontSize: '16px',
          lineHeight: '1.8',
          outline: 'none',
          // 添加与网站一致的样式
          color: '#1f2937',
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      />

      {/* 保存按钮 */}
      <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '12px 40px',
            fontSize: '18px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          {saving ? '保存中...' : '💾 保存'}
        </button>
        {message && <span style={{ color: '#10b981', fontSize: '16px' }}>{message}</span>}
      </div>

      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#fff3cd', borderRadius: '8px', fontSize: '14px', color: '#856404' }}>
        💡 提示：编辑完成后点击"保存"按钮，会下载修改后的 .md 文件。请将下载的文件上传到 Gitee 以更新网站。
      </div>
    </div>
  );
}

const toolButtonStyle = {
  padding: '8px 12px',
  backgroundColor: 'white',
  border: '1px solid #ddd',
  borderRadius: '5px',
  cursor: 'pointer',
  fontSize: '14px'
};

export default function Editor() {
  return (
    <BrowserOnly fallback={<div style={{ textAlign: 'center', padding: '50px' }}>加载编辑器中...</div>}>
      {() => <WYSIWYGEditor />}
    </BrowserOnly>
  );
}