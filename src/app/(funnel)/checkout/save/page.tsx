import { AppleSaveScreen } from "@/components/screens/AppleSaveScreen";

// Écran de connexion post-achat natif (StoreKit). Le plan acheté arrive en query
// (?plan=lifetime|weekly) → sert à poser le bon accès en base après le Sign in with Apple.
export default async function Page({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const { plan } = await searchParams;
  return <AppleSaveScreen plan={plan === "weekly" ? "weekly" : "lifetime"} />;
}
