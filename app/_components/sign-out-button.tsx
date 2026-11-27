import { signOut } from "@/app/(auth)/actions";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button type="submit" className="text-sm font-medium text-brand-700 hover:underline">
        Sign out
      </button>
    </form>
  );
}
