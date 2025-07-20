import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

interface GoogleAuthButtonProps {
  onSuccess: () => void;
  onError: (message: string) => void;
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

export default function GoogleAuthButton({ onSuccess, onError }: GoogleAuthButtonProps) {
  const { login } = useAuth();

  if (!GOOGLE_CLIENT_ID) {
    return null;
  }

  async function handleSuccess(credentialResponse: CredentialResponse) {
    if (!credentialResponse.credential) {
      onError('Không nhận được thông tin đăng nhập từ Google');
      return;
    }
    try {
      const res = await api.post('/auth/google', { idToken: credentialResponse.credential });
      login(res.accessToken, res.user);
      onSuccess();
    } catch (err: any) {
      onError(err.message);
    }
  }

  return (
    <GoogleLogin
      onSuccess={handleSuccess}
      onError={() => onError('Đăng nhập Google thất bại')}
      width="356"
    />
  );
}
