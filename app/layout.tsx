import './globals.css';
import { ReactNode } from 'react';

export const metadata = {
  title: 'Multiplayer UNO',
  description: 'Play UNO online with friends in real-time.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
