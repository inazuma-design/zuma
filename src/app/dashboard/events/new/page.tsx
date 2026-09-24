import { redirect } from "next/navigation";
import { EventForm } from "@/components/event-form";
import { requireUser } from "@/lib/auth";
import { getClubByOwner, listPlans } from "@/lib/queries";

export default async function NewEvent() {
  const club = getClubByOwner((await requireUser("/dashboard")).id);
  if (!club) redirect("/dashboard");
  return (
    <div className="max-w-2xl">
      <h2 className="mb-4 font-black">イベントを作成</h2>
      <EventForm plans={listPlans(club.id)} />
    </div>
  );
}
