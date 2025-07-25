import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { ShieldCheck, Users, Zap } from 'lucide-react';
import { fetchSiteStats, SiteStats } from '../../lib/stats';
import styles from './index.module.scss';

type Props = SiteStats;

const VALUES = [
  {
    icon: Zap,
    cardClass: 'valueCardFast',
    title: 'Nhanh chóng',
    desc: 'Kết nối người tìm và người thấy trong thời gian ngắn nhất',
  },
  {
    icon: ShieldCheck,
    cardClass: 'valueCardTrust',
    title: 'Đáng tin cậy',
    desc: 'Cộng đồng minh bạch, an toàn, luôn đặt lợi ích thú cưng lên hàng đầu',
  },
  {
    icon: Users,
    cardClass: 'valueCardCommunity',
    title: 'Vì cộng đồng',
    desc: 'Miễn phí, phi lợi nhuận — xây dựng bởi những người yêu thú cưng',
  },
];

export default function AboutPage({ reunitedCount, pendingAdoptionCount, activeCampaignCount }: Props) {
  return (
    <div className={styles.wrapper}>
      <section className={`container ${styles.hero}`}>
        <div className={styles.badge}>Về chúng tôi</div>
        <h1 className={styles.heroTitle}>Vì mọi bé thú cưng đều xứng đáng có một mái nhà</h1>
        <p className={styles.heroSubtitle}>
          PawCircle ra đời từ mong muốn giúp những bé thú cưng đi lạc nhanh chóng đoàn tụ với gia đình, và
          những bé chưa có nhà tìm được người chăm sóc phù hợp.
        </p>
      </section>

      <section className={`container ${styles.heroImageSection}`}>
        <div className={styles.heroImage}>
          <Users size={72} strokeWidth={1.5} />
        </div>
      </section>

      <section className={`container ${styles.statsSection}`}>
        <div className={styles.statBlock}>
          <div className={`${styles.statNum} ${styles.statReunited}`}>
            {reunitedCount.toLocaleString('vi-VN')}
          </div>
          <div className={styles.statLabel}>bé đã đoàn tụ</div>
        </div>
        <div className={styles.statBlock}>
          <div className={`${styles.statNum} ${styles.statAdopt}`}>
            {pendingAdoptionCount.toLocaleString('vi-VN')}
          </div>
          <div className={styles.statLabel}>bé đang chờ nhà mới</div>
        </div>
        <div className={styles.statBlock}>
          <div className={`${styles.statNum} ${styles.statCampaign}`}>
            {activeCampaignCount.toLocaleString('vi-VN')}
          </div>
          <div className={styles.statLabel}>chiến dịch gây quỹ</div>
        </div>
      </section>

      <section className={`container ${styles.valuesSection}`}>
        <h2 className={styles.valuesTitle}>Giá trị của chúng tôi</h2>
        <div className={styles.valueGrid}>
          {VALUES.map(({ icon: Icon, cardClass, title, desc }) => (
            <div key={title} className={`${styles.valueCard} ${styles[cardClass]}`}>
              <div className={styles.valueIcon}>
                <Icon size={22} />
              </div>
              <div className={styles.valueCardTitle}>{title}</div>
              <div className={styles.valueCardDesc}>{desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section className={`container ${styles.ctaSection}`}>
        <Link href="/register" className="btn btn-primary">
          Tham gia cộng đồng ngay
        </Link>
      </section>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  const stats = await fetchSiteStats();
  return { props: stats };
};
