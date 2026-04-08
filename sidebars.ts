import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';
const fs = require('fs');
const path = require('path');

const docsDir = path.join(__dirname, 'docs');

// 读取 docs 目录下的所有文档
let localDocs = [];
if (fs.existsSync(docsDir)) {
  localDocs = fs.readdirSync(docsDir)
    .filter(f => f.endsWith('.md') && !f.startsWith('.'))
    .map(f => f.replace('.md', ''));
}

// 读取分类映射
let docCategoryMap = {};
const uploadersFile = path.join(__dirname, 'docs', '.uploaders.json');
if (fs.existsSync(uploadersFile)) {
  const uploaders = JSON.parse(fs.readFileSync(uploadersFile, 'utf8'));
  for (const [filename, info] of Object.entries(uploaders)) {
    if (info.category) {
      docCategoryMap[filename] = info.category;
    }
  }
}

// 手动映射一些文档
docCategoryMap = {
  '项目说明': 'intro',
  '探知未来科技女性培养计划': 'intro',
  ...docCategoryMap
};

// 分类
const introDocs = localDocs.filter(doc => docCategoryMap[doc] === 'intro' || doc === '项目说明' || doc === '探知未来科技女性培养计划');
const processDocs = localDocs.filter(doc => docCategoryMap[doc] === 'process' || doc === '工艺手册' || (!introDocs.includes(doc) && doc !== '项目说明' && doc !== '探知未来科技女性培养计划'));

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