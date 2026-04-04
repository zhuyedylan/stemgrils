import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://jyhmhksdpjkzkhqlkuqh.supabase.co';
const supabaseKey = 'sb_publishable_a0zC2QDTxicG-HbxojKkTQ_medLD1JW';

// 读取本地 docs 目录
const docsDir = path.join(__dirname, 'docs');
let localDocs = [];
if (fs.existsSync(docsDir)) {
  localDocs = fs.readdirSync(docsDir).filter(f => f.endsWith('.md') && !f.startsWith('.')).map(f => f.replace('.md', ''));
}

// 读取 .categories.json 获取分类配置
let categories = [];
const categoriesFile = path.join(docsDir, '.categories.json');
if (fs.existsSync(categoriesFile)) {
  categories = JSON.parse(fs.readFileSync(categoriesFile, 'utf8'));
}

// 默认分类
if (categories.length === 0) {
  categories = [
    { id: 'intro', name: '项目介绍', order: 0 },
    { id: 'process', name: '工艺手册', order: 1 }
  ];
}
categories.sort((a, b) => a.order - b.order);

// 尝试从 Supabase 获取文档分类
let docsByCategory = {};

try {
  const response = require('sync-fetch')(null, `${supabaseUrl}/rest/v1/documents?select=filename,category&approved=eq.true&hidden=eq.false`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  if (response.ok) {
    const docs = response.json();
    docs.forEach(doc => {
      const cat = doc.category || 'intro';
      if (!docsByCategory[cat]) {
        docsByCategory[cat] = [];
      }
      docsByCategory[cat].push(doc.filename);
    });
  }
} catch (e) {
  // 如果获取失败，使用本地逻辑
}

// 根据文档名判断分类
// 项目介绍: 探知未来科技女性培养计划, 项目说明
// 工艺手册: 再生PLA..., 家庭废旧ABS...
const docCategoryMap = {
  '项目说明': 'intro',
  '探知未来科技女性培养计划': 'intro',
  '再生PLA与咖啡渣混合打印线材工艺指南': 'process',
  '家庭废旧ABS制品再生3d打印线材工艺手册': 'process'
};

// 构建侧边栏
const sidebarItems = categories.map(cat => {
  // 从 Supabase 获取该分类的文档，或使用本地映射
  let docs = docsByCategory[cat.id] || [];

  // 如果没有从 Supabase 获取到，使用本地映射
  if (docs.length === 0) {
    docs = localDocs.filter(doc => docCategoryMap[doc] === cat.id);
  }

  if (docs.length === 0) {
    return null;
  }

  return {
    type: 'category',
    label: cat.name,
    collapsed: false,
    items: docs
  };
}).filter(item => item !== null);

// 如果没有生成分类，显示所有文档
if (sidebarItems.length === 0 && localDocs.length > 0) {
  sidebarItems.push({
    type: 'category',
    label: '文档',
    items: localDocs
  });
}

const sidebars: SidebarsConfig = {
  tutorialSidebar: sidebarItems
};

export default sidebars;