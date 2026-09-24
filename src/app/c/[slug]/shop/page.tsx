import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { yen } from "@/lib/format";
import { accessLevel, canView, getClubBySlug, listProducts } from "@/lib/queries";
import { ProductThumb } from "@/components/product-thumb";

export default async function Shop({ params }: PageProps<"/c/[slug]/shop">) {
  const club = getClubBySlug((await params).slug);
  if (!club) notFound();
  const user = await getCurrentUser();
  const level = accessLevel(user?.id, club);
  const products = listProducts(club.id);
  return (
    <div className="mt-6">
      {products.length === 0 && <p className="text-sm text-zinc-500">商品はまだありません</p>}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {products.map((p) => {
          const soldOut = p.stock !== null && p.stock <= 0;
          return (
            <Link key={p.id} href={`/c/${club.slug}/shop/${p.id}`} className="card overflow-hidden hover:shadow-md">
              <ProductThumb name={p.name} themeKey={club.theme} />
              <div className="p-3 sm:p-4">
                <div className="flex gap-1 text-xs">
                  {p.min_price > 0 && (
                    <span className="rounded-full bg-pink-50 px-2 py-0.5 font-bold text-pink-600">
                      {canView(p, level) ? "会員限定" : "🔒 会員限定"}
                    </span>
                  )}
                  {soldOut && <span className="rounded-full bg-zinc-800 px-2 py-0.5 font-bold text-white">SOLD OUT</span>}
                </div>
                <p className="mt-1 font-bold">{p.name}</p>
                <p className="text-lg font-black">{yen(p.price)}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
