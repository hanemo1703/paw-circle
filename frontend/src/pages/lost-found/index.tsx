import type { GetServerSideProps } from 'next';
import { api } from '../../lib/api';
import PostList, { PostItem } from '../../components/PostList';

interface Props {
  posts: PostItem[];
}

// Page combining both "lost" (LOST) and "found" (FOUND) posts
export default function LostFoundPage({ posts }: Props) {
  return (
    <PostList
      title="Tìm chó mèo lạc"
      posts={posts}
      emptyText="Chưa có tin báo mất/tìm thấy nào. Hãy là người đầu tiên đăng tin!"
    />
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
