import 'server-only';
// Extra jobs run on every scheduler tick (Phase 2-4 register theirs here).
type Task = { name: string; run: () => Promise<unknown> };
const tasks: Task[] = [];
export const registerTask = (t: Task) => { tasks.push(t); };
export async function runTasks() {
  const out: Record<string, unknown> = {};
  for (const t of tasks) out[t.name] = await t.run().catch((e) => String(e));
  return out;
}
