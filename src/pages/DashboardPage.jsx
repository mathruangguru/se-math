import { greeting, longDate } from "../lib/date";
import { user } from "../data/user";

export default function DashboardPage() {
  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6">
      {/* Greeting */}
      <div>
        <p className="text-xs text-zinc-500">{longDate()}</p>
        <h1 className="mt-1 text-xl font-bold tracking-tight text-zinc-900">
          {greeting()}, {user.firstName}! 👋
        </h1>
      </div>

      <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center">
        <p className="text-sm font-semibold text-zinc-900">Belum ada konten</p>
        <p className="mt-1 text-xs text-zinc-500">Dashboard masih kosong.</p>
      </div>
    </div>
  );
}
