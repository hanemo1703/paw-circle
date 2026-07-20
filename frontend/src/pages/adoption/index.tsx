import { useEffect, useState } from 'react';
import type { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { api } from '../../lib/api';
import PostList, { PostItem } from '../../components/PostList';
import Toast, { ToastType } from '../../components/Toast';

interface Props {
  posts: PostItem[];
}

export default function AdoptionPage({ posts }: Props) {
  const router = useRouter();
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  useEffect(() => {
    if (router.isReady && router.query.created === '1') {
      setToast({ message: 'Đăng tin thành công!', type: 'success' });
      router.replace('/adoption', undefined, { shallow: true });
    }
  }, [router.isReady, router.query.created]);

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <PostList
        title="Tìm người nhận nuôi"
        posts={posts}
        emptyText="Chưa có bé nào cần tìm nhà mới. Hãy đăng tin đầu tiên!"
        newPostType="ADOPTION"
      />
    </>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  let posts: PostItem[] = [];
  try {
    posts = await api.get('/posts?type=ADOPTION');
  } catch {
    // Backend not running — still render the page with an empty list
  }

  return { props: { posts } };
};