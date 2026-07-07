import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";

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
              {attempts.map((attempt) => (
                <tr key={attempt.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                  <td className="px-4 py-4 sm:px-6 font-medium text-foreground">{attempt.student.name}</td>
                  <td className="px-4 py-4 sm:px-6 text-muted">{attempt.quiz.lesson.title}</td>
                  <td className="px-4 py-4 sm:px-6 text-foreground">{attempt.scorePercent}%</td>
                  <td className="px-4 py-4 sm:px-6">
                    {attempt.passed ? (
                      <Badge color="success">Đạt</Badge>
                    ) : (
                      <Badge color="danger">Chưa đạt</Badge>
                    )}
                  </td>
                  <td className="px-4 py-4 sm:px-6 text-muted">
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
