import React, { useState, useEffect, useRef } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import mammoth from 'mammoth';
import JSZip from 'jszip';

function UploadPage() {
  // 从 Docusaurus customFields 获取环境变量
  const SUPABASE_URL = (window as any).SUPABASE_URL || 'https://jyhmhksdpjkzkhqlkuqh.supabase.co';
  const SUPABASE_KEY = (window as any).SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5aG1oa3NkcGpremtocWxrdXFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMDEwNTYsImV4cCI6MjA5MDg3NzA1Nn0.e5iYCkY-UNumjWWnsPugc5nIUKOkITccuhODLPBCiwc';

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('process');
  const [myDocs, setMyDocs] = useState<any[]>([]);
  const [tableStyle, setTableStyle] = useState('classic'); // 表格样式选择
  const [headingMode, setHeadingMode] = useState('smart'); // 标题层级模式：smart（智能识别）、flat（扁平）、preserve（保持原样）
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 日志记录函数
  const addLog = async (action: string, details: any, username?: string) => {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/logs`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          action,
          details: JSON.stringify(details),
          username: username || 'system',
          created_at: new Date().toISOString(),
        }),
      });
    } catch (e) {
      console.error('Log error:', e);
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('stem_user');
    if (!savedUser) {
      window.location.href = '/login';
      return;
    }
    const userData = JSON.parse(savedUser);
    setUser(userData);
    setIsLoggedIn(true);

    loadCategories();
    loadMyDocs();
  }, []);

  const loadCategories = async () => {
    try {
      // 直接调用 Supabase API 获取分类
      const response = await fetch(`${SUPABASE_URL}/rest/v1/categories?order=order.asc`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });
      const data = await response.json();
      const allowedCategories = user?.role === 'admin' ? data : data.filter((c: any) => c.allowUserUpload);
      setCategories(allowedCategories.sort((a: any, b: any) => a.order - b.order));
      if (allowedCategories.length > 0) {
        setSelectedCategory(allowedCategories[0].id);
      }
    } catch (error: any) {
      console.error('加载目录失败:', error);
      addLog('error_load_categories', { error: error.message }, user?.username);
    }
  };

  const loadMyDocs = async () => {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/documents?uploader=eq.${user?.username}&order=created_at.desc`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      const docs = await response.json();
      setMyDocs(docs);
    } catch (error: any) {
      console.error('加载我的文档失败:', error);
      addLog('error_load_docs', { error: error.message }, user?.username);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.docx?$/i)) {
      setMessage('请上传 Word 文档 (.doc 或 .docx)');
      addLog('upload_invalid_format', { filename: file.name }, user?.username);
      return;
    }

    setUploading(true);
    setMessage('正在转换文档...');
    const filename = file.name.replace(/\.docx?$/i, '');

    try {
      addLog('upload_start', { filename, size: file.size }, user?.username);

      // 读取文件
      const arrayBuffer = await file.arrayBuffer();

      // ===== 前端 mammoth 转换 =====
      setMessage('正在解析 Word 文档...');

      // 用 HTML 方式转换，然后手动处理表格
      const htmlResult = await mammoth.convertToHtml({ arrayBuffer });

      // 将 HTML 转换为 Markdown
      let html = htmlResult.value;
      let markdown = '';

      // 处理表格 - 转换为带样式类的 HTML 表格
      // 使用更精确的正则，匹配表格内容（包括嵌套标签）
      const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
      let processedHtml = html;

      // 根据选择的样式生成 CSS 类名
      const tableClassName = `table-style-${tableStyle}`;

      // 收集所有表格并处理
      const tables: Array<{ original: string; replacement: string }> = [];
      let tableMatch;
      while ((tableMatch = tableRegex.exec(html)) !== null) {
        const tableContent = tableMatch[1];

        // 生成带样式类的 HTML 表格
        let htmlTable = `<table class="${tableClassName}">\n`;

        // 提取行（支持嵌套内容）
        const rows = tableContent.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];

        for (let i = 0; i < rows.length; i++) {
          const rowContent = rows[i];

          // 判断是否是表头行（第一行或包含 th）
          const isHeaderRow = i === 0 || rowContent.includes('<th');
          const rowTag = isHeaderRow ? 'thead' : 'tbody';

          // 如果是第一行，添加 thead
          if (i === 0) {
            htmlTable += '<thead>\n';
          } else if (i === 1 && !rows[0].includes('<th')) {
            // 如果第一行不是表头，第二行开始 tbody
            htmlTable += '</thead>\n<tbody>\n';
          } else if (i === 1) {
            htmlTable += '</thead>\n<tbody>\n';
          }

          // 提取单元格（支持嵌套标签和换行）
          const cells: string[] = [];
          let cellMatch;
          const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>|<th[^>]*>([\s\S]*?)<\/th>/gi;
          while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
            cells.push(cellMatch[1] || cellMatch[2] || '');
          }

          if (cells.length === 0) continue;

          htmlTable += '<tr>';
          for (const cell of cells) {
            // 清理单元格内容：移除多余标签，保留基本格式
            let cellText = cell
              .replace(/<br[^>]*>/gi, '<br/>')  // 保留 br 标签
              .replace(/\n/g, ' ')              // 移除换行符
              .replace(/\s+/g, ' ')             // 合并多个空格
              .trim();
            // 使用 th 或 td
            const cellTag = isHeaderRow ? 'th' : 'td';
            htmlTable += `<${cellTag}>${cellText}</${cellTag}>`;
          }
          htmlTable += '</tr>\n';
        }

        // 关闭 tbody 和 table
        if (rows.length > 1) {
          htmlTable += '</tbody>\n';
        }
        htmlTable += '</table>\n';

        tables.push({ original: tableMatch[0], replacement: htmlTable });
      }

      // 替换所有表格
      for (const table of tables) {
        processedHtml = processedHtml.replace(table.original, table.replacement);
      }

      // 处理其他 HTML 元素（但不处理表格，表格已转为 HTML 格式）
      // 先保护表格内容
      const tablePlaceholder = '___TABLE_PLACEHOLDER___';
      const tablePlaceholders: Array<{ placeholder: string; content: string }> = [];
      let tableIndex = 0;

      // 临时替换表格，保护它们不被后续处理破坏
      processedHtml = processedHtml.replace(/<table[^>]*>[\s\S]*?<\/table>/gi, (match) => {
        const placeholder = `${tablePlaceholder}${tableIndex}___`;
        tablePlaceholders.push({ placeholder, content: match });
        tableIndex++;
        return placeholder;
      });

      // 智能层级识别函数：根据编号格式推断标题级别
      let isFirstHeading = true; // 标记是否是第一个标题（文档标题）

      const detectHeadingLevel = (content: string, isFirst: boolean): number => {
        // 第一个标题保持一级（文档标题）
        if (isFirst) {
          return 1;
        }

        const trimmed = content.trim();
        // 清理可能的 ** 包裹
        const cleanContent = trimmed.replace(/^\*+|\*+$/g, '').trim();

        // 中文数字章节：一、二、三、四、五... → 章节标题（二级）
        if (/^[一二三四五六七八九十]+、/.test(cleanContent)) {
          return 2;
        }
        // 数字编号：1. 2. 3. → 子章节标题（三级）
        if (/^[0-9]+\.[\s]/.test(cleanContent) || /^[0-9]+\.[^\d]/.test(cleanContent)) {
          return 3;
        }
        // 括号编号：（1）、(1)、① → 更细分标题（四级）
        if (/^[(（][0-9]+[)）]/.test(cleanContent) || /^[①②③④⑤⑥⑦⑧⑨⑩]/.test(cleanContent)) {
          return 4;
        }
        // 表格/图表标题 → 三级标题
        if (/^表：|^图：/.test(cleanContent)) {
          return 3;
        }
        // 默认返回 0 表示无法识别
        return 0;
      };

      // 根据层级模式处理标题
      const processHeading = (originalLevel: number, content: string): string => {
        const trimmed = content.trim();

        // 清理内容中所有的 # 符号（Word 文档标题内容可能带有 #）
        let cleanContent = trimmed;

        // 移除开头的所有 # 符号（不管后面有没有空格）
        cleanContent = cleanContent.replace(/^#+\s*/, '');

        // 移除开头可能残留的空格和 #
        while (cleanContent.startsWith('#') || cleanContent.startsWith(' ')) {
          cleanContent = cleanContent.substring(1);
        }
        cleanContent = cleanContent.trim();

        // 清理标题内容中的 ** 加粗符号（Word 标题可能带加粗）
        cleanContent = cleanContent.replace(/^\*+|\*+$/g, '').trim();

        // 清理多余空格
        cleanContent = cleanContent.replace(/\s+/g, ' ').trim();

        // 如果清理后内容为空，返回空
        if (!cleanContent) {
          return '';
        }

        if (headingMode === 'smart') {
          // 智能识别：根据编号格式直接确定层级
          const detectedLevel = detectHeadingLevel(cleanContent, isFirstHeading);
          isFirstHeading = false; // 标记已处理过第一个标题

          if (detectedLevel > 0) {
            // 直接使用检测到的层级
            const hashes = '#'.repeat(detectedLevel);
            return hashes + ' ' + cleanContent + '\n\n';
          }
          // 无法识别编号，使用原始级别
          const markdownLevel = Math.min(originalLevel, 6);
          const hashes = '#'.repeat(markdownLevel);
          return hashes + ' ' + cleanContent + '\n\n';
        } else if (headingMode === 'flat') {
          // 扁平模式：所有标题都变成 ##
          isFirstHeading = false;
          return '## ' + cleanContent + '\n\n';
        } else {
          // 保持原样：保持 HTML 标签级别
          isFirstHeading = false;
          const markdownLevel = Math.min(originalLevel, 6);
          const hashes = '#'.repeat(markdownLevel);
          return hashes + ' ' + cleanContent + '\n\n';
        }
      };

      processedHtml = processedHtml.replace(/<h1[^>]*>(.*?)<\/h1>/gi, (match, content) => processHeading(1, content));
      processedHtml = processedHtml.replace(/<h2[^>]*>(.*?)<\/h2>/gi, (match, content) => processHeading(2, content));
      processedHtml = processedHtml.replace(/<h3[^>]*>(.*?)<\/h3>/gi, (match, content) => processHeading(3, content));
      processedHtml = processedHtml.replace(/<h4[^>]*>(.*?)<\/h4>/gi, (match, content) => processHeading(4, content));
      processedHtml = processedHtml.replace(/<h5[^>]*>(.*?)<\/h5>/gi, (match, content) => processHeading(5, content));
      processedHtml = processedHtml.replace(/<h6[^>]*>(.*?)<\/h6>/gi, (match, content) => processHeading(6, content));
      processedHtml = processedHtml.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
      processedHtml = processedHtml.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
      processedHtml = processedHtml.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
      processedHtml = processedHtml.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
      processedHtml = processedHtml.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
      processedHtml = processedHtml.replace(/<ul[^>]*>(.*?)<\/ul>/gi, '\n$1');
      processedHtml = processedHtml.replace(/<ol[^>]*>(.*?)<\/ol>/gi, '\n$1');
      processedHtml = processedHtml.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
      processedHtml = processedHtml.replace(/<br[^>]*>/gi, '\n');
      processedHtml = processedHtml.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
      processedHtml = processedHtml.replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, '![]($1)');
      processedHtml = processedHtml.replace(/<[^>]+>/g, ''); // 移除剩余 HTML 标签

      // 恢复表格内容
      for (const { placeholder, content } of tablePlaceholders) {
        processedHtml = processedHtml.replace(placeholder, '\n\n' + content + '\n\n');
      }

      // 清理多余空白
      processedHtml = processedHtml.replace(/\n{3,}/g, '\n\n');
      processedHtml = processedHtml.trim();

      markdown = processedHtml;

      addLog('convert_success', { filename, contentLength: markdown.length }, user?.username);

      // ===== 提取图片 =====
      setMessage('正在提取图片...');
      const zip = await JSZip.loadAsync(arrayBuffer);
      const mediaFiles = zip.file(/word\/media\/.*/);
      const images: Array<{ name: string; data: string; type: string; ref: string }> = [];

      for (const zipFile of mediaFiles) {
        const originalName = zipFile.name.replace('word/media/', '');
        const imageData = await zipFile.async('base64');
        const mimeType = originalName.endsWith('.png') ? 'image/png'
          : originalName.endsWith('.jpg') || originalName.endsWith('.jpeg') ? 'image/jpeg'
          : originalName.endsWith('.gif') ? 'image/gif'
          : 'image/png';

        images.push({
          name: `${filename}-${Date.now()}-${originalName}`,
          data: imageData,
          type: mimeType,
          ref: `media/${originalName}`
        });
      }

      addLog('images_extracted', { filename, count: images.length }, user?.username);

      // ===== 格式后处理 =====
      markdown = markdown.replace(/^(#{1,6})([^\s])/gm, '$1 $2');
      markdown = markdown.replace(/([^\n])\n([-*+] )/g, '$1\n\n$2');
      markdown = markdown.replace(/([^\n])\n(\d+\. )/g, '$1\n\n$2');
      markdown = markdown.replace(/\n{3,}/g, '\n\n');
      markdown = markdown.replace(/ +\n/g, '\n');

      // ===== 智能识别普通文本中的标题编号 =====
      // 如果选择了智能模式，额外扫描文本中带有中文数字/数字编号的行
      if (headingMode === 'smart') {
        const lines = markdown.split('\n');
        const processedLines: string[] = [];

        for (const line of lines) {
          const trimmed = line.trim();

          // 如果已经是 markdown 标题格式（开头有 #），跳过处理
          if (/^#{1,6}\s/.test(trimmed)) {
            processedLines.push(line);
            continue;
          }

          // 检测中文数字章节（一、二、三...）→ 二级标题
          if (/^[一二三四五六七八九十]+、/.test(trimmed)) {
            processedLines.push('## ' + trimmed);
          }
          // 检测数字编号（1. 2. 3.）→ 三级标题（但排除列表项）
          else if (/^[0-9]+\.[\s]/.test(trimmed) || /^[0-9]+\.[^\d]/.test(trimmed)) {
            if (!trimmed.startsWith('-') && trimmed.length > 5) {
              processedLines.push('### ' + trimmed);
            } else {
              processedLines.push(line);
            }
          }
          // 检测括号编号（(1) （1））→ 四级标题
          else if (/^[(（][0-9]+[)）]\s/.test(trimmed)) {
            processedLines.push('#### ' + trimmed);
          }
          else {
            processedLines.push(line);
          }
        }
        markdown = processedLines.join('\n');
      }

      setMessage(`转换完成，${images.length} 张图片待上传...`);

      // ===== 直接上传图片到 Supabase Storage =====
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        setMessage(`正在上传图片 ${i + 1}/${images.length}...`);

        const binaryString = atob(img.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let j = 0; j < binaryString.length; j++) {
          bytes[j] = binaryString.charCodeAt(j);
        }

        const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/images/${img.name}`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': img.type,
            'x-upsert': 'true',
          },
          body: bytes,
        });

        if (uploadRes.ok) {
          const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/images/${img.name}`;
          markdown = markdown.replace(new RegExp(img.ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), publicUrl);
          addLog('image_upload_success', { name: img.name }, user?.username);
        } else {
          addLog('image_upload_failed', { name: img.name, status: uploadRes.status }, user?.username);
        }
      }

      // ===== 直接存储文档到 Supabase =====
      setMessage('正在保存文档...');

      // 检查文件名是否已存在，如果存在则自动加数字后缀
      let finalFilename = filename;
      let suffix = 0;
      let filenameExists = true;

      while (filenameExists) {
        const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/documents?filename=eq.${encodeURIComponent(finalFilename)}&select=filename`, {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          }
        });
        const existingDocs = await checkRes.json();
        if (existingDocs.length === 0) {
          filenameExists = false;
        } else {
          suffix++;
          finalFilename = `${filename}${suffix}`;
        }
      }

      const fullContent = `---
id: ${finalFilename}
title: ${finalFilename}
---

${markdown}`;

      const docRes = await fetch(`${SUPABASE_URL}/rest/v1/documents`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          filename: finalFilename,
          content: fullContent,
          category: selectedCategory,
          uploader: user?.username || 'unknown',
          approved: false,
          created_at: new Date().toISOString(),
        }),
      });

      if (docRes.ok) {
        const displayName = finalFilename === filename ? filename : `${filename}（重命名为 ${finalFilename}）`;
        setMessage(`✅ ${displayName} 上传成功！${images.length > 0 ? `已上传 ${images.length} 张图片。` : ''}等待管理员审批`);
        addLog('upload_success', { filename: finalFilename, originalFilename: filename, category: selectedCategory, images: images.length }, user?.username);
        if (fileInputRef.current) fileInputRef.current.value = '';
        loadMyDocs();
      } else {
        const errText = await docRes.text();
        setMessage('保存失败: ' + errText);
        addLog('upload_save_failed', { filename: finalFilename, error: errText }, user?.username);
      }
    } catch (error: any) {
      setMessage('上传失败: ' + error.message);
      addLog('upload_error', { filename, error: error.message }, user?.username);
    }

    setUploading(false);
  };

  const handleResubmit = async (doc: any) => {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/documents?filename=eq.${encodeURIComponent(doc.filename)}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          approved: false,
          hidden: false,
          rejection_reason: null,
          updated_at: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        setMessage('✅ 已重新提交，正在触发重新部署...');
        addLog('resubmit', { filename: doc.filename }, user?.username);
        // 触发 Vercel 重新部署
        try {
          await fetch('https://api.vercel.com/v1/integrations/deploy/prj_pdsffwCNPJcY904M0JMZUtzRjOCg/1PuxGzixwB', { method: 'POST' });
          setMessage('✅ 已重新提交，等待审批，网站将自动更新');
        } catch (e) {
          setMessage('✅ 已重新提交，等待审批');
        }
        loadMyDocs();
      } else {
        setMessage('❌ 提交失败');
      }
    } catch (error: any) {
      setMessage('❌ 提交失败: ' + error.message);
    }
  };

  const handleApproveFromUpload = async (filename: string) => {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/documents?filename=eq.${encodeURIComponent(filename)}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ approved: true }),
      });
      if (response.ok) {
        setMessage(`✅ ${filename} 已审批通过，正在触发重新部署...`);
        addLog('approve', { filename }, user?.username);
        // 触发 Vercel 重新部署
        try {
          await fetch('https://api.vercel.com/v1/integrations/deploy/prj_pdsffwCNPJcY904M0JMZUtzRjOCg/1PuxGzixwB', { method: 'POST' });
          setMessage(`✅ ${filename} 已审批通过，网站将自动更新`);
        } catch (e) {
          setMessage(`✅ ${filename} 已审批通过，请手动触发部署`);
        }
        loadMyDocs();
      }
    } catch (error: any) {
      setMessage('操作失败: ' + error.message);
    }
  };

  const handleRejectFromUpload = async (filename: string) => {
    const reason = prompt('请输入拒绝理由:');
    if (!reason) return;

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/documents?filename=eq.${encodeURIComponent(filename)}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ approved: false, hidden: true, rejection_reason: reason }),
      });
      if (response.ok) {
        setMessage(`❌ ${filename} 已拒绝，正在触发重新部署...`);
        addLog('reject', { filename, reason }, user?.username);
        // 触发 Vercel 重新部署
        try {
          await fetch('https://api.vercel.com/v1/integrations/deploy/prj_pdsffwCNPJcY904M0JMZUtzRjOCg/1PuxGzixwB', { method: 'POST' });
          setMessage(`❌ ${filename} 已拒绝，网站将自动更新`);
        } catch (e) {
          setMessage(`❌ ${filename} 已拒绝`);
        }
        loadMyDocs();
      }
    } catch (error: any) {
      setMessage('操作失败: ' + error.message);
    }
  };

  const getStatusBadge = (doc: any) => {
    if (doc.hidden && doc.rejection_reason) {
      return <span style={{ padding: '2px 8px', backgroundColor: '#ef4444', color: 'white', borderRadius: '4px', fontSize: '12px' }}>已拒绝</span>;
    }
    if (doc.hidden) {
      return <span style={{ padding: '2px 8px', backgroundColor: '#6b7280', color: 'white', borderRadius: '4px', fontSize: '12px' }}>已隐藏</span>;
    }
    if (doc.approved) {
      return <span style={{ padding: '2px 8px', backgroundColor: '#10b981', color: 'white', borderRadius: '4px', fontSize: '12px' }}>已公开</span>;
    }
    return <span style={{ padding: '2px 8px', backgroundColor: '#f59e0b', color: 'white', borderRadius: '4px', fontSize: '12px' }}>待审批</span>;
  };

  if (!isLoggedIn) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>正在跳转...</div>;
  }

  const pendingDocs = myDocs.filter(d => !d.approved && !d.hidden);
  const rejectedDocs = myDocs.filter(d => !d.approved && d.hidden && d.rejection_reason);
  const approvedDocs = myDocs.filter(d => d.approved && !d.hidden);
  const hiddenDocs = myDocs.filter(d => d.approved && d.hidden);

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>📤 上传文档</h2>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        上传 Word 文档，系统将自动转换为网页格式。新文档需要管理员审批后才能公开显示。
      </p>

      {/* 分类选择 */}
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <label style={{ fontWeight: 'bold', marginRight: '10px' }}>选择分类：</label>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{ padding: '8px 15px', fontSize: '16px', borderRadius: '5px', border: '1px solid #ddd', minWidth: '200px' }}
        >
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      {/* 表格样式选择 */}
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <label style={{ fontWeight: 'bold', marginRight: '10px' }}>表格样式：</label>
        <select
          value={tableStyle}
          onChange={(e) => setTableStyle(e.target.value)}
          style={{ padding: '8px 15px', fontSize: '16px', borderRadius: '5px', border: '1px solid #ddd', minWidth: '200px' }}
        >
          <option value="classic">经典田字格 - 完整边框，适合打印</option>
          <option value="modern">现代简约 - 绿色主题，表头带色</option>
          <option value="striped">条纹交替 - 无边框，行间分隔</option>
          <option value="card">卡片式 - 渐变表头，阴影效果</option>
        </select>
        <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
          💡 提示：选择表格在文档中的展示风格
        </div>
      </div>

      {/* 标题层级模式选择 */}
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <label style={{ fontWeight: 'bold', marginRight: '10px' }}>标题层级：</label>
        <select
          value={headingMode}
          onChange={(e) => setHeadingMode(e.target.value)}
          style={{ padding: '8px 15px', fontSize: '16px', borderRadius: '5px', border: '1px solid #ddd', minWidth: '200px' }}
        >
          <option value="smart">智能识别 - 根据编号自动推断层级</option>
          <option value="flat">扁平结构 - 所有标题平铺显示</option>
          <option value="preserve">保持原样 - 按Word标题样式转换</option>
        </select>
        <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
          💡 提示："一、"→一级，"1."→二级，"(1)"→三级，右侧目录会显示层级结构
        </div>
      </div>

      {/* 上传区域 */}
      <div style={{ border: '2px dashed #10b981', borderRadius: '12px', padding: '40px', textAlign: 'center', backgroundColor: '#f0fdf4', marginBottom: '20px' }}>
        <input ref={fileInputRef} type="file" accept=".doc,.docx" onChange={handleUpload} disabled={uploading} id="file-upload" style={{ display: 'none' }} />
        <label htmlFor="file-upload" style={{ cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.5 : 1 }}>
          <div style={{ fontSize: '48px', marginBottom: '10px' }}>📄</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#10b981' }}>
            {uploading ? message : '点击选择 Word 文档'}
          </div>
          <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>支持 .doc 和 .docx 格式</div>
        </label>
      </div>

      {message && !uploading && (
        <div style={{ padding: '15px', borderRadius: '8px', backgroundColor: message.includes('✅') ? '#d1fae5' : '#fee2e2', color: message.includes('✅') ? '#065f46' : '#991b1b', marginBottom: '20px' }}>
          {message}
        </div>
      )}

      {/* 待审批 */}
      {pendingDocs.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h3>⏳ 待审批 ({pendingDocs.length})</h3>
          {pendingDocs.map((doc, idx) => (
            <div key={idx} style={{ padding: '12px', backgroundColor: '#fffbeb', borderRadius: '8px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{doc.filename}</span>
                {getStatusBadge(doc)}
              </div>
              {user?.role === 'admin' && (
                <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                  <button onClick={() => handleApproveFromUpload(doc.filename)} style={{ padding: '6px 16px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '13px' }}>✅ 通过</button>
                  <button onClick={() => handleRejectFromUpload(doc.filename)} style={{ padding: '6px 16px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '13px' }}>❌ 拒绝</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 被拒绝 */}
      {rejectedDocs.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h3>❌ 被退回 ({rejectedDocs.length})</h3>
          {rejectedDocs.map((doc, idx) => (
            <div key={idx} style={{ padding: '12px', backgroundColor: '#fef2f2', borderRadius: '8px', marginBottom: '8px', border: '1px solid #fca5a5' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 'bold' }}>{doc.filename}</span>
                {getStatusBadge(doc)}
              </div>
              <div style={{ fontSize: '12px', color: '#dc2626', marginBottom: '8px' }}>
                <strong>拒绝理由：</strong>{doc.rejection_reason}
              </div>
              <button onClick={() => handleResubmit(doc)} style={{ padding: '6px 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '13px' }}>✏️ 修改后重新提交</button>
            </div>
          ))}
        </div>
      )}

      {/* 已公开 */}
      {approvedDocs.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h3>✅ 已公开 ({approvedDocs.length})</h3>
          {approvedDocs.map((doc, idx) => (
            <div key={idx} style={{ padding: '12px', backgroundColor: '#f0fdf4', borderRadius: '8px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{doc.filename}</span>
                {getStatusBadge(doc)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 已隐藏 */}
      {hiddenDocs.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h3>👁️ 已隐藏 ({hiddenDocs.length})</h3>
          {hiddenDocs.map((doc, idx) => (
            <div key={idx} style={{ padding: '12px', backgroundColor: '#f3f4f6', borderRadius: '8px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{doc.filename}</span>
                {getStatusBadge(doc)}
              </div>
            </div>
          ))}
        </div>
      )}

      {user?.role === 'admin' && (
        <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
          <button onClick={() => window.location.href = '/manage'} style={{ padding: '12px 30px', fontSize: '16px', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
            📚 文档排序管理
          </button>
          <button onClick={() => window.location.href = '/logs'} style={{ padding: '12px 30px', fontSize: '16px', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
            📋 查看日志
          </button>
        </div>
      )}

      <button onClick={() => window.location.href = '/'} style={{ marginTop: '20px', padding: '12px 30px', fontSize: '16px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
        🏠 返回首页
      </button>
    </div>
  );
}

// 注入环境变量到 window 对象
declare global {
  interface Window {
    SUPABASE_URL?: string;
    SUPABASE_KEY?: string;
  }
}

export default function Upload() {
  return <BrowserOnly fallback={<div style={{ textAlign: 'center', padding: '50px' }}>加载中...</div>}>{() => <UploadPage />}</BrowserOnly>;
}