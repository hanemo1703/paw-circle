import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="vi">
      <Head>
        <link rel="icon" href="/logo.jpg" type="image/jpeg" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}