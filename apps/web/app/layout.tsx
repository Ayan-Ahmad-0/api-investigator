import type { Metadata } from 'next';
import './globals.css';
import { Navigation } from '@/components/Navigation';

export const metadata: Metadata = {
  title: 'API Investigator | Understand Why APIs Fail',
  description: 'Evidence-backed API monitoring, failure reproduction, and automated incident investigation.',
  icons: {
    icon: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased bg-slate-50 text-slate-900">
        <Navigation>{children}</Navigation>
      </body>
    </html>
  );
}
