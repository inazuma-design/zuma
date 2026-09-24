import { redirect } from "next/navigation";
import { PostForm } from "@/components/post-form";
import { requireUser } from "@/lib/auth";
import { getClubByOwner, listPlans } from "@/lib/queries";

export default async function NewPost() {
  const club = getClubByOwner((await requireUser("/dashboard")).id);
  if (!club) redirect("/dashboard");
  return (
    <div className="max-w-2xl">
      <h2 className="mb-4 font-black">新規投稿</h2>
      <PostForm plans={listPlans(club.id)} />
    </div>
  );
}
