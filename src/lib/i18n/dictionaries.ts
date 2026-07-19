// Bilingual dictionary — flat-ish, namespaced by area so each layout/page
// only pulls the slice it needs. New areas get their own namespace here
// rather than reusing "common" once their text stops being truly shared,
// so a wording tweak in one area can't accidentally change another.
export const dictionaries = {
  vi: {
    common: {
      admin: "Admin",
      superAdmin: "Super Admin",
      adminManager: "Admin Manager",
      logout: "Đăng xuất",
      switchToEnglish: "Chuyển sang tiếng Anh",
      switchToVietnamese: "Chuyển sang tiếng Việt",
    },
    brandSubtitle: {
      admin: "Quản trị viên",
      hocVien: "Học viên",
      hocSinh: "Học sinh",
      guest: "Khách",
    },
    adminNav: {
      overview: "Tổng quan",
      prospectiveStudents: "Học sinh",
      students: "Học viên",
      lessons: "Bài học",
      results: "Kết quả",
      levelUpRequests: "Yêu cầu lên cấp",
      exclusiveCourses: "Khóa học độc quyền",
      library: "Thư viện",
      products: "Sản phẩm",
      orders: "Đơn hàng",
      announcements: "Bản tin",
      support: "Hỗ trợ học viên",
      adminManagement: "Quản lý Admin",
      settings: "Cài đặt",
      backToStudentPage: "Về trang học viên",
    },
    dashboardNav: {
      fiveLevelTraining: "5 Cấp đào tạo",
      exclusiveCourses: "Khóa học độc quyền",
      library: "Thư viện",
      products: "Sản phẩm",
      announcements: "Bản tin",
      chat: "Nhắn tin",
      levelUp: "Xin lên cấp",
      profile: "Thông tin cá nhân",
      goToAdmin: "Vào trang Admin",
      myOrders: "Đơn hàng của tôi",
    },
    hocSinhNav: {
      home: "Trang chủ",
      announcements: "Bản tin",
      exclusiveCourses: "Khóa học độc quyền",
      library: "Thư viện",
      joinFiveLevel: "Tham gia hệ thống 5 cấp",
      profile: "Thông tin cá nhân",
    },
    guestNav: {
      home: "Trang chủ",
      announcements: "Bản tin",
      exclusiveCourses: "Khóa học độc quyền",
      library: "Thư viện",
      login: "Đăng nhập",
      register: "Đăng ký",
    },
    settingsPage: {
      title: "Cài đặt",
      chatTitle: "Tính năng chat",
      chatDescription:
        "Bật/tắt nhắn tin hỗ trợ, nhắn tin trực tiếp, chat nhóm cho học viên và admin, và chat hỗ trợ cho khách chưa đăng nhập.",
      registrationTitle: "Đăng ký tài khoản mới",
      registrationDescription:
        "Bật/tắt cho phép người dùng mới tự đăng ký tài khoản tại trang đăng ký. Khi tắt, tài khoản mới chỉ có thể được Admin tạo thủ công.",
      bilingualTitle: "Song ngữ (Tiếng Việt - English)",
      bilingualDescription: "Cho phép học viên và admin chuyển đổi giao diện giữa tiếng Việt và tiếng Anh.",
      emailVerificationTitle: "Bắt buộc xác thực email",
      emailVerificationDescription:
        "Bật/tắt yêu cầu học viên xác thực email (bấm liên kết gửi qua Resend) trước khi đăng nhập được. Khi tắt, tài khoản mới dùng được ngay sau khi đăng ký.",
      googleLoginTitle: "Đăng nhập bằng Google",
      googleLoginDescription:
        "Bật/tắt nút \"Đăng nhập bằng Google\" ở trang đăng nhập. Lần đầu đăng nhập bằng một email Google chưa từng có tài khoản sẽ tự tạo tài khoản mới nếu \"Đăng ký tài khoản mới\" ở trên cũng đang bật.",
      salesTitle: "Bán khóa học / thư viện",
      salesDescription:
        'Bật/tắt toàn bộ tính năng bán hàng — nút "Mua ngay", trang "Đơn hàng của tôi" của học viên, và trang "Đơn hàng" của admin đều ẩn đi khi tắt. Chỉ bật sau khi đã điền đầy đủ thông tin chuyển khoản bên dưới. Nếu đang có đơn chờ xác nhận, phải bật lại công tắc này mới xử lý được.',
      adminManagementTitle: "Quản lý Admin",
      adminManagementDescription: "Cấp/thu hồi quyền admin cho tài khoản, xem toàn bộ thông tin từng admin.",
    },
    dashboardHomePage: {
      welcomeBack: "Chào mừng trở lại,",
      hocSinhIntro:
        "Bạn đang là học sinh — khám phá bản tin và khóa học độc quyền, hoặc xin tham gia hệ thống đào tạo 5 cấp để mở khóa toàn bộ lộ trình.",
      joinFiveLevel: "Tham gia hệ thống đào tạo 5 cấp",
      latestAnnouncements: "Bản tin mới nhất",
      viewAll: "Xem tất cả",
      noAnnouncements: "Chưa có bản tin nào.",
      featuredCourses: "Khóa học nổi bật",
      featuredEbooks: "Ebook nổi bật",
    },
    dashboardLevelsPage: {
      accessDenied: "Bạn không có quyền truy cập nội dung đó.",
      title: "5 Cấp Đào Tạo",
      unlocked: "Đã mở khóa",
      locked: "Chưa được cấp quyền",
    },
    guestHomePage: {
      welcomeTitle: "Chào mừng đến với",
      intro:
        "Nền tảng đào tạo theo lộ trình 5 cấp — khám phá bản tin và khóa học độc quyền ngay, không cần đăng nhập. Đăng ký để mở khóa toàn bộ nội dung.",
      registerNow: "Đăng ký ngay",
      latestAnnouncements: "Bản tin mới nhất",
      viewAll: "Xem tất cả",
      noAnnouncements: "Chưa có bản tin công khai nào.",
      featuredCourses: "Khóa học nổi bật",
      featuredEbooks: "Ebook nổi bật",
    },
  },
  en: {
    common: {
      admin: "Admin",
      superAdmin: "Super Admin",
      adminManager: "Admin Manager",
      logout: "Log out",
      switchToEnglish: "Switch to English",
      switchToVietnamese: "Switch to Vietnamese",
    },
    brandSubtitle: {
      admin: "Admin",
      hocVien: "Student",
      hocSinh: "Prospective student",
      guest: "Guest",
    },
    adminNav: {
      overview: "Overview",
      prospectiveStudents: "Prospective students",
      students: "Students",
      lessons: "Lessons",
      results: "Results",
      levelUpRequests: "Level-up requests",
      exclusiveCourses: "Exclusive courses",
      library: "Library",
      products: "Products",
      orders: "Orders",
      announcements: "Announcements",
      support: "Student support",
      adminManagement: "Admin management",
      settings: "Settings",
      backToStudentPage: "Back to student view",
    },
    dashboardNav: {
      fiveLevelTraining: "5-Level training",
      exclusiveCourses: "Exclusive courses",
      library: "Library",
      products: "Products",
      announcements: "Announcements",
      chat: "Messages",
      levelUp: "Request level-up",
      profile: "Profile",
      goToAdmin: "Go to Admin",
      myOrders: "My orders",
    },
    hocSinhNav: {
      home: "Home",
      announcements: "Announcements",
      exclusiveCourses: "Exclusive courses",
      library: "Library",
      joinFiveLevel: "Join the 5-level system",
      profile: "Profile",
    },
    guestNav: {
      home: "Home",
      announcements: "Announcements",
      exclusiveCourses: "Exclusive courses",
      library: "Library",
      login: "Log in",
      register: "Sign up",
    },
    settingsPage: {
      title: "Settings",
      chatTitle: "Chat",
      chatDescription:
        "Turn support chat, direct messages, and group chat on or off for students and admins, plus support chat for signed-out guests.",
      registrationTitle: "New account registration",
      registrationDescription:
        "Allow new users to self-register an account on the registration page. When off, new accounts can only be created manually by an Admin.",
      bilingualTitle: "Bilingual (Tiếng Việt - English)",
      bilingualDescription: "Let students and admins switch the interface between Vietnamese and English.",
      emailVerificationTitle: "Require email verification",
      emailVerificationDescription:
        "Require students to verify their email (via a link sent through Resend) before they can log in. When off, new accounts work immediately after registering.",
      googleLoginTitle: "Google sign-in",
      googleLoginDescription:
        'Turn the "Sign in with Google" button on the login page on or off. The first time an unrecognized Google email signs in, a new account is auto-created only if "New account registration" above is also on.',
      salesTitle: "Course / library sales",
      salesDescription:
        'Turn the whole sales feature on or off — the "Buy Now" button, a student\'s "My Orders" page, and the admin "Orders" page all hide when off. Only turn on after filling in the bank transfer details below. If there\'s a pending order, this switch must be back on to process it.',
      adminManagementTitle: "Admin management",
      adminManagementDescription: "Grant or revoke admin permissions per account, and view each admin's full details.",
    },
    dashboardHomePage: {
      welcomeBack: "Welcome back,",
      hocSinhIntro:
        "You're a prospective student — explore announcements and exclusive courses, or request to join the 5-level training system to unlock the full path.",
      joinFiveLevel: "Join the 5-level training system",
      latestAnnouncements: "Latest announcements",
      viewAll: "View all",
      noAnnouncements: "No announcements yet.",
      featuredCourses: "Featured courses",
      featuredEbooks: "Featured ebooks",
    },
    dashboardLevelsPage: {
      accessDenied: "You don't have access to that content.",
      title: "5-Level Training",
      unlocked: "Unlocked",
      locked: "Not yet granted",
    },
    guestHomePage: {
      welcomeTitle: "Welcome to",
      intro:
        "A 5-level training platform — explore announcements and exclusive courses right away, no sign-in required. Register to unlock everything.",
      registerNow: "Register now",
      latestAnnouncements: "Latest announcements",
      viewAll: "View all",
      noAnnouncements: "No public announcements yet.",
      featuredCourses: "Featured courses",
      featuredEbooks: "Featured ebooks",
    },
  },
};

// No `as const` — every leaf must stay plain `string` (not a vi-specific
// string literal type) so the "en" dictionary below can assign different
// wording for the same key without a type error.
export type Dictionary = (typeof dictionaries)["vi"];
