import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ConfirmDialogProvider } from "@/components/ui/confirm-dialog";
import { ToastProvider } from "@/components/ui/toast";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import { getLocale } from "@/lib/i18n/get-locale";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LMS IGNITE",
  description: "Hệ thống đào tạo nội bộ 5 cấp",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "LMS IGNITE",
  },
};

// viewportFit: "cover" lets content extend under the iPhone notch/home-indicator
// area instead of Safari letterboxing it — required for env(safe-area-inset-*)
// (used by the floating chat widgets) to report real, non-zero values.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#4338ca",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { locale, bilingualEnabled } = await getLocale();
  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LocaleProvider initialLocale={locale} bilingualEnabled={bilingualEnabled}>
          <ToastProvider>
            <ConfirmDialogProvider>{children}</ConfirmDialogProvider>
          </ToastProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
