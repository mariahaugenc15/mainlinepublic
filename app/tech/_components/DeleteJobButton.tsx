"use client";

import { deleteJobAction } from "@/app/tech/actions";

export default function DeleteJobButton({ jobId }: { jobId: string }) {
  return (
    <form
      action={deleteJobAction.bind(null, jobId)}
      onSubmit={(e) => {
        if (!confirm("Delete this job? This cannot be undone.")) e.preventDefault();
      }}
    >
      <button
        type="submit"
        className="flex h-10 w-full items-center justify-center rounded-xl border border-danger/30 bg-white text-sm font-medium text-danger active:bg-danger/5"
      >
        Delete Job
      </button>
    </form>
  );
}
