import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { deleteEvent } from "@/lib/actions";
import { formatDateTime, gateLabel } from "@/lib/format";
import { getClubByOwner, listEvents } from "@/lib/queries";

export default async function DashboardEvents() {
  const club = getClubByOwner((await requireUser("/dashboard")).id);
  if (!club) redirect("/dashboard");
  const events = listEvents(club.id);
  return (
    <div>
      <Link href="/dashboard/events/new" className="btn-primary">＋ イベントを作成</Link>
      <div className="card mt-4 divide-y divide-zinc-100">
        {events.length === 0 && <p className="p-6 text-center text-sm text-zinc-500">イベントはまだありません</p>}
        {events.map((e) => (
          <div key={e.id} className="flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <Link href={`/c/${club.slug}/events/${e.id}`} className="font-bold hover:underline">
                {e.kind === "online" ? "🎥 " : "📍 "}{e.title}
              </Link>
              <p className="text-xs text-zinc-500">
                {formatDateTime(e.starts_at)} ・ {gateLabel(e.min_price)} ・ 参加 {e.entry_count}人{e.capacity > 0 && `/${e.capacity}`}
              </p>
            </div>
            <Link href={`/dashboard/events/${e.id}`} className="btn-outline text-xs">編集・参加者</Link>
            <form action={deleteEvent}>
              <input type="hidden" name="eventId" value={e.id} />
              <button className="btn text-xs text-red-500 hover:bg-red-50">削除</button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
