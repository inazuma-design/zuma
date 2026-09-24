import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/club-card";
import { ClubTabs } from "@/components/club-tabs";
import { theme } from "@/lib/format";
import { getClubBySlug } from "@/lib/queries";

export async function generateMetadata({ params }: LayoutProps<"/c/[slug]">) {
  const club = getClubBySlug((await params).slug);
  return { title: club?.name ?? "ファンクラブ" };
}

export default async function ClubLayout({ params, children }: LayoutProps<"/c/[slug]">) {
  const club = getClubBySlug((await params).slug);
  if (!club) notFound();
  const t = theme(club.theme);
  return (
    <div>
      <div className={`h-40 bg-gradient-to-br sm:h-56 ${t.gradient}`} />
      <div className="mx-auto max-w-5xl px-4">
        <div className="mt-3 flex flex-wrap items-end gap-4">
          <Avatar name={club.owner_name} themeKey={club.theme} className="-mt-14 h-24 w-24 border-4 border-white text-4xl shadow" />
          <div className="pb-1">
            <p className="text-sm text-zinc-500">{club.owner_name}</p>
            <Link href={`/c/${club.slug}`} className="text-2xl font-black hover:underline">{club.name}</Link>
          </div>
          <div className="ml-auto flex gap-2 pb-1 text-xs">
            <span className={`rounded-full px-3 py-1 font-bold ${t.soft}`}>{club.category}</span>
            <span className="rounded-full bg-white px-3 py-1 font-bold text-zinc-600 ring-1 ring-zinc-200">
              会員 {club.member_count}人
            </span>
          </div>
        </div>
        <ClubTabs slug={club.slug} />
        {children}
      </div>
    </div>
  );
}
