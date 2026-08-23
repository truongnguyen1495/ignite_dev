import { redirect } from "next/navigation";
import Link from "next/link";
import { getActiveStudentOrNull, getVendorForUser } from "@/lib/access";
import { BrandLogo } from "@/components/brand-logo";
import { VendorRegisterForm } from "./vendor-register-form";

const VALUE_PROPS = [
  {
    icon: "💰",
    title: "Giữ phần lớn doanh thu mỗi đơn hàng",
    body: "RapidX chỉ giữ lại một phần hoa hồng nhỏ, phần còn lại là của bạn.",
  },
  {
    icon: "📦",
    title: "Tự chủ đóng gói & giao hàng",
    body: "Với hàng vật lý, bạn tự đóng gói và giao đến khách — chủ động hoàn toàn với đơn của mình.",
  },
  {
    icon: "🎓",
    title: "Bán được cả sản phẩm, khoá học lẫn sách",
    body: "Một gian hàng, ba loại hình: hàng vật lý, khoá học video, sách/tài liệu điện tử.",
  },
];

export default async function VendorRegisterPage() {
  const student = await getActiveStudentOrNull();
  // A student who already has a Vendor row (any status) never sees this form
  // again — sending them straight to /vendor/trang-thai instead of letting
  // them submit a second application for the same account.
  if (student && (await getVendorForUser(student.id))) {
    redirect("/vendor/trang-thai");
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-8">
        <BrandLogo />
        {!student && (
          <p className="text-sm text-muted">
            Đã có tài khoản?{" "}
            <Link href="/login?next=/vendor/dang-ky" className="font-medium text-primary hover:text-primary-hover">
              Đăng nhập
            </Link>
          </p>
        )}
      </div>

      <div className="mx-auto grid w-full max-w-5xl gap-10 px-4 py-10 sm:px-8 sm:py-16 lg:grid-cols-[1fr_1.05fr] lg:items-start">
        <div>
          <span className="mb-3 block text-xs font-bold uppercase tracking-wider text-primary">
            Nhà bán hàng RapidX
          </span>
          <h1 className="text-3xl font-bold leading-tight text-foreground sm:text-4xl">
            Đưa sản phẩm, khoá học và sách của bạn lên RapidX
          </h1>
          <p className="mt-4 max-w-md text-sm text-muted sm:text-base">
            Mở gian hàng riêng, tự quản lý danh mục và giao hàng, giữ phần lớn doanh thu mỗi đơn — không cần từng là
            học viên RapidX.
          </p>

          <div className="mt-8 space-y-5">
            {VALUE_PROPS.map((item) => (
              <div key={item.title} className="flex gap-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border-strong bg-surface text-lg">
                  {item.icon}
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-0.5 max-w-sm text-sm text-muted">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <VendorRegisterForm
          mode={student ? "existing" : "new"}
          defaultContactEmail={student?.email ?? ""}
          defaultContactPhone={student?.phoneNumber ?? ""}
        />
      </div>
    </div>
  );
}
