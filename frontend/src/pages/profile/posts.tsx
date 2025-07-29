import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../lib/auth';
import PostList from '../../components/PostList';

export default function MyPostsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  if (!user) {
    return null;
  }

  return (
    <PostList
      title="Bài post của tôi"
      authorId={user.id}
      emptyText="Bạn chưa đăng bài nào."
      newPostType="LOST"
    />
  );
}
