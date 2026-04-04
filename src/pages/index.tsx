import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

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
            浏览工艺手册
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
        <HomepageFeatures />
        <HomepageCTA />
      </main>
    </Layout>
  );
}