import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';
const fs = require('fs');
const path = require('path');

const docsDir = path.join(__dirname, 'docs');
let localDocs = [];
if (fs.existsSync(docsDir)) {
  localDocs = fs.readdirSync(docsDir).filter(f => f.endsWith('.md') && !f.startsWith('.')).map(f => f.replace('.md', ''));
}

// 读取分类配置
let docCategoryMap = {};
const categoriesFile = path.join(__dirname, 'docs', '.categories.json');
if (fs.existsSync(categoriesFile)) {
  const categoriesData = JSON.parse(fs.readFileSync(categoriesFile, 'utf8'));
  // 从上传者信息读取分类
  const uploadersFile = path.join(__dirname, 'docs', '.uploaders.json');
  if (fs.existsSync(uploadersFile)) {
    const uploaders = JSON.parse(fs.readFileSync(uploadersFile, 'utf8'));
    for (const [filename, info] of Object.entries(uploaders)) {
      if (info.category) {
        docCategoryMap[filename] = info.category;
      }
    }
  }
}

// 简单分类：项目介绍 vs 工艺手册
const introDocs = localDocs.filter(doc => docCategoryMap[doc] === 'intro' || doc === '项目说明' || doc === '探知未来科技女性培养计划');
const processDocs = localDocs.filter(doc => docCategoryMap[doc] === 'process' || doc === '工艺手册' || !introDocs.includes(doc));
const pendingDocs = []; // 待审批从 Supabase 动态加载

const sidebarItems = [
  {
    type: 'category',
    label: '项目介绍',
    collapsed: false,
    items: introDocs.length > 0 ? introDocs : [{ type: 'link', label: '暂无', href: '#' }]
  },
  {
    type: 'category',
    label: '工艺手册',
    collapsed: false,
    items: processDocs.length > 0 ? processDocs : [{ type: 'link', label: '暂无', href: '#' }]
  },
  {
    type: 'link',
    label: '待审批',
    href: '#pending'
  },
  {
    type: 'link',
    label: '隐藏',
    href: '#hidden'
  }
];

const sidebars: SidebarsConfig = {
  tutorialSidebar: sidebarItems
};

export default sidebars;