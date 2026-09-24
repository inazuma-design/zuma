import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDateTime, gateLabel, parseDbDate } from "@/lib/format";
import { getClubBySlug, listEvents } from "@/lib/queries";

export default async function Events({ params }: PageProps<"/c/[slug]/events">) {
  const club = getClubBySlug((await params).slug);
  if (!club) notFound();
  const events = listEvents(club.id);
  const now = new Date();
  return (
    <div className="mt-6 max-w-3xl space-y-3">
      {events.length === 0 && <p className="text-sm text-zinc-500">イベントはまだありません</p>}
      {events.map((e) => {
        const past = parseDbDate(e.starts_at) < now;
        return (
          <Link key={e.id} href={`/c/${club.slug}/events/${e.id}`} className={`card block p-5 hover:shadow-md ${past ? "opacity-60" : ""}`}>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className={`rounded-full px-2 py-0.5 font-bold ${e.kind === "online" ? "bg-sky-50 text-sky-700" : "bg-amber-50 text-amber-700"}`}>
                {e.kind === "online" ? "🎥 オンライン配信" : "📍 オフライン"}
              </span>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-bold text-zinc-600">{gateLabel(e.min_price)}</span>
              {past && <span className="font-bold text-zinc-400">終了</span>}
            </div>
            <h3 className="mt-2 text-lg font-bold">{e.title}</h3>
            <p className="text-sm text-zinc-600">{formatDateTime(e.starts_at)}</p>
            <p className="mt-1 text-xs text-zinc-500">
              参加者 {e.entry_count}人{e.capacity > 0 && ` / 定員 ${e.capacity}人`}
            </p>
          </Link>
        );
      })}
    </div>
  );
}
