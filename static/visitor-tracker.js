// 访客追踪脚本 - 记录访问者IP和地理位置信息
(function() {
  const SUPABASE_URL = 'https://jyhmhksdpjkzkhqlkuqh.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5aG1oa3NkcGpremtocWxrdXFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMDEwNTYsImV4cCI6MjA5MDg3NzA1Nn0.e5iYCkY-UNumjWWnsPugc5nIUKOkITccuhODLPBCiwc';

  // 检查是否已经记录过（避免同一会话重复记录）
  const sessionKey = 'visitor_recorded_' + Date.now().toString().slice(0, -5); // 按小时缓存
  if (localStorage.getItem(sessionKey)) {
    return;
  }

  // 获取当前页面路径
  const page = window.location.pathname;

  // 获取访客信息
  fetch('http://ip-api.com/json/?lang=zh-CN')
    .then(res => res.json())
    .then(data => {
      if (data.status === 'success') {
        // 发送到 Supabase
        return fetch(`${SUPABASE_URL}/rest/v1/visitors`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            ip: data.query,
            country: data.country,
            region: data.regionName,
            city: data.city,
            timezone: data.timezone,
            isp: data.isp,
            page: page
          })
        });
      }
    })
    .then(() => {
      // 标记已记录
      localStorage.setItem(sessionKey, 'true');
    })
    .catch(err => {
      console.log('Visitor tracking error:', err);
    });
})();