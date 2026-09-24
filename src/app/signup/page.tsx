import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "新規登録" };

export default async function Page({ searchParams }: PageProps<"/signup">) {
  const { next } = await searchParams;
  const nextPath = typeof next === "string" ? next : "";
  if (await getCurrentUser()) redirect(nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/mypage");
  return <AuthForm mode="signup" next={nextPath} />;
}
