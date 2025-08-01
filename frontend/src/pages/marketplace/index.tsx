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

export default function MarketplacePage({ posts, total }: Props) {
  const router = useRouter();
  const { showToast, toastNode } = useToast();

  useEffect(() => {
    if (!router.isReady) return;
    if (router.query.created === '1') {
      showToast('Đăng tin thành công!');
      router.replace('/marketplace', undefined, { shallow: true });
    } else if (router.query.deleted === '1') {
      showToast('Đã xóa bài đăng.');
      router.replace('/marketplace', undefined, { shallow: true });
    }
  }, [router.isReady, router.query.created, router.query.deleted]);

  return (
    <>
      {toastNode}
      <PostList
        title="Cho / trao đổi đồ dùng"
        type="SUPPLY"
        initialPosts={posts}
        initialTotal={total}
        emptyText="Chưa có đồ dùng nào được đăng. Hãy chia sẻ đồ cũ cho bé khác nhé!"
        newPostType="SUPPLY"
      />
    </>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  let posts: PostItem[] = [];
  let total = 0;
  try {
    const res = await api.get('/posts?type=SUPPLY&statusCombos=SUPPLY:OPEN&page=1&limit=6');
    posts = res.data;
    total = res.total;
  } catch {
    // Backend not running — still render the page with an empty list
  }

  return { props: { posts, total } };
};
