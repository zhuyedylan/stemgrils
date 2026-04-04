import React, { useState, useEffect, useRef } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import { redirect } from '@docusaurus/router';

function WYSIWYGEditor() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [content, setContent] = useState('');
  const [filePath, setFilePath] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [originalContent, setOriginalContent] = useState('');
  const [renderedContent, setRenderedContent] = useState('');
  const [editableFiles, setEditableFiles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [currentCategory, setCurrentCategory] = useState('');
  const [user, setUser] = useState(null);
  const editorRef = useRef(null);

  useEffect(() => {
    // 检查登录状态
    const savedUser = localStorage.getItem('stem_user');
    if (!savedUser) {
      // 未登录，跳转到登录页
      window.location.href = '/login';
      return;
    }
    const userData = JSON.parse(savedUser);
    setUser(userData);
    setIsLoggedIn(true);
    loadCategories();
    fetch('/api/files')
      .then(res => res.json())
      .then(files => {
        setEditableFiles(files);
        if (files.length > 0) {
          setFilePath(files[0].path);
          loadFile(files[0].path);
        }
      });
  }, []);

  // 加载目录列表
  const loadCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      const data = await response.json();
      setCategories(data.sort((a, b) => a.order - b.order));
    } catch (error) {
      console.error('加载目录失败:', error);
    }
  };

  // 加载文档所属目录
  const loadDocCategory = async (fileName) => {
    try {
      const response = await fetch(`/api/doc-category?fileName=${encodeURIComponent(fileName)}`);
      const data = await response.json();
      setCurrentCategory(data.category);
    } catch (error) {
      console.error('加载文档目录失败:', error);
    }
  };

  // 简单的 Markdown 转 HTML 转换器
  const parseMarkdown = (text) => {
    if (!text) return '';
    let html = text;
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;height:auto;">');
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');
    html = '<p>' + html + '</p>';
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p><br>/g, '<p>');
    html = html.replace(/<br><\/p>/g, '</p>');
    return html;
  };

  const loadFile = async (docPath) => {
    try {
      // 使用 API 读取原始 md 文件
      const response = await fetch(`/api/read?filePath=${encodeURIComponent(docPath)}`);
      if (response.ok) {
        const data = await response.json();
        const text = data.content;
        const withoutFrontmatter = text.replace(/^---[\s\S]*?---\n/, '');
        const rendered = parseMarkdown(withoutFrontmatter);
        setContent(withoutFrontmatter);
        setRenderedContent(rendered);
        setOriginalContent(rendered);
        setHasChanges(false);
        setMessage('文件已加载');

        // 加载文档所属目录
        const fileName = docPath.split('/').pop();
        loadDocCategory(fileName);

        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.innerHTML = rendered;
          }
        }, 100);
      } else {
        setMessage('文件不存在: ' + docPath);
      }
    } catch (error) {
      setMessage('加载文件失败: ' + error.message);
    }
  };

  const handleFileChange = (e) => {
    const newPath = e.target.value;
    if (hasChanges) {
      const confirmSwitch = window.confirm('您有未保存的更改，确定要切换文件吗？');
      if (!confirmSwitch) return;
    }
    setFilePath(newPath);
    loadFile(newPath);
  };

  const execCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      setRenderedContent(newContent);
      setHasChanges(newContent !== originalContent);
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      setRenderedContent(newContent);
      setHasChanges(newContent !== originalContent);
    }
  };

  // 检查用户是否有权限编辑该文件
  const canEdit = (file) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return file.uploader === user.username;
  };

  // 获取当前文件的上传者信息
  const currentFile = editableFiles.find(f => f.path === filePath);
  const isCurrentFileEditable = canEdit(currentFile || {});

  // 处理图片上传
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    fetch('/api/upload-image', {
      method: 'POST',
      body: formData
    })
    .then(res => res.json())
    .then(data => {
      if (data.url) {
        // 在光标位置插入图片
        const editor = editorRef.current;
        if (editor) {
          const selection = window.getSelection();
          let inserted = false;

          // 如果有选中的范围，尝试在选区中插入
          if (selection.rangeCount > 0 && selection.getRangeAt(0).toString().length === 0) {
            const range = selection.getRangeAt(0);
            const img = document.createElement('img');
            img.src = data.url;
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            img.alt = '上传的图片';

            range.deleteContents();
            range.insertNode(img);

            // 插入后移动光标到图片后面
            range.setStartAfter(img);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
            inserted = true;
          }

          // 如果没有成功插入，直接添加到编辑器末尾并提示
          if (!inserted) {
            const img = document.createElement('img');
            img.src = data.url;
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            img.alt = '上传的图片';
            editor.appendChild(img);
          }

          // 触发内容更新
          handleInput();
        }
        setMessage('✅ 图片上传成功');
      } else {
        setMessage('❌ 上传失败: ' + data.error);
      }
    })
    .catch(err => {
      setMessage('❌ 上传失败: ' + err.message);
    });

    // 清空输入框，以便可以重复选择同一张图片
    e.target.value = '';
  };

  // 处理文件重命名
  const handleRename = async () => {
    if (!currentFile) return;
    const oldName = currentFile.label;
    const newName = prompt('请输入新的文件名:', oldName);
    if (!newName || newName === oldName) return;

    try {
      const response = await fetch('/api/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldName,
          newName,
          username: user.username,
          role: user.role
        })
      });
      const result = await response.json();
      if (result.success) {
        setMessage('✅ 文件已重命名，正在重新构建...');
        await fetch('/api/rebuild', { method: 'POST' });
        setMessage('✅ 重命名成功！页面将刷新...');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setMessage('重命名失败: ' + result.error);
      }
    } catch (error) {
      setMessage('重命名失败: ' + error.message);
    }
  };

  const handleDelete = async () => {
    if (!currentFile) return;
    if (!confirm(`确定要删除 "${currentFile.label}" 吗？此操作不可恢复！`)) return;
    if (!confirm(`再次确认：确实要删除 "${currentFile.label}" 吗？`)) return;

    try {
      const response = await fetch('/api/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: currentFile.label,
          username: user.username,
          role: user.role
        })
      });
      const result = await response.json();
      if (result.success) {
        setMessage('✅ 文件已删除，正在重新构建...');
        await fetch('/api/rebuild', { method: 'POST' });
        setMessage('✅ 删除成功！页面将刷新...');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setMessage('删除失败: ' + result.error);
      }
    } catch (error) {
      setMessage('删除失败: ' + error.message);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const editor = editorRef.current;
    if (!editor) { setSaving(false); return; }

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

    try {
      const saveResponse = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: fileName, content: fullContent })
      });
      const saveResult = await saveResponse.json();
      if (saveResult.success) {
        setMessage('✅ 文件已保存，正在重新构建...');
        await fetch('/api/rebuild', { method: 'POST' });
        setMessage('✅ 保存成功！页面将刷新...');
        setHasChanges(false);
        setOriginalContent(editor.innerHTML);
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setMessage('保存失败: ' + saveResult.error);
      }
    } catch (error) {
      setMessage('保存失败: ' + error.message);
    }
    setSaving(false);
  };

  if (!isLoggedIn) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>正在跳转...</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>📝 所见即所得编辑器</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => window.location.href = '/'} style={{ padding: '8px 20px', fontSize: '14px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
            🏠 返回首页
          </button>
          {isCurrentFileEditable && currentFile && (
            <>
              <button onClick={handleRename} style={{ padding: '8px 20px', fontSize: '14px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                ✏️ 重命名
              </button>
              <button onClick={handleDelete} style={{ padding: '8px 20px', fontSize: '14px', backgroundColor: '#e53e3e', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                🗑️ 删除文件
              </button>
            </>
          )}
        </div>
      </div>

      {!isCurrentFileEditable && currentFile && (
        <div style={{ padding: '10px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '5px', marginBottom: '15px' }}>
          ⚠️ 您只能编辑自己上传的文件，或让管理员帮您编辑
        </div>
      )}

      <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <label>📄 选择文件：</label>
        <select value={filePath} onChange={handleFileChange} style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ddd', minWidth: '300px' }}>
          {editableFiles.map(f => (<option key={f.path} value={f.path}>{f.label}</option>))}
        </select>

        {isCurrentFileEditable && (
          <>
            <label style={{ marginLeft: '15px' }}>📁 移动到：</label>
            <select
              value={currentCategory}
              onChange={async (e) => {
                const newCategory = e.target.value;
                if (!confirm(`确定要将文档移动到 "${categories.find(c => c.id === newCategory)?.name}" 吗？`)) return;
                try {
                  await fetch('/api/doc-category', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fileName: currentFile?.label, category: newCategory })
                  });
                  setCurrentCategory(newCategory);
                  setMessage('✅ 文档已移动到新目录');
                  await fetch('/api/rebuild', { method: 'POST' });
                } catch (error) {
                  setMessage('移动失败: ' + error.message);
                }
              }}
              style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ddd' }}
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </>
        )}

        <span style={{ color: hasChanges ? '#e53e3e' : '#666', fontSize: '14px', marginLeft: 'auto' }}>
          {hasChanges ? '⚠️ 有未保存的更改' : ''}
        </span>
      </div>

      <div style={{ position: 'sticky', top: '10px', zIndex: 100, marginBottom: '10px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '8px', display: 'flex', gap: '5px', flexWrap: 'wrap', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
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
        <span style={{ width: '1px', backgroundColor: '#ddd', margin: '0 5px' }}></span>
        <label style={toolButtonStyle} title="上传图片">
          📁 图片
          <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
        </label>
      </div>

      <div ref={editorRef} id="wysiwyg-editor" contentEditable onInput={handleInput} style={{ minHeight: '500px', padding: '20px', border: '2px solid #10b981', borderRadius: '8px', backgroundColor: 'white', fontSize: '16px', lineHeight: '1.8', outline: 'none', color: '#1f2937', fontFamily: 'Inter, -apple-system, sans-serif' }} />

      <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
        <button onClick={handleSave} disabled={saving || !isCurrentFileEditable} style={{ padding: '12px 40px', fontSize: '18px', backgroundColor: isCurrentFileEditable ? '#10b981' : '#ccc', color: 'white', border: 'none', borderRadius: '8px', cursor: isCurrentFileEditable ? 'pointer' : 'not-allowed', fontWeight: 'bold' }}>
          {saving ? '保存中...' : '💾 保存'}
        </button>
        {message && <span style={{ color: '#10b981', fontSize: '16px' }}>{message}</span>}
      </div>
    </div>
  );
}

const toolButtonStyle = { padding: '8px 12px', backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '5px', cursor: 'pointer', fontSize: '14px' };

export default function Editor() {
  return <BrowserOnly fallback={<div style={{ textAlign: 'center', padding: '50px' }}>加载中...</div>}>{() => <WYSIWYGEditor />}</BrowserOnly>;
}