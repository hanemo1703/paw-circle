import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import styles from './FacebookAuthButton.module.scss';

interface FacebookAuthButtonProps {
  onSuccess: () => void;
  onError: (message: string) => void;
}

const FACEBOOK_APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;

export default function FacebookAuthButton({ onSuccess, onError }: FacebookAuthButtonProps) {
  const { login } = useAuth();
  const [sdkReady, setSdkReady] = useState(false);

  useEffect(() => {
    if (!FACEBOOK_APP_ID) return;
    const interval = setInterval(() => {
      if (window.FB) {
        setSdkReady(true);
        clearInterval(interval);
      }
    }, 200);
    return () => clearInterval(interval);
  }, []);

  if (!FACEBOOK_APP_ID) {
    return null;
  }

  function handleClick() {
    window.FB.login(
      (response) => {
        if (response.authResponse?.accessToken) {
          handleLogin(response.authResponse.accessToken);
        } else {
          onError('Đăng nhập Facebook thất bại');
        }
      },
      { scope: 'email' },
    );
  }

  async function handleLogin(accessToken: string) {
    try {
      const res = await api.post('/auth/facebook', { accessToken });
      login(res.accessToken, res.user);
      onSuccess();
    } catch (err: any) {
      onError(err.message);
    }
  }

  return (
    <button
      type="button"
      className={styles.facebookButton}
      onClick={handleClick}
      disabled={!sdkReady}
    >
      Đăng nhập với Facebook
    </button>
  );
}
