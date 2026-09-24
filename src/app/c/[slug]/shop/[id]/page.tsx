import Link from "next/link";
import { notFound } from "next/navigation";
import { LockNotice } from "@/components/lock-notice";
import { ProductThumb } from "@/components/product-thumb";
import { PurchaseForm } from "@/components/purchase-form";
import { getCurrentUser } from "@/lib/auth";
import { yen } from "@/lib/format";
import { accessLevel, canView, getClubBySlug, getProduct } from "@/lib/queries";

export default async function ProductPage({ params, searchParams }: PageProps<"/c/[slug]/shop/[id]">) {
  const { slug, id } = await params;
  const { purchased } = await searchParams;
  const club = getClubBySlug(slug);
  const product = getProduct(Number(id));
  if (!club || !product || product.club_id !== club.id || !product.is_active) notFound();
  const user = await getCurrentUser();
  const allowed = canView(product, accessLevel(user?.id, club));
  const soldOut = product.stock !== null && product.stock <= 0;

  return (
    <div className="mt-6">
      <Link href={`/c/${slug}/shop`} className="text-sm text-zinc-500 hover:text-pink-600">← ショップ</Link>
      {purchased && (
        <div className="mt-3 rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
          ご購入ありがとうございます！購入履歴はマイページから確認できます。
        </div>
      )}
      <div className="mt-3 grid gap-6 md:grid-cols-2">
        <ProductThumb name={product.name} themeKey={club.theme} className="rounded-2xl" />
        <div>
          {product.min_price > 0 && (
            <span className="rounded-full bg-pink-50 px-2 py-0.5 text-xs font-bold text-pink-600">
              {yen(product.min_price)}以上のプラン会員限定
            </span>
          )}
          <h1 className="mt-2 text-2xl font-black">{product.name}</h1>
          <p className="mt-1 text-2xl font-black">{yen(product.price)}<span className="text-sm font-normal text-zinc-500">（税込・送料込）</span></p>
          {product.stock !== null && <p className="text-sm text-zinc-500">残り {product.stock} 点</p>}
          <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">{product.description}</p>
          <div className="mt-6">
            {soldOut ? (
              <p className="btn w-full bg-zinc-200 text-zinc-500">売り切れ</p>
            ) : !allowed ? (
              <LockNotice minPrice={product.min_price} slug={slug} loggedIn={!!user} />
            ) : !user ? (
              <Link href={`/login?next=/c/${slug}/shop/${product.id}`} className="btn-primary w-full">ログインして購入</Link>
            ) : user.id === club.owner_id ? (
              <p className="text-sm text-zinc-500">あなたの商品です</p>
            ) : (
              <PurchaseForm productId={product.id} price={product.price} maxQty={Math.min(10, product.stock ?? 10)} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
