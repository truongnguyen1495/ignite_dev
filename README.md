# LMS Nội Bộ — 5 Cấp Đào Tạo

Hệ thống đào tạo nội bộ với 2 vai trò (Super Admin, Student) và 5 cấp cố định:
Customer → New starter → Junior → Senior → Core leader.

Stack: Next.js (App Router, TypeScript) + Prisma + PostgreSQL (Supabase) + NextAuth.js v5 (Credentials, JWT) + Tailwind CSS.

## Cài đặt local

1. Cài dependencies:

   ```bash
   npm install
   ```

2. Tạo file `.env` (xem `.env` hiện có làm mẫu) với các biến:

   ```
   DATABASE_URL="postgresql://...?pgbouncer=true"   # connection pooling (port 6543)
   DIRECT_URL="postgresql://..."                      # direct connection (port 5432), dùng cho migrate
   NEXTAUTH_SECRET="..."                               # random string, tạo bằng: openssl rand -base64 32
   NEXTAUTH_URL="http://localhost:3000"
   SEED_ADMIN_EMAIL="admin@example.com"
   SEED_ADMIN_PASSWORD="..."                           # mật khẩu Super Admin đầu tiên
   ```

3. Chạy migration và seed dữ liệu ban đầu (Super Admin + cấu hình mặc định):

   ```bash
   npx prisma migrate deploy
   npx prisma db seed
   ```

4. Chạy dev server:

   ```bash
   npm run dev
   ```

   Mở [http://localhost:3000](http://localhost:3000), đăng nhập bằng `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.

> Lưu ý: dev server chạy với `--webpack` (không dùng Turbopack) — Turbopack gặp lỗi tạo junction point trên một số ổ đĩa Windows.

## Cấu trúc quyền hạn

- `src/lib/levels.ts` — thứ tự 5 cấp và nhãn hiển thị.
- `src/lib/access.ts` — các hàm `require*` kiểm tra quyền, luôn đọc `status`/`grantedLevel` tươi từ DB (không tin JWT). Mọi trang và Server Action nhạy cảm đều gọi hàm tương ứng ở đầu function.
- `middleware.ts` — chỉ là lớp redirect thô ở Edge (dựa vào JWT) để UX nhanh hơn, không phải lớp bảo mật thật sự.

## Deploy lên Vercel

1. Push code lên GitHub, import project vào Vercel.
2. Khai báo các biến môi trường ở trên trong Vercel Project Settings → Environment Variables.
3. Thêm bước chạy migration trước khi build, ví dụ trong `package.json`:

   ```json
   "scripts": {
     "vercel-build": "prisma migrate deploy && prisma generate && next build"
   }
   ```

4. Sau lần deploy đầu tiên, chạy `npx prisma db seed` một lần (trỏ `DATABASE_URL`/`DIRECT_URL` tới database production) để tạo Super Admin đầu tiên.

## Ghi chú

- Video bài học chỉ nhúng qua YouTube (lưu `youtubeId`, không upload file).
- Chấm điểm trắc nghiệm nhiều-đáp-án: đúng toàn bộ đáp án đúng (không thừa, không thiếu) mới tính đúng câu đó.
- Ngưỡng đạt (`passPercentage`, mặc định 80%) cấu hình tại Cài đặt; mỗi lượt làm bài lưu lại ngưỡng đã dùng nên không đổi khi admin sửa cấu hình sau này.
- Xóa học viên là xóa vĩnh viễn, cascade xóa toàn bộ điểm test và lịch sử xin lên cấp liên quan.
