import type { Metadata } from 'next';
import { Nunito_Sans, Inter } from 'next/font/google';
import './globals.css';

const nunitoSans = Nunito_Sans({
  variable: '--font-nunito',
  subsets: ['latin'],
  weight: ['300', '400', '600', '700', '800'],
});

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Gemini Creative Analyzer - Multimodal E-Commerce & Media Insights',
  description: 'AI-powered multimodal video and creative performance analyzer with CPAS sales & conversion intelligence.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${nunitoSans.variable} ${inter.variable} min-h-screen bg-[#090d16] text-slate-100 antialiased selection:bg-indigo-500 selection:text-white`}
      >
        {children}
      </body>
    </html>
  );
}
