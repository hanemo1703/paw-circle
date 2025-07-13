import type { GetServerSideProps } from 'next';
import { api } from '../../lib/api';
import PostList, { PostItem } from '../../components/PostList';

interface Props {
  posts: PostItem[];
}

export default function AdoptionPage({ posts }: Props) {
  return (
    <PostList
      title="Tìm người nhận nuôi"
      posts={posts}
      emptyText="Chưa có bé nào cần tìm nhà mới. Hãy đăng tin đầu tiên!"
    />
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