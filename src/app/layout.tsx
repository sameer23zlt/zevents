import type { Metadata, Viewport } from "next";
import Providers from "@/components/Providers";
import PWARegister from "@/components/PWARegister";

export const metadata: Metadata = {
  title: "Zevents",
  description: "Community sports event management — football, cricket & more",
  manifest: "/manifest.json",
  applicationName: "Zevents",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Zevents",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#1B7A3D",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
        <PWARegister />
      </body>
    </html>
  );
}
