import type { AppProps } from 'next/app';
import Head from 'next/head';
import '../styles/globals.scss';
import { roboto } from '../lib/fonts';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function App({ Component, pageProps }: AppProps) {
  return (
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
    </div>
  );
}