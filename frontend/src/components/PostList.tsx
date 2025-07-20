import Link from 'next/link';
import { toAssetUrl } from '../lib/api';
import styles from './PostList.module.scss';

export interface PostItem {
  id: string;
  title: string;
  description: string;
  type: 'LOST' | 'FOUND' | 'ADOPTION' | 'MARKETPLACE' | 'TRADE';
  price?: number;
  address?: string;
  images?: string[];
  pets?: unknown[];
}

const BADGE_CLASS: Record<PostItem['type'], string> = {
  LOST: 'badge badge-lost',
  FOUND: 'badge badge-found',
  ADOPTION: 'badge badge-adoption',
  MARKETPLACE: 'badge badge-found',
  TRADE: 'badge badge-trade',
};

const BADGE_LABEL: Record<PostItem['type'], string> = {
  LOST: 'Bị lạc',
  FOUND: 'Đã tìm thấy',
  ADOPTION: 'Cần người nuôi',
  MARKETPLACE: 'Đồ dùng',
  TRADE: 'Mua bán boss',
};

export default function PostList({
  title,
  posts,
  emptyText,
  newPostType,
}: {
  title: string;
  posts: PostItem[];
  emptyText: string;
  newPostType: PostItem['type'];
}) {
  return (
    <div className={`container ${styles.wrapper}`}>
      <div className={styles.header}>
        <h1 className={styles.title}>{title}</h1>
        <Link href={`/posts/new?type=${newPostType}`} className="btn btn-primary">
          + Đăng tin mới
        </Link>
      </div>

      {posts.length === 0 ? (
        <p className={styles.empty}>{emptyText}</p>
      ) : (
        <div className={styles.grid}>
          {posts.map((post) => (
            <article key={post.id} className={styles.card}>
              {post.images && post.images.length > 0 ? (
                <img className={styles.cardImage} src={toAssetUrl(post.images[0])} alt={post.title} />
              ) : (
                <div className={styles.imagePlaceholder}>🐾</div>
              )}
              <div className={styles.cardBody}>
                <span className={BADGE_CLASS[post.type]}>{BADGE_LABEL[post.type]}</span>
                {post.pets && post.pets.length > 1 && (
                  <span className={styles.petCountChip}>{post.pets.length} bé</span>
                )}
                <h3 className={styles.cardTitle}>{post.title}</h3>
                <p className={styles.cardDesc}>{post.description}</p>
                {post.address && <p className={styles.cardDesc}>📍 {post.address}</p>}
                {post.price != null && (
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
