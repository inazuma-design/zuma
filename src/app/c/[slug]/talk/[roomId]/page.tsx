import Link from "next/link";
import { notFound } from "next/navigation";
import { AutoRefresh } from "@/components/auto-refresh";
import { LockNotice } from "@/components/lock-notice";
import { getCurrentUser } from "@/lib/auth";
import { deleteTalkMessage, sendTalkMessage } from "@/lib/actions";
import { timeAgo } from "@/lib/format";
import { accessLevel, canView, getClubBySlug, getTalkRoom, listTalkMessages } from "@/lib/queries";

export default async function TalkRoomPage({ params }: PageProps<"/c/[slug]/talk/[roomId]">) {
  const { slug, roomId } = await params;
  const club = getClubBySlug(slug);
  const room = getTalkRoom(Number(roomId));
  if (!club || !room || room.club_id !== club.id) notFound();
  const user = await getCurrentUser();
  const isOwner = user?.id === club.owner_id;

  return (
    <div className="mt-6 max-w-3xl">
      <Link href={`/c/${slug}/talk`} className="text-sm text-zinc-500 hover:text-pink-600">← トークルーム一覧</Link>
      <h2 className="mt-2 text-xl font-black">{room.name}</h2>
      <p className="text-sm text-zinc-500">{room.description}</p>

      {!canView(room, accessLevel(user?.id, club)) ? (
        <div className="mt-6"><LockNotice minPrice={room.min_price} slug={slug} loggedIn={!!user} /></div>
      ) : (
        <>
          <AutoRefresh />
          <ul className="card mt-4 max-h-[60vh] space-y-4 overflow-y-auto p-4">
            {listTalkMessages(room.id).map((m) => {
              const fromOwner = m.user_id === club.owner_id;
              const mine = m.user_id === user?.id;
              return (
                <li key={m.id} className={`flex ${mine ? "justify-end" : ""}`}>
                  <div className="max-w-[80%]">
                    <p className={`text-xs text-zinc-500 ${mine ? "text-right" : ""}`}>
                      <span className="font-bold text-zinc-700">{m.user_name}</span>
                      {fromOwner && <span className="ml-1 rounded bg-pink-500 px-1 text-[10px] font-bold text-white">オーナー</span>}
                      <span className="ml-1">{timeAgo(m.created_at)}</span>
                    </p>
                    <p
                      className={`mt-1 whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${
                        mine ? "bg-pink-500 text-white" : fromOwner ? "bg-fuchsia-50 ring-1 ring-fuchsia-200" : "bg-zinc-100"
                      }`}
                    >
                      {m.body}
                    </p>
                    {isOwner && !mine && (
                      <form action={deleteTalkMessage} className="text-right">
                        <input type="hidden" name="messageId" value={m.id} />
                        <input type="hidden" name="roomId" value={room.id} />
                        <button className="text-[10px] text-zinc-400 hover:text-red-500">削除</button>
                      </form>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <form action={sendTalkMessage} className="mt-3 flex gap-2">
            <input type="hidden" name="roomId" value={room.id} />
            <input name="body" className="input" placeholder="メッセージを入力" required maxLength={1000} autoComplete="off" />
            <button className="btn-primary shrink-0">送信</button>
          </form>
        </>
      )}
    </div>
  );
}
