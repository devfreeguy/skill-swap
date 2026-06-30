import LoginPanel from "@/components/auth/LoginPanel";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return <LoginPanel error={error} />;
}
