import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../lib/auth';
import PostList from '../../components/PostList';

export default function MyPostsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    setCheckingAuth(false);
  }, []);

  useEffect(() => {
    if (!checkingAuth && !isAuthenticated) {
      router.replace('/login');
    }
  }, [checkingAuth, isAuthenticated, router]);

  if (checkingAuth || !user) {
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
