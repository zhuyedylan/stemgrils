import React, { useState, useEffect, useRef } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import { redirect } from '@docusaurus/router';

// Supabase 配置
const SUPABASE_URL = 'https://jyhmhksdpjkzkhqlkuqh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5aG1oa3NkcGpremtocWxrdXFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMDEwNTYsImV4cCI6MjA5MDg3NzA1Nn0.e5iYCkY-UNumjWWnsPugc5nIUKOkITccuhODLPBCiwc';

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
  const [currentDoc, setCurrentDoc] = useState(null);
  const [docStatus, setDocStatus] = useState('');
  const [rejectModal, setRejectModal] = useState(null);
  const [savedSelection, setSavedSelection] = useState(null); // 保存的选区位置
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
    loadFiles();
  }, []);

  // 加载目录列表 - 直接从 Supabase 获取
  const loadCategories = async () => {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/categories?order=order.asc`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });
      const data = await response.json();
      setCategories(data.sort((a, b) => a.order - b.order));
    } catch (error) {
      console.error('加载目录失败:', error);
    }
  };

  // 加载文件列表 - 直接从 Supabase 获取
  const loadFiles = async () => {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/documents?select=filename,content,category,approved,hidden,uploader&order=created_at.desc`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });
      const docs = await response.json();
      const files = docs.map(doc => ({
        path: doc.filename,
        label: doc.filename,
        category: doc.category,
        approved: doc.approved,
        hidden: doc.hidden,
        uploader: doc.uploader
      }));
      setEditableFiles(files);

      // 检查 URL 参数中是否指定了文件
      const params = new URLSearchParams(window.location.search);
      const fileParam = params.get('file');
      const targetFile = fileParam ? files.find(f => f.path === fileParam) : files[0];
      if (targetFile) {
        setFilePath(targetFile.path);
        loadFile(targetFile.path);
      }
    } catch (error) {
      console.error('加载文件列表失败:', error);
      setMessage('加载文件列表失败');
    }
  };

  // 加载文档所属目录
  const loadDocCategory = async (docPath) => {
    try {
      const fileName = docPath.split('/').pop().replace('.md', '');

      const response = await fetch(`${SUPABASE_URL}/rest/v1/documents?filename=eq.${encodeURIComponent(fileName)}&select=category`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      const data = await response.json();
      if (data && data.length > 0) {
        setCurrentCategory(data[0].category || '');
      }
    } catch (error) {
      console.error('加载文档目录失败:', error);
    }
  };

  // 简单的 Markdown 转 HTML 转换器
  const parseMarkdown = (text) => {
    if (!text) return '';
    let html = text;

    // 先保护表格内容，避免被后续处理破坏
    const tablePlaceholder = '___TABLE_PLACEHOLDER___';
    const tablePlaceholders: Array<{ placeholder: string; content: string }> = [];
    let tableIndex = 0;

    html = html.replace(/<table[^>]*>[\s\S]*?<\/table>/gi, (match) => {
      const placeholder = `${tablePlaceholder}${tableIndex}___`;
      tablePlaceholders.push({ placeholder, content: match });
      tableIndex++;
      return placeholder;
    });

    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;height:auto;">');
    html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
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

    // 恢复表格内容
    for (const { placeholder, content } of tablePlaceholders) {
      html = html.replace(new RegExp(`<p>${placeholder}</p>|${placeholder}`, 'g'), content);
    }

    return html;
  };

  const loadFile = async (docPath) => {
    try {
      // 直接从 Supabase 获取文档内容
      const fileName = docPath.split('/').pop().replace('.md', '');
      const response = await fetch(`${SUPABASE_URL}/rest/v1/documents?filename=eq.${encodeURIComponent(fileName)}&select=content,category,approved,hidden,rejection_reason`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });

      if (response.ok) {
        const docs = await response.json();
        if (docs && docs.length > 0) {
          const doc = docs[0];
          const text = doc.content || '';
          const withoutFrontmatter = text.replace(/^---[\s\S]*?---\n/, '');
          const rendered = parseMarkdown(withoutFrontmatter);
          setContent(withoutFrontmatter);
          setRenderedContent(rendered);
          setOriginalContent(rendered);
          setHasChanges(false);
          setMessage('文件已加载');

          // 设置文档分类
          setCurrentCategory(doc.category || '');

          // 设置文档审批状态
          setCurrentDoc(doc);
          if (doc.hidden && doc.rejection_reason) {
            setDocStatus('已拒绝');
          } else if (doc.hidden) {
            setDocStatus('已隐藏');
          } else if (doc.approved) {
            setDocStatus('已公开');
          } else {
            setDocStatus('待审批');
          }

          setTimeout(() => {
            if (editorRef.current) {
              editorRef.current.innerHTML = rendered;
            }
          }, 100);
        } else {
          setMessage('文件不存在: ' + docPath);
        }
      } else {
        setMessage('加载文件失败');
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

  // 处理图片上传 - 直接上传到 Supabase Storage
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 保存当前选区（在点击上传按钮前）
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      setSavedSelection({
        startContainer: range.startContainer,
        startOffset: range.startOffset,
        endContainer: range.endContainer,
        endOffset: range.endOffset
      });
    }

    try {
      // 生成唯一文件名
      const fileName = `editor-${Date.now()}-${file.name}`;

      // 读取文件为 ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      // 上传到 Supabase Storage
      const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/images/${fileName}`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': file.type,
          'x-upsert': 'true',
        },
        body: bytes,
      });

      if (uploadRes.ok) {
        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/images/${fileName}`;

        // 在光标位置插入图片
        const editor = editorRef.current;
        if (editor) {
          // 先让编辑器获得焦点
          editor.focus();

          // 尝试恢复之前的选区
          if (savedSelection) {
            try {
              const newRange = document.createRange();
              newRange.setStart(savedSelection.startContainer, savedSelection.startOffset);
              newRange.setEnd(savedSelection.endContainer, savedSelection.endOffset);
              selection.removeAllRanges();
              selection.addRange(newRange);
            } catch (err) {
              // 如果恢复失败，使用编辑器的默认位置
              console.log('无法恢复选区，使用默认位置');
            }
          }

          // 创建图片元素
          const img = document.createElement('img');
          img.src = publicUrl;
          img.style.maxWidth = '100%';
          img.style.height = 'auto';
          img.alt = '上传的图片';

          // 获取当前选区并插入图片
          if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(img);

            // 移动光标到图片后面
            range.setStartAfter(img);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
          } else {
            // 如果没有选区，添加到编辑器末尾
            editor.appendChild(img);
          }

          // 触发内容更新
          handleInput();
        }
        setMessage('✅ 图片上传成功');
      } else {
        setMessage('❌ 上传失败');
      }
    } catch (err) {
      setMessage('❌ 上传失败: ' + err.message);
    }

    // 清空输入框和保存的选区
    e.target.value = '';
    setSavedSelection(null);
  };

  // 处理文件重命名 - 直接更新 Supabase
  const handleRename = async () => {
    if (!currentFile) return;
    const oldName = currentFile.label;
    const newName = prompt('请输入新的文件名:', oldName);
    if (!newName || newName === oldName) return;

    try {
      // 更新 Supabase 中的文档
      const response = await fetch(`${SUPABASE_URL}/rest/v1/documents?filename=eq.${encodeURIComponent(oldName)}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          filename: newName,
          updated_at: new Date().toISOString()
        })
      });

      if (response.ok) {
        setMessage('✅ 重命名成功！页面将刷新...');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        const errText = await response.text();
        setMessage('重命名失败: ' + errText);
      }
    } catch (error) {
      setMessage('重命名失败: ' + error.message);
    }
  };

  // 删除文件 - 直接从 Supabase 删除
  const handleDelete = async () => {
    if (!currentFile) return;
    if (!confirm(`确定要删除 "${currentFile.label}" 吗？此操作不可恢复！`)) return;
    if (!confirm(`再次确认：确实要删除 "${currentFile.label}" 吗？`)) return;

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/documents?filename=eq.${encodeURIComponent(currentFile.label)}`, {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'return=minimal'
        }
      });

      if (response.ok) {
        setMessage('✅ 删除成功！页面将刷新...');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        const errText = await response.text();
        setMessage('删除失败: ' + errText);
      }
    } catch (error) {
      setMessage('删除失败: ' + error.message);
    }
  };

  // 审批通过
  const handleApprove = async () => {
    if (!currentFile) return;
    const filename = currentFile.label;

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/documents?filename=eq.${encodeURIComponent(filename)}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          approved: true,
          hidden: false,
          rejection_reason: null,
          approval_date: new Date().toISOString()
        })
      });

      if (response.ok) {
        setMessage('✅ 审批通过！');
        setDocStatus('已公开');
        loadFiles(); // 刷新文件列表
      } else {
        setMessage('❌ 操作失败');
      }
    } catch (error) {
      setMessage('❌ 操作失败: ' + error.message);
    }
  };

  // 拒绝
  const handleReject = () => {
    setRejectModal({ filename: currentFile.label, reason: '' });
  };

  const confirmReject = async () => {
    if (!rejectModal) return;

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/documents?filename=eq.${encodeURIComponent(rejectModal.filename)}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          approved: false,
          hidden: true,
          rejection_reason: rejectModal.reason || '不符合要求'
        })
      });

      if (response.ok) {
        setMessage('❌ 已拒绝');
        setDocStatus('已拒绝');
        setRejectModal(null);
      } else {
        setMessage('❌ 操作失败');
      }
    } catch (error) {
      setMessage('❌ 操作失败: ' + error.message);
    }
  };

  // 隐藏/显示
  const handleToggleHidden = async () => {
    if (!currentFile || !currentDoc) return;
    const filename = currentFile.label;
    const newHidden = !currentDoc.hidden;

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/documents?filename=eq.${encodeURIComponent(filename)}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ hidden: newHidden })
      });

      if (response.ok) {
        setMessage(newHidden ? '👁️ 已隐藏' : '👁️‍🗨️ 已显示');
        setCurrentDoc({ ...currentDoc, hidden: newHidden });
        setDocStatus(newHidden ? '已隐藏' : '已公开');
      } else {
        setMessage('❌ 操作失败');
      }
    } catch (error) {
      setMessage('❌ 操作失败: ' + error.message);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const editor = editorRef.current;
    if (!editor) { setSaving(false); return; }

    let html = editor.innerHTML;

    // ===== 保护表格和图片内容 =====
    // 先提取并保护所有表格，避免被后续正则删除
    const tablePlaceholder = '___TABLE_PLACEHOLDER___';
    const tablePlaceholders: Array<{ placeholder: string; content: string }> = [];
    let tableIndex = 0;

    html = html.replace(/<table[^>]*>[\s\S]*?<\/table>/gi, (match) => {
      const placeholder = `${tablePlaceholder}${tableIndex}___`;
      tablePlaceholders.push({ placeholder, content: match });
      tableIndex++;
      return placeholder;
    });

    // 提取并保护所有图片
    const imagePlaceholder = '___IMAGE_PLACEHOLDER___';
    const imagePlaceholders: Array<{ placeholder: string; markdown: string }> = [];
    let imageIndex = 0;

    html = html.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, (match, src, alt) => {
      const placeholder = `${imagePlaceholder}${imageIndex}___`;
      imagePlaceholders.push({ placeholder, markdown: `![${alt || ''}](${src})` });
      imageIndex++;
      return placeholder;
    });

    // 处理没有 alt 属性的图片
    html = html.replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, (match, src) => {
      const placeholder = `${imagePlaceholder}${imageIndex}___`;
      imagePlaceholders.push({ placeholder, markdown: `![](${src})` });
      imageIndex++;
      return placeholder;
    });

    let markdown = html
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
      .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
      .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n')
      .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n')
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

    // ===== 恢复表格和图片内容 =====
    for (const { placeholder, content } of tablePlaceholders) {
      markdown = markdown.replace(placeholder, '\n\n' + content + '\n\n');
    }
    for (const { placeholder, markdown: imgMarkdown } of imagePlaceholders) {
      markdown = markdown.replace(placeholder, '\n' + imgMarkdown + '\n');
    }

    const fileName = filePath.split('/').pop().replace('.md', '');
    const fullContent = `---
id: ${fileName}
title: ${fileName}
---

${markdown}`;

    try {
      // 直接保存到 Supabase
      const saveResponse = await fetch(`${SUPABASE_URL}/rest/v1/documents?filename=eq.${encodeURIComponent(fileName)}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          content: fullContent,
          category: currentCategory,
          updated_at: new Date().toISOString()
        })
      });

      if (saveResponse.ok) {
        setMessage('✅ 保存成功！');
        setHasChanges(false);
        setOriginalContent(editor.innerHTML);
        // 刷新页面
        window.location.href = '/editor?file=' + fileName + '&refresh=' + Date.now();
      } else {
        const errText = await saveResponse.text();
        setMessage('保存失败: ' + errText);
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
      {/* 拒绝理由弹窗 */}
      {rejectModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', maxWidth: '400px', width: '90%' }}>
            <h3 style={{ marginTop: 0 }}>填写拒绝理由</h3>
            <p style={{ color: '#666', marginBottom: '15px' }}>请说明拒绝该文档的原因</p>
            <textarea
              value={rejectModal.reason}
              onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
              placeholder="例如：内容不符合主题、格式有问题等"
              style={{ width: '100%', height: '100px', padding: '10px', borderRadius: '5px', border: '1px solid #ddd', fontSize: '14px', marginBottom: '15px' }}
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setRejectModal(null)} style={{ padding: '8px 20px', backgroundColor: '#9ca3af', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                取消
              </button>
              <button onClick={confirmReject} style={{ padding: '8px 20px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                确认拒绝
              </button>
            </div>
          </div>
        </div>
      )}

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
                  // 保存分类到 Supabase
                  await fetch(`${SUPABASE_URL}/rest/v1/documents?filename=eq.${encodeURIComponent(currentFile?.label)}`, {
                    method: 'PATCH',
                    headers: {
                      'apikey': SUPABASE_KEY,
                      'Authorization': `Bearer ${SUPABASE_KEY}`,
                      'Content-Type': 'application/json',
                      'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({ category: newCategory })
                  });

                  setCurrentCategory(newCategory);
                  setMessage('✅ 文档分类已更新');
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
        <button onClick={() => execCommand('formatBlock', 'p')} style={toolButtonStyle} title="正文">正文</button>
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

      {/* 审批操作按钮 - 仅管理员可见 */}
      {user?.role === 'admin' && (
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '2px solid #0ea5e9' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#0369a1' }}>⚙️ 管理员操作</div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={handleApprove} style={{ padding: '8px 20px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
              ✅ 审批通过
            </button>
            <button onClick={handleReject} style={{ padding: '8px 20px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
              ❌ 拒绝
            </button>
            <button onClick={handleToggleHidden} style={{ padding: '8px 20px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
              {currentDoc?.hidden ? '👁️ 取消隐藏' : '👁️ 隐藏'}
            </button>
          </div>
          {docStatus && (
            <div style={{ marginTop: '10px', fontSize: '14px', color: docStatus === '已公开' ? '#10b981' : docStatus === '待审批' ? '#f59e0b' : '#6b7280' }}>
              当前状态: {docStatus}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const toolButtonStyle = { padding: '8px 12px', backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '5px', cursor: 'pointer', fontSize: '14px' };

export default function Editor() {
  return <BrowserOnly fallback={<div style={{ textAlign: 'center', padding: '50px' }}>加载中...</div>}>{() => <WYSIWYGEditor />}</BrowserOnly>;
}