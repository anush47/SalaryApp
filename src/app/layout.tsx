import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v13-appRouter";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { NextAuthProvider } from "./NextAuthProvider";
import AppThemeProvider from "./theme-provider";
import { SnackbarProvider } from "./contexts/SnackbarContext"; // Add this
import QueryProvider from "./QueryProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SalaryApp",
  description: "Payroll, EPF/ETF Management Made Simple",
};

export const viewport: Viewport = {
  width: "device-width",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <NextAuthProvider>
          <AppRouterCacheProvider>
            <AppThemeProvider>
              <SnackbarProvider>
                <QueryProvider>{children}</QueryProvider>
                <SpeedInsights />
              </SnackbarProvider>
            </AppThemeProvider>
          </AppRouterCacheProvider>
        </NextAuthProvider>
      </body>
    </html>
  );
}
