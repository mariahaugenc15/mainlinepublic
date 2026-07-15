import Brand from "@/app/_components/Brand";
import RegisterForm from "./RegisterForm";

export default function RegisterPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Brand size="lg" />
          <p className="mt-2 text-sm text-ink-500">Start your 14-day free trial — no credit card required</p>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
}
