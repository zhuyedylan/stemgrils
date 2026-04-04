const fs = require('fs');
const path = require('path');

const testContent = {
  'project-intro': "---
id: project-intro
title: 项目介绍
---

# 项目介绍

本项目是关于废旧高分子材料再生3D打印的工艺手册。"
};

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { filePath } = req.query;
  if (!filePath) {
    return res.status(400).json({ error: '缺少文件路径' });
  }

  const fileName = filePath.replace('.md', '');
  const content = testContent[fileName];

  if (!content) {
    return res.status(404).json({ error: '文件不存在' });
  }

  res.json({ content });
};
