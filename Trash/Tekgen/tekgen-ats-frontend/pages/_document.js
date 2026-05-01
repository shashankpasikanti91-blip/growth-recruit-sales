import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#000000" />
        <meta
          name="description"
          content="Tekgen ATS - AI-Powered Intelligent Recruitment Platform"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <body className="bg-gray-50">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
