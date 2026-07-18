import type { AppProps } from 'next/app';
import Head from 'next/head';
import Script from 'next/script';
import { useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import '../styles/globals.scss';
import { roboto } from '../lib/fonts';
import { AuthProvider } from '../lib/auth';
import Header from '../components/Header';
import Footer from '../components/Footer';

const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const facebookAppId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    if (!facebookAppId) return;
    window.fbAsyncInit = function fbAsyncInit() {
      window.FB.init({ appId: facebookAppId, cookie: true, xfbml: false, version: 'v19.0' });
    };
  }, []);

  const app = (
    <AuthProvider>
      <div className={`${roboto.variable} app-root`}>
        <Head>
          <title>PawCircle — Kết nối cộng đồng yêu chó mèo</title>
          <meta
            name="description"
            content="Tìm chó mèo lạc, tìm người nhận nuôi, trao đổi đồ dùng và gây quỹ chữa bệnh cho thú cưng."
          />
        </Head>
        <Header />
        <main>
          <Component {...pageProps} />
        </main>
        <Footer />
        {facebookAppId && (
          <Script strategy="afterInteractive" src="https://connect.facebook.net/en_US/sdk.js" />
        )}
      </div>
    </AuthProvider>
  );

  return googleClientId ? (
    <GoogleOAuthProvider clientId={googleClientId} locale="vi">
      {app}
    </GoogleOAuthProvider>
  ) : (
    app
  );
}