import React from "react";
import { Grid, Button } from "@mui/material";
import { Fingerprint, EventNote, Receipt, Person, Dashboard } from "@mui/icons-material";
import { useRouter } from "next/navigation";

interface QuickActionsProps {
    isClockedIn: boolean;
    view?: 'dashboard' | 'attendance';
}

const QuickActions: React.FC<QuickActionsProps> = ({ isClockedIn, view = 'dashboard' }) => {
    const router = useRouter();

    return (
        <Grid container spacing={1.5}>
            <Grid item xs={12} sm={6} md={3}>
                <Button
                    variant="contained"
                    fullWidth
                    startIcon={view === 'attendance' ? <Dashboard /> : <Fingerprint />}
                    onClick={() => {
                        if (view === 'attendance') {
                            router.push("/user?userPageSelect=dashboard");
                        } else {
                            router.push("/user?userPageSelect=attendance&tab=live");
                        }
                    }}
                    sx={{ py: 1.2, fontWeight: 'bold' }}
                >
                    {view === 'attendance' ? "Dashboard" : (isClockedIn ? "Clock Out / Attendance" : "Clock In / Attendance")}
                </Button>
            </Grid>
            <Grid item xs={6} sm={6} md={3}>
                <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<EventNote />}
                    onClick={() => router.push("/user?userPageSelect=leaves&tab=apply")}
                    sx={{ py: 1.2 }}
                >
                    Apply Leave
                </Button>
            </Grid>
            <Grid item xs={6} sm={6} md={3}>
                <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<Receipt />}
                    onClick={() => router.push("/user?userPageSelect=payslips&tab=payslips")}
                    sx={{ py: 1.2 }}
                >
                    Payslips
                </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
                <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<Person />}
                    onClick={() => router.push("/user?userPageSelect=profile")}
                    sx={{ py: 1.2 }}
                >
                    My Profile
                </Button>
            </Grid>
        </Grid>
    );
};

export default QuickActions;
