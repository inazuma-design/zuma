import Link from "next/link";
import { ClubCard } from "@/components/club-card";
import { CATEGORIES } from "@/lib/format";
import { listClubs } from "@/lib/queries";

export const metadata = { title: "ファンクラブをさがす" };

export default async function Explore({ searchParams }: PageProps<"/explore">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const category = typeof sp.category === "string" ? sp.category : "";
  const clubs = listClubs(q || undefined, category || undefined);
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-black">ファンクラブをさがす</h1>
      <form className="mt-5 flex gap-2">
        {category && <input type="hidden" name="category" value={category} />}
        <input name="q" defaultValue={q} placeholder="クリエイター名・キーワード" className="input max-w-md" />
        <button className="btn-primary">検索</button>
      </form>
      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        {["", ...CATEGORIES].map((c) => {
          const params = new URLSearchParams();
          if (q) params.set("q", q);
          if (c) params.set("category", c);
          const active = c === category;
          return (
            <Link
              key={c || "all"}
              href={`/explore?${params}`}
              className={`rounded-full px-3 py-1 font-bold ${active ? "bg-pink-500 text-white" : "bg-white text-zinc-600 ring-1 ring-zinc-200"}`}
            >
              {c || "すべて"}
            </Link>
          );
        })}
      </div>
      {clubs.length === 0 ? (
        <p className="mt-16 text-center text-zinc-500">該当するファンクラブが見つかりませんでした</p>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {clubs.map((c) => (
            <ClubCard key={c.id} club={c} />
          ))}
        </div>
      )}
    </div>
  );
}
