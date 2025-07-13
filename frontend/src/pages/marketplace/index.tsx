import type { GetServerSideProps } from 'next';
import { api } from '../../lib/api';
import PostList, { PostItem } from '../../components/PostList';

interface Props {
  posts: PostItem[];
}

export default function MarketplacePage({ posts }: Props) {
  return (
    <PostList
      title="Cho / trao đổi đồ dùng"
      posts={posts}
      emptyText="Chưa có đồ dùng nào được đăng. Hãy chia sẻ đồ cũ cho bé khác nhé!"
    />
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  let posts: PostItem[] = [];
  try {
    posts = await api.get('/posts?type=MARKETPLACE');
  } catch {
    // Backend not running — still render the page with an empty list
  }

  return { props: { posts } };
};
