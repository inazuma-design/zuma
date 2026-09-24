import { notFound, redirect } from "next/navigation";
import { EventForm } from "@/components/event-form";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { getClubByOwner, getEvent, listEntrants, listPlans } from "@/lib/queries";

export default async function EditEvent({ params }: PageProps<"/dashboard/events/[id]">) {
  const club = getClubByOwner((await requireUser("/dashboard")).id);
  if (!club) redirect("/dashboard");
  const event = getEvent(Number((await params).id));
  if (!event || event.club_id !== club.id) notFound();
  const entrants = listEntrants(event.id);
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        <h2 className="mb-4 font-black">イベントを編集</h2>
        <EventForm plans={listPlans(club.id, true)} event={event} />
      </div>
      <aside>
        <h2 className="mb-4 font-black">参加者（{entrants.length}人）</h2>
        <ul className="card divide-y divide-zinc-100 text-sm">
          {entrants.length === 0 && <li className="p-4 text-zinc-500">まだ参加者はいません</li>}
          {entrants.map((e, i) => (
            <li key={i} className="p-3">
              <p className="font-bold">{e.user_name}</p>
              <p className="text-xs text-zinc-500">{e.email} ・ {formatDate(e.created_at)}登録</p>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
