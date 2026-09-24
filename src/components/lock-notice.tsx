import Link from "next/link";
import { yen } from "@/lib/format";

export function LockNotice({ minPrice, slug, loggedIn }: { minPrice: number; slug: string; loggedIn: boolean }) {
  return (
    <div className="rounded-2xl bg-zinc-50 p-8 text-center">
      <p className="text-3xl">🔒</p>
      <p className="mt-2 font-bold">{yen(minPrice)} 以上のプラン会員限定です</p>
      <p className="mt-1 text-sm text-zinc-500">
        {loggedIn ? "プランに入会（または変更）すると利用できます" : "ログインしてプランに入会すると利用できます"}
      </p>
      <Link href={`/c/${slug}#plans`} className="btn-primary mt-4">プランを見る</Link>
    </div>
  );
}
