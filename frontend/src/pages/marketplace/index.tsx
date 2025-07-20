import { useEffect, useState } from 'react';
import type { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { api } from '../../lib/api';
import PostList, { PostItem } from '../../components/PostList';
import Toast, { ToastType } from '../../components/Toast';

interface Props {
  posts: PostItem[];
}

export default function MarketplacePage({ posts }: Props) {
  const router = useRouter();
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  useEffect(() => {
    if (router.isReady && router.query.created === '1') {
      setToast({ message: 'Đăng tin thành công!', type: 'success' });
      router.replace('/marketplace', undefined, { shallow: true });
    }
  }, [router.isReady, router.query.created]);

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <PostList
        title="Cho / trao đổi đồ dùng"
        posts={posts}
        emptyText="Chưa có đồ dùng nào được đăng. Hãy chia sẻ đồ cũ cho bé khác nhé!"
        newPostType="MARKETPLACE"
      />
    </>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  let marketplacePosts: PostItem[] = [];
  let tradePosts: PostItem[] = [];

  try {
    [marketplacePosts, tradePosts] = await Promise.all([
      api.get('/posts?type=MARKETPLACE'),
      api.get('/posts?type=TRADE'),
    ]);
  } catch {
    // Backend not running — still render the page with an empty list
  }

  return { props: { posts: [...marketplacePosts, ...tradePosts] } };
};
