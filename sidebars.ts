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

// 读取 Supabase 中的分类（从 .supabase-categories.json）
let supabaseCategories: Record<string, string> = {};
const supabaseCategoriesFile = path.join(docsDir, '.supabase-categories.json');
if (fs.existsSync(supabaseCategoriesFile)) {
  try {
    supabaseCategories = JSON.parse(fs.readFileSync(supabaseCategoriesFile, 'utf8'));
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
);

const processDocs = localDocs.filter(doc =>
  docCategoryMap[doc] === 'process' ||
  (!introDocs.includes(doc) && !HARDCODED_CATEGORIES[doc])
);

const sidebarItems = [
  {
    type: 'category',
    label: '项目介绍',
    collapsed: false,
    items: introDocs.length > 0 ? introDocs : ['暂无']
  },
  {
    type: 'category',
    label: '工艺手册',
    collapsed: false,
    items: processDocs.length > 0 ? processDocs : ['暂无']
  }
];

const sidebars: SidebarsConfig = {
  tutorialSidebar: sidebarItems
};

export default sidebars;