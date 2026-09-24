import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { GateSelect } from "@/components/gate-select";
import { requireUser } from "@/lib/auth";
import { deleteTalkRoom, saveTalkRoom } from "@/lib/actions";
import { gateLabel } from "@/lib/format";
import { getClubByOwner, listPlans, listTalkRooms } from "@/lib/queries";

export default async function DashboardTalk() {
  const club = getClubByOwner((await requireUser("/dashboard")).id);
  if (!club) redirect("/dashboard");
  const rooms = listTalkRooms(club.id);
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="card divide-y divide-zinc-100">
        {rooms.length === 0 && <p className="p-6 text-center text-sm text-zinc-500">トークルームはまだありません</p>}
        {rooms.map((r) => (
          <div key={r.id} className="flex items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <Link href={`/c/${club.slug}/talk/${r.id}`} className="font-bold hover:underline">{r.name}</Link>
              <p className="text-xs text-zinc-500">{gateLabel(r.min_price)} ・ {r.message_count}件</p>
            </div>
            <form action={deleteTalkRoom}>
              <input type="hidden" name="roomId" value={r.id} />
              <button className="btn text-xs text-red-500 hover:bg-red-50">削除</button>
            </form>
          </div>
        ))}
      </div>
      <ActionForm action={saveTalkRoom} submitLabel="作成する">
        <h2 className="font-black">トークルームを作成</h2>
        <input name="name" className="input" placeholder="ルーム名（例: 雑談ルーム）" required maxLength={40} />
        <input name="description" className="input" placeholder="説明" maxLength={100} />
        <GateSelect plans={listPlans(club.id)} publicLabel="ログインユーザー全員" />
      </ActionForm>
    </div>
  );
}
