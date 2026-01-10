"use client";

import { useState } from "react";
import {
    Box,
    Container,
    Typography,
    Button,
    Stack,
    Grid,
    Paper,
} from "@mui/material";
import { KioskOverlay, OverlayData, OverlayType } from "../components/KioskOverlay";
import { ThemeSwitch } from "@/app/theme-provider";

export default function OverlayDemoPage() {
    const [overlayOpen, setOverlayOpen] = useState(false);
    const [overlayData, setOverlayData] = useState<OverlayData | null>(null);

    const triggerOverlay = (type: OverlayType) => {
        const configs: Record<OverlayType, Partial<OverlayData>> = {
            in: {
                greeting: "Good Morning",
                name: "Anush",
                time: "9:00 AM",
                shiftName: "Day Shift",
            },
            out: {
                greeting: "Goodbye",
                name: "Anush",
                time: "5:00 PM",
                shiftName: "Afternoon Shift",
            },
            info: {
                greeting: "Where's the face? 🔍",
                name: "Please position your face in the frame",
                time: "Scan Failed",
                isError: true,
            },
            warning: {
                greeting: "Already Scanned",
                name: "Please wait a moment",
                time: "Wait 5m",
                isError: true,
            },
            spoof: {
                greeting: "Something's Fishy! 🎣",
                name: "The camera might be playing tricks!",
                time: "Try Better Light",
                isError: true,
            },
            crowded: {
                greeting: "Crowded! 🧑‍🤝‍🧑",
                name: "Only one person in frame, please",
                time: "2 faces detected",
                isError: true,
            },
            unknown: {
                greeting: "Who's that? 🕵️‍♂️",
                name: "I don't think we've met yet! 😉",
                time: "Recognition Failed",
                isError: true,
            },
            custom: {
                greeting: "Custom Mode! ✨",
                name: "Anything you want",
                time: "Flexible UI",
                color: "#9c27b0", // Purple
            }
        };

        const selected = configs[type as OverlayType] || (configs as any)[type];
        setOverlayData({
            type: type as OverlayType,
            greeting: selected.greeting || "Hello",
            name: selected.name || "Employee",
            time: selected.time || "12:00 PM",
            isError: selected.isError,
            shiftName: selected.shiftName,
            icon: selected.icon,
            color: selected.color,
        });
        setOverlayOpen(true);
    };

    return (
        <Box sx={{ minHeight: "100vh", py: 8, bgcolor: "background.default" }}>
            <Box sx={{ position: "absolute", top: 16, right: 16 }}>
                <ThemeSwitch />
            </Box>

            <Container maxWidth="md">
                <Paper sx={{ p: 4, borderRadius: 4, textAlign: 'center' }}>
                    <Typography variant="h2" fontWeight="800" gutterBottom>
                        Overlay Gallery 🎨
                    </Typography>
                    <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 6 }}>
                        Test and verify all kiosk notification states in one place.
                    </Typography>

                    <Grid container spacing={3}>
                        {(["in", "out", "info", "warning", "spoof", "crowded", "unknown", "custom"] as (OverlayType | "custom")[]).map((type) => (
                            <Grid item xs={12} sm={6} md={4} key={type}>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    size="large"
                                    onClick={() => triggerOverlay(type)}
                                    sx={{
                                        py: 3,
                                        borderRadius: 3,
                                        textTransform: 'capitalize',
                                        fontSize: '1.1rem',
                                        fontWeight: '600',
                                        borderColor: type === 'spoof' || type === 'unknown' ? 'error.light' : 'divider',
                                        '&:hover': {
                                            bgcolor: 'action.hover',
                                            borderColor: type === 'spoof' || type === 'unknown' ? 'error.main' : 'primary.main',
                                        }
                                    }}
                                >
                                    {type} State
                                </Button>
                            </Grid>
                        ))}
                    </Grid>
                </Paper>
            </Container>

            <KioskOverlay
                open={overlayOpen}
                data={overlayData}
                onClose={() => setOverlayOpen(false)}
            />
        </Box>
    );
}
