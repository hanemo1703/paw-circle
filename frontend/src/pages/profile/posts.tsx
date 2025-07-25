import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import PostList, { PostItem } from '../../components/PostList';

export default function MyPostsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [posts, setPosts] = useState<PostItem[]>([]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!user) return;
    api
      .get(`/posts?authorId=${user.id}`)
      .then(setPosts)
      .catch(() => {
        // Backend not running — still render the page with an empty list
      });
  }, [user]);

  if (!user) {
    return null;
  }

  return (
    <PostList
      title="Bài post của tôi"
      posts={posts}
      emptyText="Bạn chưa đăng bài nào."
      newPostType="LOST"
    />
  );
}
