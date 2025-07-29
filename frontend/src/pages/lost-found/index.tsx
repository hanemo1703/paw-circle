import { useEffect } from 'react';
import type { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { api } from '../../lib/api';
import PostList, { PostItem } from '../../components/PostList';
import { useToast } from '../../lib/useToast';

interface Props {
  posts: PostItem[];
  total: number;
}

export default function LostFoundPage({ posts, total }: Props) {
  const router = useRouter();
  const { showToast, toastNode } = useToast();

  useEffect(() => {
    if (!router.isReady) return;
    if (router.query.created === '1') {
      showToast('Đăng tin thành công!');
      router.replace('/lost-found', undefined, { shallow: true });
    } else if (router.query.deleted === '1') {
      showToast('Đã xóa bài đăng.');
      router.replace('/lost-found', undefined, { shallow: true });
    }
  }, [router.isReady, router.query.created, router.query.deleted]);

  return (
    <>
      {toastNode}
      <PostList
        title="Tìm chó mèo lạc"
        type="LOST"
        initialPosts={posts}
        initialTotal={total}
        emptyText="Chưa có tin báo lạc nào. Hãy là người đầu tiên đăng tin!"
        newPostType="LOST"
      />
    </>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  let posts: PostItem[] = [];
  let total = 0;

  try {
    const res = await api.get('/posts?type=LOST&statusCombos=LOST:OPEN&page=1&limit=6');
    posts = res.data;
    total = res.total;
  } catch {
    // Backend not running — still render the page with an empty list
  }

  return { props: { posts, total } };
};
