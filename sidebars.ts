import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';
const fs = require('fs');
const path = require('path');

const docsDir = path.join(__dirname, 'docs');

// 读取 docs 目录下的所有文档
let localDocs: string[] = [];
if (fs.existsSync(docsDir)) {
  localDocs = fs.readdirSync(docsDir)
    .filter(f => f.endsWith('.md') && !f.startsWith('.'))
    .map(f => f.replace('.md', ''));
}

// 硬编码分类映射（优先级最高）
const HARDCODED_CATEGORIES: Record<string, string> = {
  '项目说明': 'intro',
  '探知未来科技女性培养计划': 'intro',
};

// 读取 Supabase 中的分类和排序（从 .supabase-categories.json）
let supabaseCategories: Record<string, string> = {};
let supabaseOrders: Record<string, number> = {};
const supabaseDataFile = path.join(docsDir, '.supabase-categories.json');
if (fs.existsSync(supabaseDataFile)) {
  try {
    const data = JSON.parse(fs.readFileSync(supabaseDataFile, 'utf8'));
    supabaseCategories = data.categories || {};
    supabaseOrders = data.orders || {};
  } catch (e) {}
}

// 合并分类映射（硬编码优先）
const docCategoryMap: Record<string, string> = {
  ...supabaseCategories,
  ...HARDCODED_CATEGORIES, // 硬编码覆盖 Supabase 分类
};

// 分类逻辑
const introDocs = localDocs.filter(doc =>
  docCategoryMap[doc] === 'intro'
).sort((a, b) => (supabaseOrders[a] || 0) - (supabaseOrders[b] || 0));

const processDocs = localDocs.filter(doc =>
  docCategoryMap[doc] === 'process' ||
  (!introDocs.includes(doc) && !HARDCODED_CATEGORIES[doc])
).sort((a, b) => (supabaseOrders[a] || 0) - (supabaseOrders[b] || 0));

const sidebarItems: any[] = [];

if (introDocs.length > 0) {
  sidebarItems.push({
    type: 'category',
    label: '项目介绍',
    collapsed: false,
    link: {
      type: 'generated-index',
      title: '项目介绍',
      description: '了解本项目的背景、目标和整体规划',
      slug: '/intro',
    },
    items: introDocs
  });
}

if (processDocs.length > 0) {
  sidebarItems.push({
    type: 'category',
    label: '工艺手册',
    collapsed: false,
    link: {
      type: 'generated-index',
      title: '工艺手册',
      description: '各类高分子材料再生3D打印线材的制作工艺',
      slug: '/process',
    },
    items: processDocs
  });
}

const sidebars: SidebarsConfig = {
  tutorialSidebar: sidebarItems
};

export default sidebars;