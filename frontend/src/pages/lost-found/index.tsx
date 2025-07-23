import { useEffect, useState } from 'react';
import type { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { api } from '../../lib/api';
import PostList, { PostItem } from '../../components/PostList';
import Toast, { ToastType } from '../../components/Toast';

interface Props {
  posts: PostItem[];
}

// Page combining both "lost" (LOST) and "found" (FOUND) posts
export default function LostFoundPage({ posts }: Props) {
  const router = useRouter();
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  useEffect(() => {
    if (!router.isReady) return;
    if (router.query.created === '1') {
      setToast({ message: 'Đăng tin thành công!', type: 'success' });
      router.replace('/lost-found', undefined, { shallow: true });
    } else if (router.query.deleted === '1') {
      setToast({ message: 'Đã xóa bài đăng.', type: 'success' });
      router.replace('/lost-found', undefined, { shallow: true });
    }
  }, [router.isReady, router.query.created, router.query.deleted]);

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <PostList
        title="Tìm chó mèo lạc"
        posts={posts}
        emptyText="Chưa có tin báo mất/tìm thấy nào. Hãy là người đầu tiên đăng tin!"
        newPostType="LOST"
      />
    </>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  let lostPosts: PostItem[] = [];
  let foundPosts: PostItem[] = [];

  try {
    [lostPosts, foundPosts] = await Promise.all([
      api.get('/posts?type=LOST'),
      api.get('/posts?type=FOUND'),
    ]);
  } catch {
    // Backend not running — still render the page with an empty list
  }

  return { props: { posts: [...lostPosts, ...foundPosts] } };
};
