import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';
const fs = require('fs');
const path = require('path');

// 读取目录配置
let categories = [];
const categoriesFile = path.join(__dirname, 'docs', '.categories.json');
if (fs.existsSync(categoriesFile)) {
  categories = JSON.parse(fs.readFileSync(categoriesFile, 'utf8'));
}
// 如果没有目录，创建默认目录
if (categories.length === 0) {
  categories = [
    { id: 'intro', name: '简介', order: 0, allowUserUpload: true },
    { id: 'process', name: '工艺手册', order: 1, allowUserUpload: true }
  ];
}
categories.sort((a, b) => a.order - b.order);

// 读取上传者记录获取文档所属目录
let uploaders = {};
const uploadersFile = path.join(__dirname, 'docs', '.uploaders.json');
if (fs.existsSync(uploadersFile)) {
  uploaders = JSON.parse(fs.readFileSync(uploadersFile, 'utf8'));
}

// 获取docs目录下的所有md文件
const docsDir = path.join(__dirname, 'docs');
const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.md') && !f.startsWith('.'));

// 按目录分组文档
const categoryDocs = {};
categories.forEach(cat => {
  categoryDocs[cat.id] = [];
});

files.forEach(file => {
  const fileName = file.replace('.md', '');
  // 获取文档的分类，如果没有则使用第一个分类
  let docCategory = uploaders[fileName]?.category;
  if (!docCategory || !categoryDocs[docCategory]) {
    // 默认分配到第一个目录
    docCategory = categories.length > 0 ? categories[0].id : 'intro';
  }
  if (!categoryDocs[docCategory]) {
    categoryDocs[docCategory] = [];
  }
  categoryDocs[docCategory].push(fileName);
});

// 确保至少有一个分类显示所有文档
const allDocs = files.map(f => f.replace('.md', ''));

// 构建侧边栏
const sidebarItems = categories.map(cat => {
  const docs = categoryDocs[cat.id] || [];
  if (docs.length === 0) {
    return null;
  }
  return {
    type: 'category',
    label: cat.name,
    collapsed: false,  // 默认展开
    items: docs
  };
}).filter(item => item !== null);

// 如果没有生成任何侧边栏项，把所有文档放到一个默认分类
if (sidebarItems.length === 0 && allDocs.length > 0) {
  sidebarItems.push({
    type: 'category',
    label: '文档',
    items: allDocs
  });
}

const sidebars: SidebarsConfig = {
  tutorialSidebar: sidebarItems
};

export default sidebars;