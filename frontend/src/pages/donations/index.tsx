import type { GetServerSideProps } from 'next';
import { api } from '../../lib/api';
import styles from './index.module.scss';

interface Campaign {
  id: string;
  title: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
}

interface Props {
  campaigns: Campaign[];
}

export default function DonationsPage({ campaigns }: Props) {
  return (
    <div className={`container ${styles.wrapper}`}>
      <div className={styles.header}>
        <h1 className={styles.title}>Gây quỹ chữa bệnh cho thú cưng</h1>
        <button className="btn btn-primary">+ Tạo chiến dịch</button>
      </div>

      {campaigns.length === 0 ? (
        <p className={styles.empty}>
          Chưa có chiến dịch nào đang gây quỹ. Cá nhân hoặc tổ chức cứu hộ có
          thể tạo chiến dịch đầu tiên.
        </p>
      ) : (
        <div className={styles.grid}>
          {campaigns.map((c) => {
            const percent = Math.min(100, Math.round((c.currentAmount / c.targetAmount) * 100));
            return (
              <article key={c.id} className={styles.card}>
                <h3>{c.title}</h3>
                <p>{c.description}</p>
                <div className={styles.progressTrack}>
                  <div className={styles.progressFill} style={{ width: `${percent}%` }} />
                </div>
                <div className={styles.meta}>
                  <span>{c.currentAmount.toLocaleString('vi-VN')}đ đã quyên góp</span>
                  <span>Mục tiêu: {c.targetAmount.toLocaleString('vi-VN')}đ</span>
                </div>
                <button className="btn btn-primary" style={{ marginTop: 16, width: '100%' }}>
                  Đóng góp ngay
                </button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  let campaigns: Campaign[] = [];
  try {
    campaigns = await api.get('/donations/campaigns');
  } catch {
    // Backend not running — still render the page with an empty list
  }

  return { props: { campaigns } };
};
