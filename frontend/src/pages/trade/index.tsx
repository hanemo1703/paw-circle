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

export default function TradePage({ posts, total }: Props) {
  const router = useRouter();
  const { showToast, toastNode } = useToast();

  useEffect(() => {
    if (!router.isReady) return;
    if (router.query.created === '1') {
      showToast('Đăng tin thành công!');
      router.replace('/trade', undefined, { shallow: true });
    } else if (router.query.deleted === '1') {
      showToast('Đã xóa bài đăng.');
      router.replace('/trade', undefined, { shallow: true });
    }
  }, [router.isReady, router.query.created, router.query.deleted]);

  return (
    <>
      {toastNode}
      <PostList
        title="Mua bán thú cưng"
        type="TRADE"
        initialPosts={posts}
        initialTotal={total}
        emptyText="Chưa có tin mua bán thú cưng nào. Hãy đăng tin đầu tiên!"
        newPostType="TRADE"
      />
    </>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  let posts: PostItem[] = [];
  let total = 0;
  try {
    const res = await api.get('/posts?type=TRADE&statusCombos=TRADE:OPEN&page=1&limit=6');
    posts = res.data;
    total = res.total;
  } catch {
    // Backend not running — still render the page with an empty list
  }

  return { props: { posts, total } };
};
