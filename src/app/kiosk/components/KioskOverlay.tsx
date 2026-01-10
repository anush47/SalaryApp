"use client";

import {
    Box,
    Typography,
    Stack,
    Backdrop,
    Zoom,
    IconButton,
    useTheme,
    alpha,
    Chip,
} from "@mui/material";
import {
    CheckCircle,
    Coffee,
    Warning as WarningIcon,
    Security as GuardIcon,
    People as PeopleIcon,
    Help as HelpIcon,
    PersonSearch as DetectiveIcon,
    WavingHand as ByeIcon,
} from "@mui/icons-material";
import dayjs from "dayjs";

export type OverlayType = "in" | "out" | "info" | "warning" | "spoof" | "crowded" | "unknown" | "custom";

export interface OverlayData {
    name: string;
    type: OverlayType;
    greeting: string;
    time: string;
    isError?: boolean;
    shiftName?: string;
    icon?: React.ReactNode;
    color?: string;
}

interface KioskOverlayProps {
    open: boolean;
    data: OverlayData | null;
    onClose: () => void;
}

export const KioskOverlay = ({ open, data, onClose }: KioskOverlayProps) => {
    const theme = useTheme();

    if (!data) return null;

    return (
        <Backdrop
            sx={{
                color: '#fff',
                zIndex: (theme) => theme.zIndex.drawer + 5,
                backdropFilter: 'blur(10px)',
                backgroundColor: data.color ? alpha(data.color, 0.4) : 'rgba(0, 0, 0, 0.85)',
                flexDirection: 'column',
                cursor: 'pointer'
            }}
            open={open}
            onClick={onClose}
        >
            <Zoom in={open} style={{ transitionDelay: open ? '100ms' : '0ms' }}>
                <Stack alignItems="center" spacing={4} sx={{ textAlign: 'center', p: 3 }}>
                    <Box sx={{ position: 'relative' }}>
                        <Box
                            sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                borderRadius: '50%',
                                boxShadow: `0 0 60px ${data.color || (
                                    data.type === 'in' ? theme.palette.success.main :
                                        data.type === 'out' ? theme.palette.info.main :
                                            data.type === 'unknown' ? theme.palette.warning.main :
                                                data.type === 'warning' ? theme.palette.warning.main :
                                                    data.type === 'spoof' ? theme.palette.error.main :
                                                        theme.palette.info.main
                                )}`,
                                opacity: 0.5,
                                animation: 'bgPulse 2s infinite'
                            }}
                        />
                        {/* Icon Selection */}
                        {data.icon ? (
                            <Box sx={{
                                fontSize: 140,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'relative',
                                '& svg': {
                                    fontSize: 140,
                                    filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.5))',
                                    color: data.color || 'inherit',
                                    animation: 'bounce 2s infinite ease-in-out'
                                }
                            }}>
                                {data.icon}
                            </Box>
                        ) : data.type === 'warning' ? (
                            <WarningIcon
                                sx={{
                                    fontSize: 140,
                                    color: 'warning.main',
                                    filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.5))',
                                    position: 'relative',
                                    animation: 'pulse 1.5s infinite ease-in-out'
                                }}
                            />
                        ) : data.type === 'spoof' ? (
                            <GuardIcon
                                sx={{
                                    fontSize: 140,
                                    color: 'error.main',
                                    filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.5))',
                                    position: 'relative',
                                    animation: 'alert 1s infinite ease-in-out'
                                }}
                            />
                        ) : data.type === 'unknown' ? (
                            <HelpIcon
                                sx={{
                                    fontSize: 140,
                                    color: 'warning.main',
                                    filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.5))',
                                    position: 'relative',
                                    animation: 'pulse 2s infinite ease-in-out'
                                }}
                            />
                        ) : data.type === 'crowded' ? (
                            <PeopleIcon
                                sx={{
                                    fontSize: 140,
                                    color: 'info.main',
                                    filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.5))',
                                    position: 'relative',
                                    animation: 'pulse 3s infinite ease-in-out'
                                }}
                            />
                        ) : data.type === 'info' || data.isError ? (
                            <DetectiveIcon
                                sx={{
                                    fontSize: 140,
                                    color: 'info.main',
                                    filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.5))',
                                    position: 'relative',
                                    animation: 'search 2s infinite ease-in-out'
                                }}
                            />
                        ) : data.type === 'out' ? (
                            <ByeIcon
                                sx={{
                                    fontSize: 140,
                                    color: 'info.main',
                                    filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.5))',
                                    position: 'relative',
                                    animation: 'bounce 2s infinite ease-in-out'
                                }}
                            />
                        ) : (
                            <CheckCircle
                                sx={{
                                    fontSize: 140,
                                    color: 'success.main',
                                    filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.5))',
                                    position: 'relative',
                                    animation: 'bounce 2s infinite ease-in-out'
                                }}
                            />
                        )}
                    </Box>

                    <Box>
                        <Typography
                            variant="h3"
                            fontWeight="700"
                            sx={{
                                textShadow: '0 4px 30px rgba(0,0,0,0.5)',
                                mb: 1,
                                color: 'rgba(255,255,255,0.9)'
                            }}
                        >
                            {data.greeting}
                        </Typography>

                        <Typography
                            variant="h4"
                            fontWeight="500"
                            sx={{
                                opacity: 0.9,
                                textShadow: '0 2px 10px rgba(0,0,0,0.5)',
                                mb: 2
                            }}
                        >
                            {data.name}
                        </Typography>

                        <Typography
                            variant="h2"
                            fontWeight="900"
                            sx={{
                                textShadow: '0 4px 30px rgba(0,0,0,0.5)',
                                mb: 2,
                                letterSpacing: -1,
                                maxWidth: '90vw',
                                fontSize: (data.time?.length || 0) > 10
                                    ? { xs: '1.5rem', sm: '2rem', md: '2.5rem' }
                                    : { xs: '3rem', sm: '4rem', md: '5rem' }
                            }}
                        >
                            {data.time}
                        </Typography>

                        {/* Show Shift Name if available */}
                        {data.shiftName && !data.isError && (
                            <Box sx={{ mb: 2 }}>
                                <Chip
                                    label={`Shift: ${data.shiftName}`}
                                    sx={{
                                        bgcolor: 'rgba(255,255,255,0.1)',
                                        color: 'white',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        fontSize: '1.2rem',
                                        height: 48,
                                        px: 2,
                                        mb: 2
                                    }}
                                />
                            </Box>
                        )}

                        {!data.isError && (
                            <Chip
                                label={data.type?.toUpperCase()}
                                sx={{
                                    bgcolor: data.type === 'in' ? theme.palette.success.main : theme.palette.info.main,
                                    color: '#fff',
                                    fontSize: '2rem',
                                    height: 56,
                                    px: 4,
                                    borderRadius: 28,
                                    boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
                                    border: '2px solid rgba(255,255,255,0.2)'
                                }}
                            />
                        )}
                    </Box>
                </Stack>
            </Zoom>
            <style jsx global>{`
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.1); opacity: 0.8; }
                    100% { transform: scale(1); opacity: 1; }
                }
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                @keyframes wave {
                    0%, 100% { transform: rotate(0deg); }
                    25% { transform: rotate(-15deg); }
                    75% { transform: rotate(15deg); }
                }
                @keyframes alert {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.2); color: #ff1744; }
                }
                @keyframes search {
                    0%, 100% { transform: translate(0, 0); }
                    25% { transform: translate(5px, -5px); }
                    50% { transform: translate(-5px, 5px); }
                    75% { transform: translate(5px, 5px); }
                }
                @keyframes bgPulse {
                    0% { transform: scale(0.95); opacity: 0.5; }
                    50% { transform: scale(1.05); opacity: 0.2; }
                    100% { transform: scale(0.95); opacity: 0.5; }
                }
            `}</style>
        </Backdrop>
    );
};
