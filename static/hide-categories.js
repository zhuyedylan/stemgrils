// 根据用户角色显示/隐藏侧边栏分类
(function() {
  'use strict';

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

  function updateSidebarVisibility() {
    var userStatus = getUserStatus();
    var menuItems = document.querySelectorAll('.theme-doc-sidebar-container nav.menu ul li.menu__list-item');

    menuItems.forEach(function(item) {
      var link = item.querySelector('.menu__link--sublist');
      if (!link) return;

      var text = link.textContent.trim();

      // "隐藏" 分类 - 只对管理员可见
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
    document.addEventListener('DOMContentLoaded', updateSidebarVisibility);
  } else {
    updateSidebarVisibility();
  }

  // 监听登录状态变化
  window.addEventListener('storage', function(e) {
    if (e.key === 'stem_user') {
      updateSidebarVisibility();
    }
  });
})();