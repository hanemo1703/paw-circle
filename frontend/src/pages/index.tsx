import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { ArrowRight, HeartHandshake, Home, MapPin, PawPrint, ShoppingBag } from 'lucide-react';
import { fetchSiteStats, SiteStats } from '../lib/stats';
import styles from './index.module.scss';

type Props = SiteStats;

export default function LandingPage({ reunitedCount, pendingAdoptionCount, activeCampaignCount }: Props) {
  return (
    <div className={styles.wrapper}>
      <section className={`container ${styles.hero}`}>
        <div>
          {reunitedCount > 0 && (
            <div className={styles.badge}>{reunitedCount.toLocaleString('vi-VN')} bé đã đoàn tụ</div>
          )}
          <h1 className={styles.heroTitle}>
            Không bé nào
            <br />
            đi lạc mãi mãi
          </h1>
          <p className={styles.heroSubtitle}>
            Đăng tin, kết nối cộng đồng yêu thú cưng quanh bạn, và đoàn tụ với người bạn bốn chân chỉ trong
            vài giờ.
          </p>
          <div className={styles.heroActions}>
            <Link href="/posts/new?type=LOST" className="btn btn-primary">
              Đăng tin lạc <ArrowRight size={18} />
            </Link>
            <Link href="/adoption" className="btn btn-outline">
              Xem thú cần nhận nuôi
            </Link>
          </div>
        </div>
        <div className={styles.heroImage}>
          <PawPrint size={96} strokeWidth={1.5} />
        </div>
      </section>

      <section className={`container ${styles.quadSection}`}>
        <div className={styles.quadGrid}>
          <Link href="/lost-found" className={`${styles.quadCard} ${styles.quadLost}`}>
            <MapPin size={32} />
            <div>
              <div className={styles.quadTitle}>Tìm thú lạc</div>
              <div className={styles.quadDesc}>Đăng tin, xem bản đồ tin lạc gần bạn</div>
            </div>
          </Link>
          <Link href="/adoption" className={`${styles.quadCard} ${styles.quadAdopt}`}>
            <Home size={32} />
            <div>
              <div className={styles.quadTitle}>Nhận nuôi</div>
              <div className={styles.quadDesc}>
                {pendingAdoptionCount > 0
                  ? `${pendingAdoptionCount.toLocaleString('vi-VN')} bé đang chờ một mái ấm mới`
                  : 'Tìm một mái ấm mới cho các bé'}
              </div>
            </div>
          </Link>
          <Link href="/marketplace" className={`${styles.quadCard} ${styles.quadMarket}`}>
            <ShoppingBag size={32} />
            <div>
              <div className={styles.quadTitle}>Chợ đồ thú cưng</div>
              <div className={styles.quadDesc}>Mua bán đồ dùng cũ, giá tốt</div>
            </div>
          </Link>
          <Link href="/donations" className={`${styles.quadCard} ${styles.quadDonate}`}>
            <HeartHandshake size={32} />
            <div>
              <div className={styles.quadTitle}>Gây quỹ</div>
              <div className={styles.quadDesc}>
                {activeCampaignCount > 0
                  ? `${activeCampaignCount.toLocaleString('vi-VN')} chiến dịch đang cần hỗ trợ`
                  : 'Chung tay hỗ trợ các bé cần giúp đỡ'}
              </div>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  const stats = await fetchSiteStats();
  return { props: stats };
};
