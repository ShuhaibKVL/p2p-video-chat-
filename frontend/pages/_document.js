import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta charSet="utf-8" />
        <meta name="theme-color" content="#2196F3" />
        
        {/* Load Socket.io client library from CDN */}
        {/* This must be loaded BEFORE our socket-client.js module */}
        <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
