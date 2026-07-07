import { prisma } from "@/lib/prisma";

export default async function ResultsPage() {
  const attempts = await prisma.quizAttempt.findMany({
    orderBy: { attemptedAt: "desc" },
    include: {
      student: true,
      quiz: { include: { lesson: true } },
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Kết quả bài test</h1>

      {attempts.length === 0 ? (
        <p className="text-sm text-zinc-500">Chưa có lượt làm bài test nào.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left dark:border-zinc-800 dark:bg-zinc-900">
              <tr>
                <th className="px-4 py-2 font-medium">Học viên</th>
                <th className="px-4 py-2 font-medium">Bài học</th>
                <th className="px-4 py-2 font-medium">Điểm</th>
                <th className="px-4 py-2 font-medium">Kết quả</th>
                <th className="px-4 py-2 font-medium">Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {attempts.map((attempt) => (
                <tr key={attempt.id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-900">
                  <td className="px-4 py-2">{attempt.student.name}</td>
                  <td className="px-4 py-2 text-zinc-500">{attempt.quiz.lesson.title}</td>
                  <td className="px-4 py-2">{attempt.scorePercent}%</td>
                  <td className="px-4 py-2">
                    {attempt.passed ? (
                      <span className="text-green-700 dark:text-green-400">Đạt</span>
                    ) : (
                      <span className="text-red-700 dark:text-red-400">Chưa đạt</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-zinc-500">
                    {attempt.attemptedAt.toLocaleString("vi-VN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
