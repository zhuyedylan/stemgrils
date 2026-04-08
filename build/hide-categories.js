// 根据用户角色显示/隐藏侧边栏分类
(function() {
  'use strict';

  var supabaseUrl = 'https://jyhmhksdpjkzkhqlkuqh.supabase.co';
  var supabaseKey = 'sb_publishable_a0zC2QDTxicG-HbxojKkTQ_medLD1JW';

  function getUserStatus() {
    try {
      var userStr = localStorage.getItem('stem_user');
      if (!userStr) return { loggedIn: false, isAdmin: false, username: null };

      var user = JSON.parse(userStr);
      return {
        loggedIn: !!user && !!user.role,
        isAdmin: user && user.role === 'admin',
        username: user ? user.username : null
      };
    } catch (e) {
      return { loggedIn: false, isAdmin: false, username: null };
    }
  }

  function loadPendingDocs() {
    return fetch(supabaseUrl + '/rest/v1/documents?approved=eq.false&hidden=eq.false&select=filename,uploader&order=created_at.desc', {
      headers: {
        'apikey': supabaseKey,
        'Authorization': 'Bearer ' + supabaseKey
      }
    }).then(function(res) { return res.json(); })
    .catch(function() { return []; });
  }

  function updateCategories() {
    var userStatus = getUserStatus();
    var menuItems = document.querySelectorAll('.theme-doc-sidebar-container nav.menu ul li.menu__list-item');

    menuItems.forEach(function(item) {
      var link = item.querySelector('.menu__link--sublist, .menu__link');
      if (!link) return;

      var text = link.textContent.trim();

      // 待审批 - 只对登录用户可见
      if (text === '待审批') {
        if (userStatus.loggedIn) {
          item.style.display = '';
          // 动态加载待审批文档列表
          loadPendingDocs().then(function(docs) {
            var userDocs = docs.filter(function(d) {
              return d.uploader === userStatus.username || userStatus.isAdmin;
            });
            if (userDocs.length > 0) {
              // 找到分类下的链接容器
              var subList = item.querySelector('.menu__list');
              if (subList) {
                // 移除旧的占位链接
                var placeholder = subList.querySelector('a[href="#"]');
                if (placeholder) placeholder.remove();

                // 添加用户的待审批文档链接
                userDocs.forEach(function(doc) {
                  var existingLink = subList.querySelector('a[href="/docs/' + doc.filename + '"]');
                  if (!existingLink) {
                    var docLink = document.createElement('a');
                    docLink.className = 'menu__link';
                    docLink.href = '/docs/' + doc.filename;
                    docLink.textContent = doc.filename;
                    docLink.style.display = 'block';
                    subList.appendChild(docLink);
                  }
                });
              }
            }
          });
        } else {
          item.style.display = 'none';
        }
      }

      // 隐藏 - 只对管理员可见
      if (text === '隐藏') {
        if (userStatus.isAdmin) {
          item.style.display = '';
        } else {
          item.style.display = 'none';
        }
      }
    });
  }

  // 立即执行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateCategories);
  } else {
    updateCategories();
  }

  // 监听登录状态变化
  window.addEventListener('storage', function(e) {
    if (e.key === 'stem_user') {
      updateCategories();
    }
  });

  // 定时检查
  setInterval(updateCategories, 2000);
})();