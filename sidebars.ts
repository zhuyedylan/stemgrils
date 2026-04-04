import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';
const fs = require('fs');
const path = require('path');

const docsDir = path.join(__dirname, 'docs');
let localDocs = [];
if (fs.existsSync(docsDir)) {
  localDocs = fs.readdirSync(docsDir).filter(f => f.endsWith('.md') && !f.startsWith('.')).map(f => f.replace('.md', ''));
}

const categories = [
  { id: 'intro', name: '项目介绍', order: 0 },
  { id: 'process', name: '工艺手册', order: 1 },
  { id: 'pending', name: '待审批', order: 99 },
  { id: 'hidden', name: '隐藏', order: 100 }
];

const docCategoryMap = {
  '项目说明': 'intro',
  '探知未来科技女性培养计划': 'intro',
  '再生PLA与咖啡渣混合打印线材工艺指南': 'process',
  '家庭废旧ABS制品再生3d打印线材工艺手册': 'process'
};

const sidebarItems = categories.map(cat => {
  const docs = localDocs.filter(doc => docCategoryMap[doc] === cat.id);

  // 如果分类没有文档，添加一个占位链接
  if (docs.length === 0) {
    return {
      type: 'link',
      label: cat.name,
      href: '#'
    };
  }

  return {
    type: 'category',
    label: cat.name,
    collapsed: false,
    items: docs
  };
});

const sidebars: SidebarsConfig = {
  tutorialSidebar: sidebarItems
};

export default sidebars;