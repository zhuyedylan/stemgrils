import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://jyhmhksdpjkzkhqlkuqh.supabase.co';
const supabaseKey = 'sb_publishable_a0zC2QDTxicG-HbxojKkTQ_medLD1JW';

// 默认分类
const DEFAULT_CATEGORIES = [
  { id: 'intro', name: '项目介绍', order: 0 },
  { id: 'process', name: '工艺手册', order: 1 }
];

// 读取本地 docs 目录
let localDocs = [];
const docsDir = path.join(__dirname, 'docs');
if (fs.existsSync(docsDir)) {
  localDocs = fs.readdirSync(docsDir).filter(f => f.endsWith('.md') && !f.startsWith('.')).map(f => f.replace('.md', ''));
}

// 读取 .categories.json
let categories = [];
const categoriesFile = path.join(docsDir, '.categories.json');
if (fs.existsSync(categoriesFile)) {
  categories = JSON.parse(fs.readFileSync(categoriesFile, 'utf8'));
}
if (categories.length === 0) {
  categories = DEFAULT_CATEGORIES;
}
categories.sort((a, b) => a.order - b.order);

// 构建侧边栏 - 使用本地文档
const sidebarItems = categories.map(cat => {
  return {
    type: 'category',
    label: cat.name,
    collapsed: false,
    items: localDocs
  };
});

const sidebars: SidebarsConfig = {
  tutorialSidebar: sidebarItems
};

export default sidebars;