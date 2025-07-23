import { useEffect, useState } from 'react';
import type { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { api } from '../../lib/api';
import PostList, { PostItem } from '../../components/PostList';
import Toast, { ToastType } from '../../components/Toast';

interface Props {
  posts: PostItem[];
}

export default function TradePage({ posts }: Props) {
  const router = useRouter();
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  useEffect(() => {
    if (!router.isReady) return;
    if (router.query.created === '1') {
      setToast({ message: 'Đăng tin thành công!', type: 'success' });
      router.replace('/trade', undefined, { shallow: true });
    } else if (router.query.deleted === '1') {
      setToast({ message: 'Đã xóa bài đăng.', type: 'success' });
      router.replace('/trade', undefined, { shallow: true });
    }
  }, [router.isReady, router.query.created, router.query.deleted]);

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <PostList
        title="Mua bán thú cưng"
        posts={posts}
        emptyText="Chưa có tin mua bán thú cưng nào. Hãy đăng tin đầu tiên!"
        newPostType="TRADE"
      />
    </>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  let posts: PostItem[] = [];
  try {
    posts = await api.get('/posts?type=TRADE');
  } catch {
    // Backend not running — still render the page with an empty list
  }

  return { props: { posts } };
};
