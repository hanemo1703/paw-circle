import type { GetServerSideProps } from 'next';
import { api, toAssetUrl } from '../../lib/api';
import styles from './[id].module.scss';

interface PublicUser {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  avatarUrl?: string;
  isVerifiedOrg: boolean;
  createdAt: string;
}

interface Props {
  user: PublicUser | null;
}

export default function PublicProfilePage({ user }: Props) {
  if (!user) {
    return (
      <div className={`container ${styles.wrapper}`}>
        <p className={styles.notFound}>Không tìm thấy người dùng.</p>
      </div>
    );
  }

  return (
    <div className={`container ${styles.wrapper}`}>
      <div className={styles.card}>
        <img className={styles.avatar} src={toAssetUrl(user.avatarUrl) || '/logo.jpg'} alt={user.name} />
        <div className={styles.nameRow}>
          <h1 className={styles.name}>{user.name}</h1>
          {user.isVerifiedOrg && <span className={styles.verifiedBadge}>Tổ chức đã xác minh</span>}
        </div>
        {user.phone && <p className={styles.field}>📞 {user.phone}</p>}
        {user.email && <p className={styles.field}>✉️ {user.email}</p>}
        <p className={styles.memberSince}>
          Thành viên từ {new Date(user.createdAt).toLocaleDateString('vi-VN')}
        </p>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const id = ctx.params?.id as string;
  try {
    const user = await api.get(`/users/${id}`);
    return { props: { user } };
  } catch {
    return { props: { user: null } };
  }
};
