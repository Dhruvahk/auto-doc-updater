import './globals.css';
import SignOutButton from './signout-button.jsx';
import AppToaster from './toaster.jsx';

export const metadata = {
  title: 'Auto Doc Updater',
  description: 'LLM-powered README sync for GitHub pull requests',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div style={{ minHeight: '100vh' }}>
          {/* Keep sign-out available on authenticated pages; login page can ignore it */}
          <div style={{ maxWidth: 860, margin: '0 auto', padding: '12px 1.5rem 0', display: 'flex' }}>
            <SignOutButton />
          </div>
          {children}
          <AppToaster />
        </div>
      </body>
    </html>
  );
}

