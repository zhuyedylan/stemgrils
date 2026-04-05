import React, { useState, useEffect } from 'react';
import DefaultSidebar from '@theme-original/Sidebar/Item/Category';
import Link from '@docusaurus/Link';

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

    // 监听登录状态变化
    const handleStorage = () => {
      setUserStatus(getUserStatus());
    };

    window.addEventListener('storage', handleStorage);
    // 监听 localStorage 变化（同一页面内）
    const interval = setInterval(() => {
      setUserStatus(getUserStatus());
    }, 1000);

    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, []);

  const label = props.label;

  // 待审批 - 只对登录用户可见
  if (label === '待审批' && !userStatus.loggedIn) {
    return null;
  }

  // 隐藏 - 只对管理员可见
  if (label === '隐藏' && !userStatus.isAdmin) {
    return null;
  }

  return <DefaultSidebar {...props} />;
}