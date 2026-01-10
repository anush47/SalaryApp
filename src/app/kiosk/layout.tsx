import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Kiosk - SalaryApp",
    description: "Attendance kiosk system for face recognition",
};

export default function KioskLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
