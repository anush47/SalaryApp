"use client";

import React, { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Button,
} from "@mui/material";

export default function ForcePasswordChange() {
    const { data: session } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const shouldForceChange = session?.user?.forcePasswordChange;
    const isSettingsPage = pathname === "/user" && searchParams.get("userPageSelect") === "settings";

    useEffect(() => {
        if (shouldForceChange && !isSettingsPage) {
            // if not settings page, redirect to settings page
        }
    }, [shouldForceChange, isSettingsPage, router]);

    if (!shouldForceChange || isSettingsPage) {
        return null;
    }

    return (
        <Dialog open={true} disableEscapeKeyDown>
            <DialogTitle>Change Password Required</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    Your account has been flagged for a mandatory password change.
                    Please update your password to continue using the application.
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button
                    variant="contained"
                    onClick={() => router.push("/user?userPageSelect=settings")}
                >
                    Go to Settings
                </Button>
            </DialogActions>
        </Dialog>
    );
}
