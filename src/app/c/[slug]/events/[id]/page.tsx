import Link from "next/link";
import { notFound } from "next/navigation";
import { LockNotice } from "@/components/lock-notice";
import { getCurrentUser } from "@/lib/auth";
import { toggleEventEntry } from "@/lib/actions";
import { formatDateTime, gateLabel, parseDbDate, videoEmbedUrl } from "@/lib/format";
import { accessLevel, canView, getClubBySlug, getEvent, isEntered } from "@/lib/queries";

export default async function EventPage({ params }: PageProps<"/c/[slug]/events/[id]">) {
  const { slug, id } = await params;
  const club = getClubBySlug(slug);
  const event = getEvent(Number(id));
  if (!club || !event || event.club_id !== club.id) notFound();
  const user = await getCurrentUser();
  const isOwner = user?.id === club.owner_id;
  const allowed = canView(event, accessLevel(user?.id, club));
  const entered = user ? isEntered(event.id, user.id) : false;
  const past = parseDbDate(event.starts_at) < new Date();
  const full = event.capacity > 0 && event.entry_count >= event.capacity;
  const embed = event.stream_url ? videoEmbedUrl(event.stream_url) : null;

  return (
    <div className="mt-6 max-w-2xl">
      <Link href={`/c/${slug}/events`} className="text-sm text-zinc-500 hover:text-pink-600">← イベント一覧</Link>
      <article className="card mt-3 p-6 sm:p-8">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className={`rounded-full px-2 py-0.5 font-bold ${event.kind === "online" ? "bg-sky-50 text-sky-700" : "bg-amber-50 text-amber-700"}`}>
            {event.kind === "online" ? "🎥 オンライン配信" : "📍 オフライン"}
          </span>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-bold text-zinc-600">{gateLabel(event.min_price)}</span>
        </div>
        <h1 className="mt-2 text-2xl font-black">{event.title}</h1>
        <dl className="mt-4 grid grid-cols-[5rem_1fr] gap-y-2 text-sm">
          <dt className="text-zinc-500">日時</dt>
          <dd className="font-bold">{formatDateTime(event.starts_at)}</dd>
          {event.kind === "offline" && (
            <>
              <dt className="text-zinc-500">会場</dt>
              <dd>{event.location || "参加者にお知らせします"}</dd>
            </>
          )}
          <dt className="text-zinc-500">参加者</dt>
          <dd>{event.entry_count}人{event.capacity > 0 && ` / 定員 ${event.capacity}人`}</dd>
        </dl>
        <p className="mt-6 whitespace-pre-wrap leading-relaxed">{event.description}</p>

        <div className="mt-8 border-t border-zinc-100 pt-6">
          {!allowed ? (
            <LockNotice minPrice={event.min_price} slug={slug} loggedIn={!!user} />
          ) : isOwner ? (
            <p className="text-sm text-zinc-500">参加者一覧はクリエイター管理画面から確認できます。</p>
          ) : past ? (
            <p className="text-center font-bold text-zinc-400">このイベントは終了しました</p>
          ) : (
            <form action={toggleEventEntry} className="text-center">
              <input type="hidden" name="eventId" value={event.id} />
              {entered ? (
                <>
                  <p className="mb-3 font-bold text-emerald-600">✓ 参加登録済みです</p>
                  <button className="btn-outline">参加をキャンセル</button>
                </>
              ) : (
                <button className="btn-primary" disabled={full}>{full ? "定員に達しました" : "参加登録する"}</button>
              )}
            </form>
          )}
        </div>

        {allowed && (entered || isOwner) && event.kind === "online" && event.stream_url && (
          <div className="mt-6">
            <h2 className="font-black">🎥 配信</h2>
            {embed ? (
              <div className="mt-2 aspect-video overflow-hidden rounded-xl bg-black">
                <iframe src={embed} className="h-full w-full" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen title={event.title} />
              </div>
            ) : (
              <a href={event.stream_url} target="_blank" rel="noopener noreferrer" className="btn-primary mt-2">配信ページを開く</a>
            )}
          </div>
        )}
      </article>
    </div>
  );
}
