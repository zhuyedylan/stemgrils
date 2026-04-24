/**
 * 后台同步脚本 - 定期从 Supabase 下载已审批的文档
 * 用于本地开发环境，审批后自动同步
 */

const { exec } = require('child_process');
const path = require('path');

console.log('🔄 文档自动同步已启动 (每 30 秒同步一次)');
console.log('💡 审批新文档后，将在 30 秒内自动同步到本地');

// 立即同步一次
runSync();

// 每 30 秒同步一次
setInterval(runSync, 30000);

function runSync() {
  const scriptPath = path.join(__dirname, 'download-docs.js');
  exec(`node ${scriptPath}`, { cwd: path.join(__dirname, '..') }, (err, stdout, stderr) => {
    if (err) {
      console.error('❌ 同步错误:', err.message);
      return;
    }
    if (stdout) {
      // 只显示关键信息
      const lines = stdout.split('\n').filter(l =>
        l.includes('Saved:') ||
        l.includes('Deleted:') ||
        l.includes('approved documents') ||
        l.includes('completed')
      );
      if (lines.length > 0) {
        console.log('📄', lines.join(' | '));
      }
    }
  });
}