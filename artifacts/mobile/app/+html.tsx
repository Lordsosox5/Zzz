import { ScrollViewStyleReset } from 'expo-router/html';

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <ScrollViewStyleReset />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.onerror = function(msg, src, line, col, err) {
                document.body.innerHTML = '<div style="padding:20px;font-family:monospace;color:red;white-space:pre-wrap;background:#fff;font-size:14px"><b>JS Error:</b> ' + msg + '\\n\\nSource: ' + src + ':' + line + '\\n\\n' + (err && err.stack ? err.stack : '') + '</div>';
                return false;
              };
              window.addEventListener('unhandledrejection', function(e) {
                document.body.innerHTML = '<div style="padding:20px;font-family:monospace;color:red;white-space:pre-wrap;background:#fff;font-size:14px"><b>Unhandled Promise:</b> ' + (e.reason && e.reason.stack ? e.reason.stack : String(e.reason)) + '</div>';
              });
              var origError = console.error.bind(console);
              console.error = function() {
                origError.apply(console, arguments);
                var msg = Array.from(arguments).map(function(a) { return typeof a === 'object' ? JSON.stringify(a) : String(a); }).join(' ');
                if (msg.includes('runtime error') || msg.includes('Error')) {
                  document.title = 'ERROR: ' + msg.slice(0, 80);
                }
              };
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
