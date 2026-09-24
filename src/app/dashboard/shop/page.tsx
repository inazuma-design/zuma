import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { GateSelect } from "@/components/gate-select";
import { requireUser } from "@/lib/auth";
import { markOrderShipped, saveProduct, toggleProduct } from "@/lib/actions";
import { formatDate, gateLabel, yen } from "@/lib/format";
import { getClubByOwner, listOrders, listPlans, listProducts } from "@/lib/queries";

export default async function DashboardShop() {
  const club = getClubByOwner((await requireUser("/dashboard")).id);
  if (!club) redirect("/dashboard");
  const products = listProducts(club.id, true);
  const orders = listOrders(club.id);
  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="card divide-y divide-zinc-100">
          {products.length === 0 && <p className="p-6 text-center text-sm text-zinc-500">商品はまだありません</p>}
          {products.map((p) => (
            <div key={p.id} className={`flex items-center gap-3 p-4 ${p.is_active ? "" : "opacity-60"}`}>
              <div className="min-w-0 flex-1">
                <Link href={`/c/${club.slug}/shop/${p.id}`} className="font-bold hover:underline">{p.name}</Link>
                <p className="text-xs text-zinc-500">
                  {yen(p.price)} ・ {gateLabel(p.min_price)} ・ 販売 {p.sold}点 ・ 在庫 {p.stock ?? "無制限"}
                </p>
              </div>
              <form action={toggleProduct}>
                <input type="hidden" name="productId" value={p.id} />
                <button className="btn-outline text-xs">{p.is_active ? "販売停止" : "販売再開"}</button>
              </form>
            </div>
          ))}
        </div>
        <ActionForm action={saveProduct} submitLabel="追加する">
          <h2 className="font-black">商品を追加</h2>
          <input name="name" className="input" placeholder="商品名" required maxLength={60} />
          <div className="grid grid-cols-2 gap-2">
            <input name="price" type="number" min={100} className="input" placeholder="価格（円）" required />
            <input name="stock" type="number" min={0} className="input" placeholder="在庫（空欄で無制限）" />
          </div>
          <textarea name="description" className="input min-h-20" placeholder="商品説明" />
          <GateSelect plans={listPlans(club.id)} defaultValue={0} publicLabel="誰でも購入可" />
        </ActionForm>
      </div>

      <section>
        <h2 className="font-black">注文一覧</h2>
        <div className="card mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs text-zinc-500">
              <tr>
                <th className="px-4 py-2">注文日</th>
                <th className="px-4 py-2">商品</th>
                <th className="px-4 py-2">購入者</th>
                <th className="px-4 py-2">金額</th>
                <th className="px-4 py-2">お届け先</th>
                <th className="px-4 py-2">状態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {orders.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-zinc-500">まだ注文はありません</td></tr>
              )}
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="whitespace-nowrap px-4 py-2">{formatDate(o.created_at)}</td>
                  <td className="px-4 py-2">{o.product_name} × {o.quantity}</td>
                  <td className="px-4 py-2">{o.user_name}</td>
                  <td className="px-4 py-2 font-bold">{yen(o.amount)}</td>
                  <td className="max-w-48 truncate px-4 py-2 text-xs" title={o.shipping_address}>{o.shipping_address}</td>
                  <td className="px-4 py-2">
                    {o.status === "shipped" ? (
                      <span className="text-xs font-bold text-emerald-700">発送済み</span>
                    ) : (
                      <form action={markOrderShipped}>
                        <input type="hidden" name="orderId" value={o.id} />
                        <button className="btn-outline px-3! py-1! text-xs">発送済みにする</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
