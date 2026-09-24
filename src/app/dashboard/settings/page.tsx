import { redirect } from "next/navigation";
import { ClubForm } from "@/components/club-form";
import { requireUser } from "@/lib/auth";
import { getClubByOwner } from "@/lib/queries";

export default async function Settings() {
  const club = getClubByOwner((await requireUser("/dashboard")).id);
  if (!club) redirect("/dashboard");
  return (
    <div className="max-w-xl">
      <ClubForm club={club} />
    </div>
  );
}
