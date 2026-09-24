import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import { Header } from "@/components/header";
import "./globals.css";

const noto = Noto_Sans_JP({ variable: "--font-noto", subsets: ["latin"], weight: ["400", "700", "900"] });

export const metadata: Metadata = {
  title: { default: "ZUMA — ファンクラブ・会員サイト作成サービス", template: "%s | ZUMA" },
  description: "クリエイターが月額制のファンクラブを開設し、会員限定コンテンツを届けられるサービス",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja" className={noto.variable}>
      <body className="min-h-screen font-sans antialiased">
        <Header />
        <main>{children}</main>
        <footer className="mt-20 border-t border-zinc-200 py-10 text-center text-xs text-zinc-500">
          © ZUMA — ファンとクリエイターをつなぐ会員サイト
        </footer>
      </body>
    </html>
  );
}
