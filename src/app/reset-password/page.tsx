import { AccountShell } from "@/components/auth/account-shell";
import { AuthForm } from "@/components/auth/auth-form";
import { requireUser } from "@/lib/auth/session";
export default async function ResetPassword() {
  await requireUser();
  return (
    <AccountShell
      title="Choose a new password."
      description="Use a unique password you haven’t used elsewhere."
    >
      <AuthForm mode="reset" available />
    </AccountShell>
  );
}
