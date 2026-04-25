import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import BrowserOnly from '@docusaurus/BrowserOnly';

import styles from './index.module.css';

function Feature({title, description, icon}: {title: string; description: string; icon: string}) {
  return (
    <div className={styles.featureCard}>
      <div className={styles.featureIcon}>{icon}</div>
      <Heading as="h3">{title}</Heading>
      <p>{description}</p>
    </div>
  );
}

function AdminPanel() {
  const [deploying, setDeploying] = React.useState(false);
  const [user, setUser] = React.useState<any>(null);

  React.useEffect(() => {
    const savedUser = localStorage.getItem('stem_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleDeploy = async () => {
    setDeploying(true);
    try {
      await fetch('https://api.vercel.com/v1/integrations/deploy/prj_pdsffwCNPJcY904M0JMZUtzRjOCg/1PuxGzixwB', { method: 'POST' });
    } catch (e) {}
    setDeploying(false);
  };

  if (!user || user.role !== 'admin') return null;

  return (
    <div style={{
      padding: '20px',
      backgroundColor: '#fef3c7',
      borderRadius: '12px',
      border: '2px solid #f59e0b',
      marginBottom: '30px',
      maxWidth: '800px',
      margin: '0 auto 30px auto'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '15px', color: '#92400e', fontSize: '18px' }}>
        ⚙️ 系统管理
      </div>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '15px' }}>
        <button
          onClick={handleDeploy}
          disabled={deploying}
          style={{
            padding: '12px 30px',
            fontSize: '16px',
            backgroundColor: deploying ? '#9ca3af' : '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: deploying ? 'not-allowed' : 'pointer',
            fontWeight: 'bold'
          }}
        >
          {deploying ? '⏳ 部署中...' : '🚀 发布网站'}
        </button>
        <Link to="/upload" style={{
          padding: '12px 30px',
          fontSize: '16px',
          backgroundColor: '#10b981',
          color: 'white',
          borderRadius: '8px',
          textDecoration: 'none',
          display: 'inline-flex',
          alignItems: 'center'
        }}>
          📤 上传文档
        </Link>
      </div>
      <div style={{ padding: '15px', backgroundColor: 'white', borderRadius: '8px' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#374151' }}>管理功能</div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Link to="/manage" style={{ padding: '8px 16px', fontSize: '13px', backgroundColor: '#3b82f6', color: 'white', borderRadius: '5px', textDecoration: 'none' }}>
            📚 文档管理
          </Link>
          <Link to="/categories" style={{ padding: '8px 16px', fontSize: '13px', backgroundColor: '#10b981', color: 'white', borderRadius: '5px', textDecoration: 'none' }}>
            📁 目录管理
          </Link>
          <Link to="/users" style={{ padding: '8px 16px', fontSize: '13px', backgroundColor: '#8b5cf6', color: 'white', borderRadius: '5px', textDecoration: 'none' }}>
            👥 用户管理
          </Link>
          <Link to="/logs" style={{ padding: '8px 16px', fontSize: '13px', backgroundColor: '#f59e0b', color: 'white', borderRadius: '5px', textDecoration: 'none' }}>
            📋 查看日志
          </Link>
        </div>
      </div>
      <div style={{ marginTop: '10px', fontSize: '14px', color: '#78350f' }}>
        💡 提示：编辑、审批、排序操作后需要点击"发布网站"才能更新静态页面
      </div>
    </div>
  );
}

function HomepageHeader() {
  return (
    <header className={styles.heroBanner}>
      <div className={styles.heroContent}>
        <div className={styles.heroIcon}>♻️</div>
        <Heading as="h1" className={styles.heroTitle}>
          废旧高分子材料再生3D打印
        </Heading>
        <p className={styles.heroSubtitle}>
          将家庭和校园中的废旧塑料转化为3D打印材料<br/>
          让环保与创意走进课堂
        </p>
        <div className={styles.heroButtons}>
          <Link className={styles.primaryButton} to="/docs/项目说明">
            开始浏览
          </Link>
        </div>
      </div>
    </header>
  );
}

function HomepageFeatures() {
  const features = [
    {
      title: '环保教育',
      description: '培养青少年的环保意识，学习资源循环利用的科学方法',
      icon: '🌱',
    },
    {
      title: '科技创新',
      description: '探索3D打印技术，将废旧材料转化为创意作品',
      icon: '🔬',
    },
    {
      title: '动手实践',
      description: '通过实验操作，掌握高分子材料再生的基本工艺',
      icon: '🛠️',
    },
  ];

  return (
    <section className={styles.features}>
      <div className="container">
        <div className={styles.featuresGrid}>
          {features.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}

function HomepageCTA() {
  return (
    <section className={styles.cta}>
      <div className="container">
        <div className={styles.ctaContent}>
          <Heading as="h2">中国妇基会—三星"探知未来科技女性培养计划"</Heading>
          <p>加入我们的行列，学习废旧材料再生技术，用科技创新守护地球家园</p>
          <Link className={styles.primaryButton} to="/docs/探知未来科技女性培养计划">
            了解更多
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  return (
    <Layout title="首页" description="废旧高分子材料再生3D打印项目">
      <HomepageHeader />
      <main>
        <BrowserOnly fallback={<div style={{ textAlign: 'center', padding: '50px' }}>加载中...</div>}>
          {() => <AdminPanel />}
        </BrowserOnly>
        <HomepageFeatures />
        <HomepageCTA />
      </main>
    </Layout>
  );
}