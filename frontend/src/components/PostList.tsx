import styles from './PostList.module.scss';

export interface PostItem {
  id: string;
  title: string;
  description: string;
  type: 'LOST' | 'FOUND' | 'ADOPTION' | 'MARKETPLACE';
  price?: number;
  address?: string;
}

const BADGE_CLASS: Record<PostItem['type'], string> = {
  LOST: 'badge badge-lost',
  FOUND: 'badge badge-found',
  ADOPTION: 'badge badge-adoption',
  MARKETPLACE: 'badge badge-found',
};

const BADGE_LABEL: Record<PostItem['type'], string> = {
  LOST: 'Bị lạc',
  FOUND: 'Đã tìm thấy',
  ADOPTION: 'Cần người nuôi',
  MARKETPLACE: 'Đồ dùng',
};

export default function PostList({
  title,
  posts,
  emptyText,
}: {
  title: string;
  posts: PostItem[];
  emptyText: string;
}) {
  return (
    <div className={`container ${styles.wrapper}`}>
      <div className={styles.header}>
        <h1 className={styles.title}>{title}</h1>
        <button className="btn btn-primary">+ Đăng tin mới</button>
      </div>

      {posts.length === 0 ? (
        <p className={styles.empty}>{emptyText}</p>
      ) : (
        <div className={styles.grid}>
          {posts.map((post) => (
            <article key={post.id} className={styles.card}>
              <div className={styles.imagePlaceholder}>🐾</div>
              <div className={styles.cardBody}>
                <span className={BADGE_CLASS[post.type]}>{BADGE_LABEL[post.type]}</span>
                <h3 className={styles.cardTitle}>{post.title}</h3>
                <p className={styles.cardDesc}>{post.description}</p>
                {post.address && <p className={styles.cardDesc}>📍 {post.address}</p>}
                {post.price !== undefined && (
                  <p className={styles.cardDesc}>💰 {post.price.toLocaleString('vi-VN')}đ</p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
