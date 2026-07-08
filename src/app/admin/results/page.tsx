import { prisma } from "@/lib/prisma";
import { ResultRow } from "./result-row";

export default async function ResultsPage() {
  const attempts = await prisma.quizAttempt.findMany({
    orderBy: { attemptedAt: "desc" },
    include: {
      student: true,
      quiz: { include: { lesson: true } },
    },
  });

  // A student can retake the same quiz many times; grouping by
  // student+quiz collapses those into one row (the latest attempt) with
  // the rest tucked behind the row's expand toggle. Iterating attempts in
  // their already-desc-sorted order means the first attempt seen per key
  // is the latest, and Map insertion order keeps the most recently active
  // groups at the top.
  const groups = new Map<string, { latest: (typeof attempts)[number]; history: (typeof attempts)[number][] }>();
  for (const attempt of attempts) {
    const key = `${attempt.studentId}-${attempt.quizId}`;
    const group = groups.get(key);
    if (group) {
      group.history.push(attempt);
    } else {
      groups.set(key, { latest: attempt, history: [] });
    }
  }
  const groupedResults = Array.from(groups.values());

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Kết quả bài test</h1>

      {attempts.length === 0 ? (
        <p className="text-sm text-muted">Chưa có lượt làm bài test nào.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full whitespace-nowrap text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium sm:px-6">Học viên</th>
                <th className="px-4 py-3 font-medium sm:px-6">Bài học</th>
                <th className="px-4 py-3 font-medium sm:px-6">Điểm</th>
                <th className="px-4 py-3 font-medium sm:px-6">Kết quả</th>
                <th className="px-4 py-3 font-medium sm:px-6">Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {groupedResults.map(({ latest, history }) => (
                <ResultRow
                  key={latest.id}
                  studentName={latest.student.name}
                  lessonTitle={latest.quiz.lesson.title}
                  latest={latest}
                  history={history}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
