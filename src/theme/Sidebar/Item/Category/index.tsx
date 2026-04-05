import React, { useState, useEffect } from 'react';
import DefaultSidebar from '@theme-original/Sidebar/Item/Category';
import { useThemeConfig } from '@docusaurus/theme-common';

function getUserRole() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('userRole') || localStorage.getItem('role');
}

function getUserStatus() {
  if (typeof window === 'undefined') return { loggedIn: false, isAdmin: false };
  const role = getUserRole();
  return {
    loggedIn: !!role,
    isAdmin: role === 'admin'
  };
}

export default function CustomCategory(props) {
  const [userStatus, setUserStatus] = useState({ loggedIn: false, isAdmin: false });

  useEffect(() => {
    setUserStatus(getUserStatus());

    const handleStorage = () => {
      setUserStatus(getUserStatus());
    };

    window.addEventListener('storage', handleStorage);
    const interval = setInterval(() => {
      setUserStatus(getUserStatus());
    }, 1000);

    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, []);

  const label = props.label;

  // 使用 CSS 类隐藏，而不是返回 null
  // 这样可以避免 SSR/ hydration 不匹配问题
  let hiddenClass = '';
  if (label === '待审批' && !userStatus.loggedIn) {
    hiddenClass = 'sidebar-category-hidden';
  } else if (label === '隐藏' && !userStatus.isAdmin) {
    hiddenClass = 'sidebar-category-hidden';
  }

  return (
    <div className={hiddenClass}>
      <DefaultSidebar {...props} />
    </div>
  );
}