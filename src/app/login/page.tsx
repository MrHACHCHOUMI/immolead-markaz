import LoginClient from "./LoginClient";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reason?: string }>;
}) {
  const params = await searchParams;

  let initialError: string | null = null;
  if (params.error) initialError = params.error;
  else if (params.reason === "profile")
    initialError = "Profil CRM introuvable.";
  else if (params.reason === "inactive") initialError = "Compte désactivé.";

  return <LoginClient initialError={initialError} />;
}
