import Brand from "@/app/_components/Brand";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Brand size="lg" />
          <p className="mt-1 text-sm text-ink-500">Field diagnostic intelligence for plumbing trades</p>
        </div>

        <LoginForm />
      </div>
    </div>
  );
}
