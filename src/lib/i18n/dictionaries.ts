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
      hocVien: "Thành viên",
      guest: "Khách",
    },
    adminNav: {
      overview: "Tổng quan",
      students: "Thành viên",
      lessons: "Bài học",
      results: "Kết quả",
      levelUpRequests: "Yêu cầu lên cấp",
      exclusiveCourses: "Khóa học độc quyền",
      library: "Thư viện",
      products: "Sản phẩm",
      orders: "Đơn hàng",
      consultations: "Tư vấn",
      announcements: "Bản tin",
      support: "Hỗ trợ thành viên",
      adminManagement: "Quản lý Admin",
      settings: "Cài đặt",
      backToStudentPage: "Về trang thành viên",
      whiteboards: "Bảng vẽ",
      groups: "Danh sách nhóm",
      tests: "Khám phá bản thân",
      minigame: "Mini-game & thưởng",
    },
    dashboardNav: {
      fiveLevelTraining: "6 Cấp đào tạo",
      myGroup: "Nhóm của tôi",
      exclusiveCourses: "Khóa học độc quyền",
      library: "Thư viện",
      products: "Sản phẩm",
      announcements: "Bản tin",
      chat: "Nhắn tin",
      levelUp: "Xin lên cấp",
      profile: "Thông tin cá nhân",
      goToAdmin: "Vào trang Admin",
      whiteboards: "Bảng vẽ",
    },
    guestNav: {
      home: "Trang chủ",
      announcements: "Bản tin",
      exclusiveCourses: "Khóa học độc quyền",
      library: "Thư viện",
      products: "Sản phẩm",
      login: "Đăng nhập",
      register: "Đăng ký",
    },
    settingsPage: {
      title: "Cài đặt",
      chatTitle: "Tính năng chat",
      chatDescription:
        "Bật/tắt nhắn tin hỗ trợ, nhắn tin trực tiếp, chat nhóm cho thành viên và admin, và chat hỗ trợ cho khách chưa đăng nhập.",
      registrationTitle: "Đăng ký tài khoản mới",
      registrationDescription:
        "Bật/tắt cho phép người dùng mới tự đăng ký tài khoản tại trang đăng ký. Khi tắt, tài khoản mới chỉ có thể được Admin tạo thủ công.",
      bilingualTitle: "Song ngữ (Tiếng Việt - English)",
      bilingualDescription: "Cho phép thành viên và admin chuyển đổi giao diện giữa tiếng Việt và tiếng Anh.",
      emailVerificationTitle: "Bắt buộc xác thực email",
      emailVerificationDescription:
        "Bật/tắt yêu cầu thành viên xác thực email (bấm liên kết gửi qua Resend) trước khi đăng nhập được. Khi tắt, tài khoản mới dùng được ngay sau khi đăng ký.",
      googleLoginTitle: "Đăng nhập bằng Google",
      googleLoginDescription:
        "Bật/tắt nút \"Đăng nhập bằng Google\" ở trang đăng nhập. Lần đầu đăng nhập bằng một email Google chưa từng có tài khoản sẽ tự tạo tài khoản mới nếu \"Đăng ký tài khoản mới\" ở trên cũng đang bật.",
      salesTitle: "Bán khóa học / thư viện",
      salesDescription:
        'Bật/tắt toàn bộ tính năng bán hàng — nút "Mua ngay", trang "Đơn hàng của tôi" của thành viên, và trang "Đơn hàng" của admin đều ẩn đi khi tắt. Chỉ bật sau khi đã điền đầy đủ thông tin chuyển khoản bên dưới. Nếu đang có đơn chờ xác nhận, phải bật lại công tắc này mới xử lý được.',
      autoPaymentTitle: "Thanh toán tự động (SePay)",
      autoPaymentDescription:
        "Bật/tắt tự động xác nhận đơn hàng khi có chuyển khoản khớp mã đơn qua webhook SePay. Cần cấu hình SEPAY_WEBHOOK_SECRET trước khi bật. Khi tắt, admin vẫn xác nhận thanh toán thủ công như bình thường ở trang \"Đơn hàng\".",
      adminManagementTitle: "Quản lý Admin",
      adminManagementDescription: "Cấp/thu hồi quyền admin cho tài khoản, xem toàn bộ thông tin từng admin.",
      whiteboardsTitle: "Bảng vẽ",
      whiteboardsDescription:
        "Bật/tắt tính năng bảng vẽ cộng tác (sơ đồ, mindmap, ghi chú) cho Super Admin, Admin và thành viên. Khi tắt, toàn bộ tính năng ẩn đi với mọi người, kể cả Super Admin.",
    },
    dashboardLevelsPage: {
      accessDenied: "Bạn không có quyền truy cập nội dung đó.",
      title: "6 Cấp Đào Tạo",
      unlocked: "Đã mở khóa",
      locked: "Chưa được cấp quyền",
    },
    installApp: {
      button: "Cài đặt ứng dụng",
      iosTitle: "Cài lên màn hình chính",
      iosStep1: "Nhấn biểu tượng Chia sẻ trên thanh công cụ Safari.",
      iosStep2: "Chọn \"Thêm vào MH chính\" (Add to Home Screen).",
      iosStep3: "Nhấn \"Thêm\" ở góc trên bên phải.",
      close: "Đã hiểu",
      nonSafariTitle: "Mở bằng Safari để cài đặt",
      nonSafariBody:
        "Trên iPhone/iPad, việc thêm ứng dụng vào màn hình chính chỉ thực hiện được trong Safari. Bạn đang mở trang này bằng trình duyệt khác (Chrome, hoặc trình duyệt trong Zalo/Facebook/Messenger...) — hãy mở đường link này bằng Safari rồi thử lại.",
      macSafariTitle: "Thêm vào Dock để cài đặt",
      macSafariBody:
        "Trên Mac, mở menu File của Safari rồi chọn \"Thêm vào Dock…\" (Add to Dock) để cài ứng dụng như một app riêng.",
    },
    guestHomePage: {
      welcomeTitle: "Chào mừng đến với",
      intro:
        "Nền tảng đào tạo theo lộ trình 6 cấp — khám phá bản tin và khóa học độc quyền ngay, không cần đăng nhập. Đăng ký để mở khóa toàn bộ nội dung.",
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
      hocVien: "Member",
      guest: "Guest",
    },
    adminNav: {
      overview: "Overview",
      students: "Members",
      lessons: "Lessons",
      results: "Results",
      levelUpRequests: "Level-up requests",
      exclusiveCourses: "Exclusive courses",
      library: "Library",
      products: "Products",
      orders: "Orders",
      consultations: "Consultations",
      announcements: "Announcements",
      support: "Member support",
      adminManagement: "Admin management",
      settings: "Settings",
      backToStudentPage: "Back to member view",
      whiteboards: "Whiteboards",
      groups: "Groups",
      tests: "Self-discovery tests",
      minigame: "Mini-game & rewards",
    },
    dashboardNav: {
      fiveLevelTraining: "6-Level training",
      myGroup: "My group",
      exclusiveCourses: "Exclusive courses",
      library: "Library",
      products: "Products",
      announcements: "Announcements",
      chat: "Messages",
      levelUp: "Request level-up",
      profile: "Profile",
      goToAdmin: "Go to Admin",
      whiteboards: "Whiteboards",
    },
    guestNav: {
      home: "Home",
      announcements: "Announcements",
      exclusiveCourses: "Exclusive courses",
      library: "Library",
      products: "Products",
      login: "Log in",
      register: "Sign up",
    },
    settingsPage: {
      title: "Settings",
      chatTitle: "Chat",
      chatDescription:
        "Turn support chat, direct messages, and group chat on or off for members and admins, plus support chat for signed-out guests.",
      registrationTitle: "New account registration",
      registrationDescription:
        "Allow new users to self-register an account on the registration page. When off, new accounts can only be created manually by an Admin.",
      bilingualTitle: "Bilingual (Tiếng Việt - English)",
      bilingualDescription: "Let members and admins switch the interface between Vietnamese and English.",
      emailVerificationTitle: "Require email verification",
      emailVerificationDescription:
        "Require members to verify their email (via a link sent through Resend) before they can log in. When off, new accounts work immediately after registering.",
      googleLoginTitle: "Google sign-in",
      googleLoginDescription:
        'Turn the "Sign in with Google" button on the login page on or off. The first time an unrecognized Google email signs in, a new account is auto-created only if "New account registration" above is also on.',
      salesTitle: "Course / library sales",
      salesDescription:
        'Turn the whole sales feature on or off — the "Buy Now" button, a member\'s "My Orders" page, and the admin "Orders" page all hide when off. Only turn on after filling in the bank transfer details below. If there\'s a pending order, this switch must be back on to process it.',
      autoPaymentTitle: "Automatic payment (SePay)",
      autoPaymentDescription:
        'Turn on to auto-confirm an order once a matching bank transfer arrives via the SePay webhook. Requires SEPAY_WEBHOOK_SECRET to be configured first. When off, admins still confirm payments manually as usual on the "Orders" page.',
      adminManagementTitle: "Admin management",
      adminManagementDescription: "Grant or revoke admin permissions per account, and view each admin's full details.",
      whiteboardsTitle: "Whiteboards",
      whiteboardsDescription:
        "Turn the collaborative whiteboard feature (diagrams, mindmaps, notes) on or off for Super Admin, Admin, and members. When off, the whole feature is hidden from everyone, Super Admin included.",
    },
    dashboardLevelsPage: {
      accessDenied: "You don't have access to that content.",
      title: "6-Level Training",
      unlocked: "Unlocked",
      locked: "Not yet granted",
    },
    installApp: {
      button: "Install app",
      iosTitle: "Add to Home Screen",
      iosStep1: "Tap the Share icon in Safari's toolbar.",
      iosStep2: "Choose \"Add to Home Screen\".",
      iosStep3: "Tap \"Add\" in the top-right corner.",
      close: "Got it",
      nonSafariTitle: "Open in Safari to install",
      nonSafariBody:
        "On iPhone/iPad, adding the app to your home screen only works in Safari. You're viewing this page in another browser (Chrome, or a browser embedded in Zalo/Facebook/Messenger...) — open this link in Safari and try again.",
      macSafariTitle: "Add to Dock to install",
      macSafariBody:
        "On Mac, open Safari's File menu and choose \"Add to Dock…\" to install the app as its own window.",
    },
    guestHomePage: {
      welcomeTitle: "Welcome to",
      intro:
        "A 6-level training platform — explore announcements and exclusive courses right away, no sign-in required. Register to unlock everything.",
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
