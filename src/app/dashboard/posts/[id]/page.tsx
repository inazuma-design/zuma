import { notFound, redirect } from "next/navigation";
import { PostForm } from "@/components/post-form";
import { requireUser } from "@/lib/auth";
import { getClubByOwner, getPost, listPlans } from "@/lib/queries";

export default async function EditPost({ params }: PageProps<"/dashboard/posts/[id]">) {
  const club = getClubByOwner((await requireUser("/dashboard")).id);
  if (!club) redirect("/dashboard");
  const post = getPost(Number((await params).id));
  if (!post || post.club_id !== club.id) notFound();
  return (
    <div className="max-w-2xl">
      <h2 className="mb-4 font-black">投稿を編集</h2>
      <PostForm plans={listPlans(club.id, true)} post={post} />
    </div>
  );
}
