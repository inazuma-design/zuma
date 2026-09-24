import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { logout } from "@/lib/actions";

export async function Header() {
  const user = await getCurrentUser();
  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 whitespace-nowrap px-4 sm:gap-4">
        <Link href="/" className="bg-gradient-to-r from-pink-500 to-fuchsia-500 bg-clip-text text-xl font-black text-transparent">
          ZUMA
        </Link>
        <nav className="flex flex-1 items-center gap-3 text-sm font-bold text-zinc-600 sm:gap-4">
          <Link href="/explore" className="hover:text-pink-500">さがす</Link>
          {user && <Link href="/feed" className="hidden hover:text-pink-500 sm:inline">タイムライン</Link>}
        </nav>
        {user ? (
          <div className="flex items-center gap-3 text-sm">
            <Link href="/feed" className="font-bold text-zinc-600 hover:text-pink-500 sm:hidden">TL</Link>
            <Link href="/dashboard" className="hidden font-bold text-zinc-600 hover:text-pink-500 sm:inline">
              クリエイター管理
            </Link>
            <Link href="/mypage" className="font-bold text-zinc-600 hover:text-pink-500">マイページ</Link>
            <form action={logout}>
              <button className="text-zinc-400 hover:text-zinc-700">ログアウト</button>
            </form>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn-outline px-4! py-1.5!">ログイン</Link>
            <Link href="/signup" className="btn-primary px-4! py-1.5!">新規登録</Link>
          </div>
        )}
      </div>
    </header>
  );
}
