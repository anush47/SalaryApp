"use client";
import {
  Box,
  Button,
  Typography,
  Container,
  Grid,
  useTheme,
  IconButton,
  Tooltip,
  CircularProgress,
  useMediaQuery,
  Stack,
  Divider,
  alpha,
  Avatar,
  Chip,
  Dialog,
  Paper,
} from "@mui/material";
import { motion, useAnimation, useInView } from "framer-motion";
import { useEffect, useRef, useState, lazy, Suspense } from "react";
import {
  CheckCircleOutline,
  AccessTime,
  Payments,
  Description,
  People,
  PlayCircleOutline,
  ArrowForward,
  Logout,
  Groups,
  Business,
  AdminPanelSettings,
  RequestPage,
  Email,
  WhatsApp,
  Security,
  CloudUpload,
  CalendarToday, // Replaced CalendarMonth
  Speed,
  Devices,
} from "@mui/icons-material";
import { ThemeSwitch } from "./theme-provider";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { fetchCompanies } from "./user/mycompanies/clientComponents/companiesCards";
import { GC_TIME, STALE_TIME } from "./lib/consts";

const LazyDemoContent = lazy(() => import("./help/DemoContent"));

// --- Animation Components ---
const FadeInUp = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 40 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-100px" }}
    transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
  >
    {children}
  </motion.div>
);

const ScaleIn = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    whileInView={{ opacity: 1, scale: 1 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    style={{ width: "100%" }} // Explicit width
  >
    {children}
  </motion.div>
);

export default function HomePageClient() {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const { data: session, status } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [openDemoModal, setOpenDemoModal] = useState(false);
  const handleOpenDemoModal = () => setOpenDemoModal(true);
  const handleCloseDemoModal = () => setOpenDemoModal(false);

  // Prefetching logic
  useEffect(() => {
    if (session) {
      if (session.user?.role === "employee") {
        router.prefetch("/user?userPageSelect=dashboard");
      } else {
        router.prefetch("/user?userPageSelect=mycompanies");
        queryClient.prefetchQuery({
          queryKey: ["companies"],
          queryFn: fetchCompanies,
          staleTime: STALE_TIME,
          gcTime: GC_TIME,
        });
      }
    } else if (status === "unauthenticated") {
      router.prefetch("/api/auth/signin");
    }
  }, [session, router, queryClient, status]);

  const userName = (() => {
    if (session?.user?.name) return session.user.name.split(" ")[0];
    if (session?.user?.email) return session.user.email.split("@")[0].split(" ")[0];
    return "User";
  })();

  // Updated Gradients
  const gradientBackground =
    theme.palette.mode === "dark"
      ? "radial-gradient(circle at 50% 0%, #1e293b 0%, #0f172a 100%)"
      : "radial-gradient(circle at 50% 0%, #e0f2fe 0%, #ffffff 100%)"; // Stronger subtle blue (#e0f2fe is Sky 100)

  const decorativeGradient =
    theme.palette.mode === "dark"
      ? "linear-gradient(135deg, rgba(25, 118, 210, 0.2) 0%, rgba(25, 118, 210, 0) 60%)"
      : "linear-gradient(135deg, rgba(25, 118, 210, 0.1) 0%, rgba(25, 118, 210, 0.0) 60%)";

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: gradientBackground,
        color: theme.palette.text.primary,
        overflowX: "hidden",
        position: "relative",
      }}
    >
      {/* Decorative Blob */}
      <Box
        sx={{
          position: "absolute",
          top: -100,
          right: -100,
          width: 500,
          height: 500,
          background: decorativeGradient,
          borderRadius: "50%",
          filter: "blur(100px)",
          zIndex: 0,
        }}
      />

      {/* --- Header --- */}
      <Container maxWidth="xl" sx={{ position: "relative", zIndex: 10 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            py: 3,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Image
              src="/Logo_Withtext.png"
              alt="SalaryApp Logo"
              width={isSmallScreen ? 120 : 160}
              height={isSmallScreen ? 40 : 50}
              style={{
                filter: theme.palette.mode === "dark" ? "brightness(0) invert(1)" : "none",
              }}
            />
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <ThemeSwitch />
            {session ? (
              <>
                <Chip
                  avatar={<Avatar src={session?.user?.image ?? undefined} />}
                  label={userName}
                  variant="outlined"
                  sx={{
                    borderColor: alpha(theme.palette.primary.main, 0.3),
                    bgcolor: alpha(theme.palette.background.paper, 0.5),
                    backdropFilter: "blur(8px)",
                  }}
                />
                <Tooltip title="Sign Out">
                  <IconButton
                    onClick={() => (window.location.href = "/api/auth/signout")}
                    color="primary"
                  >
                    <Logout />
                  </IconButton>
                </Tooltip>
              </>
            ) : (
              <Button
                variant="outlined"
                href="/api/auth/signin"
                sx={{ borderRadius: "20px" }}
              >
                Sign In
              </Button>
            )}
          </Box>
        </Box>
      </Container>


      {/* --- HERO SECTION --- */}
      <Container maxWidth="lg" sx={{ pt: { xs: 6, md: 12 }, pb: { xs: 8, md: 16 }, position: "relative", zIndex: 1 }}>
        <Box textAlign="center" sx={{ maxWidth: 900, mx: "auto" }}>
          <FadeInUp>
            <Chip
              icon={<Speed fontSize="small" />}
              label="v2.0 Now Available"
              size="small"
              color="primary"
              variant="outlined"
              sx={{ mb: 2, fontWeight: 600, bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main, border: 'none' }}
            />
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: "2.5rem", md: "4rem" },
                fontWeight: 700,
                lineHeight: 1.1,
                mb: 3,
                background: theme.palette.mode === 'dark'
                  ? "linear-gradient(to right, #ffffff, #94a3b8)"
                  : "linear-gradient(to right, #0f172a, #334155)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Manage Salaries, EPF/ETF &<br /> Employees in one place.
            </Typography>
          </FadeInUp>

          <FadeInUp delay={0.2}>
            <Typography
              variant="h5"
              sx={{
                color: theme.palette.text.secondary,
                fontWeight: 400,
                mb: 4,
                lineHeight: 1.6,
                maxWidth: 700,
                mx: "auto",
                fontSize: { xs: "1rem", md: "1.25rem" }, // Smaller on mobile
              }}
            >
              More than just payroll. Manage attendance, leaves, and employee files in one integrated platform.
            </Typography>
          </FadeInUp>

          <FadeInUp delay={0.3}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="center">
              <Link
                href={
                  session
                    ? session.user?.role === "employee"
                      ? "/user?userPageSelect=dashboard"
                      : "/user?userPageSelect=mycompanies"
                    : "/api/auth/signin"
                }
                style={{ width: '100%' }} // Ensure Link takes full width on mobile
              >
                <Button
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForward />}
                  sx={{
                    px: 5,
                    py: 2,
                    fontSize: "1.1rem",
                    borderRadius: "50px",
                    boxShadow: `0 20px 40px -10px ${alpha(theme.palette.primary.main, 0.4)}`,
                    textTransform: "none",
                    width: { xs: "100%", sm: "auto" } // Full width on mobile
                  }}
                >
                  {session ? "Go to Dashboard" : "Get Started Free"}
                </Button>
              </Link>
              <Button
                variant="outlined"
                size="large"
                startIcon={<PlayCircleOutline />}
                onClick={handleOpenDemoModal}
                sx={{
                  px: 5,
                  py: 2,
                  fontSize: "1.1rem",
                  borderRadius: "50px",
                  textTransform: "none",
                  borderWidth: 2,
                  "&:hover": { borderWidth: 2 },
                  width: { xs: "100%", sm: "auto" } // Full width on mobile
                }}
              >
                Watch Demo
              </Button>
            </Stack>
          </FadeInUp>
        </Box>




      </Container>


      {/* --- STATS BAR --- */}
      <Container maxWidth="lg" sx={{ mb: 16 }}>
        <FadeInUp>
          <Grid container spacing={4} justifyContent="center">
            {[
              { label: "Trusted Businesses", value: "25+", icon: <Business fontSize="large" color="primary" /> },
              { label: "Employees Managed", value: "600+", icon: <People fontSize="large" color="primary" /> },
              { label: "Salaries Processed", value: "1500+", icon: <Payments fontSize="large" color="primary" /> },
            ].map((stat, i) => (
              <Grid item xs={12} md={4} key={i}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 4,
                    borderRadius: 4,
                    bgcolor: alpha(theme.palette.background.paper, 0.5),
                    backdropFilter: "blur(10px)",
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    textAlign: "center",
                    transition: "transform 0.3s ease",
                    "&:hover": { transform: "translateY(-5px)" }
                  }}
                >
                  <Box sx={{ mb: 2 }}>{stat.icon}</Box>
                  <Typography variant="h3" fontWeight={800} gutterBottom>{stat.value}</Typography>
                  <Typography variant="subtitle1" color="text.secondary">{stat.label}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </FadeInUp>
      </Container>


      {/* --- FEATURE SPOTLIGHT: Payroll --- */}
      <Container maxWidth="lg" sx={{ mb: 20 }}>
        <Grid container spacing={8} alignItems="center">
          <Grid item xs={12} md={6}>
            <FadeInUp>
              <Typography variant="overline" color="primary" fontWeight={700} sx={{ letterSpacing: 1.5 }}>CORE ENGINE</Typography>
              <Typography variant="h2" fontWeight={800} sx={{ mb: 3, mt: 1 }}>Instant, Error-Free Payroll.</Typography>
              <Typography variant="body1" color="text.secondary" paragraph sx={{ fontSize: "1.1rem" }}>
                Say goodbye to Excel errors. Generate salaries for your entire workforce in minutes, with automated calculations for EPF, ETF, and taxes.
              </Typography>
              <Stack spacing={2} sx={{ mt: 4 }}>
                {["One-Click Salary Generation", "Automated Statutory Deductions (EPF/ETF)", "Government Compliant Reporting"].map(item => (
                  <Box key={item} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <CheckCircleOutline color="success" />
                    <Typography fontWeight={500}>{item}</Typography>
                  </Box>
                ))}
              </Stack>
            </FadeInUp>
          </Grid>
          <Grid item xs={12} md={6}>
            <ScaleIn delay={0.2}>
              <Box
                sx={{
                  position: "relative",
                  width: "100%",
                  height: { xs: 300, md: 500 },
                  borderRadius: 4,
                  overflow: "hidden",
                  boxShadow: theme.palette.mode === 'dark'
                    ? "0 30px 60px -12px rgba(0,0,0,0.8)"
                    : "0 30px 60px -12px rgba(25, 118, 210, 0.2)",
                  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                  transform: "rotateX(2deg)",
                  background: theme.palette.mode === 'dark' ? alpha('#1e293b', 0.8) : alpha('#ffffff', 0.8),
                  backdropFilter: 'blur(20px)',
                  perspective: "1000px"
                }}
              >
                {/* Mock UI Header */}
                <Box sx={{ p: 2, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#ff5f57' }} />
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#febc2e' }} />
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#28c840' }} />
                  </Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>Pipeline Overview</Typography>
                  <Box sx={{ width: 40 }} />
                </Box>

                <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {/* Top Stats Row */}
                  <Stack direction="row" spacing={6} sx={{ px: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>Total Processed</Typography>
                      <Typography variant="h4" fontWeight={800}>LKR 4.2M</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>Active Employees</Typography>
                      <Typography variant="h4" fontWeight={800}>156</Typography>
                    </Box>
                  </Stack>

                  {/* Bar Chart Visual */}
                  <Box sx={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', pb: 6, px: 2, gap: 1 }}>
                    {[35, 55, 45, 70, 60, 85, 95, 75, 65, 80, 50, 40].map((h, i) => (
                      <Box key={i} sx={{
                        width: '100%',
                        height: `${h}%`,
                        bgcolor: i === 6 ? theme.palette.primary.main : alpha(theme.palette.primary.main, 0.1),
                        borderRadius: '4px 4px 0 0',
                        transition: 'all 0.3s ease',
                        position: 'relative',
                        '&:hover': { height: `${h + 5}%`, bgcolor: theme.palette.primary.main }
                      }}>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Box>
            </ScaleIn>
          </Grid>
        </Grid>
      </Container>


      {/* --- FEATURE SPOTLIGHT: Documents (New) --- */}
      <Container maxWidth="lg" sx={{ mb: 20 }}>
        {/* Background Accent */}
        <Box sx={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: 600,
          background: alpha(theme.palette.primary.main, 0.03),
          transform: 'skewY(-3deg)',
          zIndex: -1
        }} />

        <Grid container spacing={8} alignItems="center" direction={{ xs: "column-reverse", md: "row" }}>
          <Grid item xs={12} md={6}>
            <ScaleIn delay={0.2}>

              <Box sx={{
                width: '100%',
                bgcolor: alpha(theme.palette.background.paper, 0.5),
                borderRadius: 4,
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                overflow: 'hidden',
                boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)',
              }}>
                {/* Mock Window Header */}
                <Box sx={{
                  px: 3,
                  py: 2,
                  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  bgcolor: alpha(theme.palette.primary.main, 0.03)
                }}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#ff5f57' }} />
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#febc2e' }} />
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#28c840' }} />
                  </Box>
                  <Typography variant="caption" fontWeight={600} color="text.secondary">Employee Documents</Typography>
                </Box>

                {/* Mock File List */}
                <Stack spacing={0} divider={<Divider />}>
                  {[
                    { name: 'Employment_Contract.pdf', size: '2.4 MB', date: 'Just now', icon: <Description color="error" /> },
                    { name: 'NIC_Copy_Front.jpg', size: '1.8 MB', date: '2 days ago', icon: <Description color="primary" /> },
                    { name: 'Offer_Letter_Signed.pdf', size: '1.2 MB', date: '1 week ago', icon: <Description color="error" /> },
                  ].map((file, i) => (
                    <Box key={i} sx={{
                      p: 2,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      bgcolor: i === 0 ? alpha(theme.palette.primary.main, 0.05) : 'transparent',
                      transition: 'background-color 0.2s',
                      '&:hover': { bgcolor: alpha(theme.palette.action.hover, 0.1) }
                    }}>
                      <Avatar sx={{ width: 40, height: 40, bgcolor: alpha(theme.palette.background.paper, 0.8) }}>
                        {file.icon}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle2" fontWeight={600} noWrap>{file.name}</Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="caption" color="text.secondary">{file.size}</Typography>
                          <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary">{file.date}</Typography>
                        </Stack>
                      </Box>
                      {i === 0 && <CheckCircleOutline color="success" fontSize="small" />}
                    </Box>
                  ))}
                </Stack>
              </Box>
            </ScaleIn>
          </Grid>
          <Grid item xs={12} md={6}>
            <FadeInUp>
              <Chip label="New" color="secondary" size="small" sx={{ mb: 2 }} />
              <Typography variant="h2" fontWeight={800} sx={{ mb: 3 }}>Your Digital Filing Cabinet.</Typography>
              <Typography variant="body1" color="text.secondary" paragraph sx={{ fontSize: "1.1rem" }}>
                Stop losing paperwork. Securely store ID copies, contracts, and certificates directly within employee profiles.
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph sx={{ fontSize: "1.1rem" }}>
                Files are attached permanently to employee records, accessible whenever you need them—safe, secure, and compliant.
              </Typography>
            </FadeInUp>
          </Grid>
        </Grid>
      </Container>


      {/* --- FEATURE SPOTLIGHT: Leaves --- */}
      <Container maxWidth="lg" sx={{ mb: 16 }}>
        <Grid container spacing={8} alignItems="center">
          <Grid item xs={12} md={6}>
            <FadeInUp>
              <Chip label="New" color="secondary" size="small" sx={{ mb: 1 }} />
              <Typography variant="overline" color="warning" fontWeight={700} sx={{ letterSpacing: 1.5, display: 'block' }}>SMART LEAVES</Typography>
              <Typography variant="h2" fontWeight={800} sx={{ mb: 3, mt: 1 }}>Leave Management, Solved.</Typography>
              <Typography variant="body1" color="text.secondary" paragraph sx={{ fontSize: "1.1rem" }}>
                Complex leave policies? We handle them. From monthly accruals to carry-forward rules, our flexible engine adapts to your company culture.
              </Typography>
              <Grid container spacing={2} sx={{ mt: 2 }}>
                {[
                  { title: "Flexible Policies", desc: "Set rules for Casual, Medical, Annual & more." },
                  { title: "Automated Resets", desc: "Leaves reset automatically per period." }
                ].map((item, i) => (
                  <Grid item xs={12} key={i}>
                    <Paper elevation={0} sx={{ p: 2, borderLeft: `4px solid ${theme.palette.warning.main}`, bgcolor: alpha(theme.palette.background.paper, 0.5) }}>
                      <Typography variant="subtitle2" fontWeight={700}>{item.title}</Typography>
                      <Typography variant="body2" color="text.secondary">{item.desc}</Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </FadeInUp>
          </Grid>
          <Grid item xs={12} md={6}>
            <ScaleIn delay={0.2}>
              <Box sx={{
                height: 480,
                position: "relative"
              }}>
                {/* Abstract Calendar UI Mockup */}
                <Paper sx={{
                  p: 3,
                  borderRadius: 4,
                  background: theme.palette.mode === 'dark' ? '#1e293b' : '#ffffff',
                  boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)',
                  height: '100%',
                  overflow: 'hidden',
                  position: 'relative'
                }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                    <Box>
                      <Typography variant="overline" color="text.secondary" fontWeight={600}>My Balance</Typography>
                      <Typography variant="h6" fontWeight={800}>PTO Balance</Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: alpha(theme.palette.success.main, 0.1), color: theme.palette.success.main }}>
                      <CalendarToday fontSize="small" />
                    </Avatar>
                  </Box>
                  <Stack spacing={3}>
                    {[
                      { label: 'Annual Leave', total: 14, used: 4, color: theme.palette.primary.main },
                      { label: 'Casual Leave', total: 7, used: 2, color: theme.palette.warning.main },
                      { label: 'Medical Leave', total: 14, used: 1, color: theme.palette.error.main }
                    ].map((l) => (
                      <Box key={l.label}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2" fontWeight={600}>{l.label}</Typography>
                          <Typography variant="caption" fontWeight={700} color="text.secondary">{l.total - l.used} / {l.total} Days</Typography>
                        </Box>
                        <Box sx={{
                          height: 8,
                          width: '100%',
                          bgcolor: alpha(l.color, 0.1),
                          borderRadius: 4,
                          overflow: 'hidden'
                        }}>
                          <Box
                            sx={{
                              height: '100%',
                              width: `${((l.total - l.used) / l.total) * 100}%`,
                              bgcolor: l.color,
                              borderRadius: 4
                            }}
                          />
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                </Paper>
              </Box>
            </ScaleIn>
          </Grid>
        </Grid>
      </Container>


      {/* --- BENTO GRID (More Features) --- */}
      <Container maxWidth="lg" sx={{ mb: 20 }}>
        <Box textAlign="center" mb={10}>
          <Typography variant="h2" fontWeight={800}>Everything else you need.</Typography>
          <Typography variant="h6" color="text.secondary">Built to scale with your business.</Typography>
        </Box>
        <Grid container spacing={3}>
          {[
            { title: "Smart Attendance", desc: "Track work hours with OT rules.", icon: <AccessTime fontSize="large" />, span: 4 },
            { title: "Access Anywhere", desc: "Works on Mobile, Tablet & Desktop.", icon: <Devices fontSize="large" />, span: 4 }, // Added Devices icon
            { title: "Secure Cloud", desc: "Secure encryption for your data.", icon: <Security fontSize="large" />, span: 4 },
            { title: "Tax Ready", desc: "Updated for latest SL APIT tax tables.", icon: <RequestPage fontSize="large" />, span: 6 },
            { title: "Multi-Company", desc: "Manage multiple entities under one login.", icon: <Groups fontSize="large" />, span: 6 },
          ].map((item, i) => (
            <Grid item xs={12} md={item.span} key={i}>
              <FadeInUp delay={i * 0.1}>
                <Paper sx={{
                  height: '100%',
                  p: 4,
                  borderRadius: 6,
                  bgcolor: alpha(theme.palette.background.paper, 0.4),
                  backdropFilter: "blur(20px)",
                  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    bgcolor: alpha(theme.palette.background.paper, 0.8),
                    boxShadow: theme.shadows[4]
                  }
                }}>
                  <Box sx={{ color: theme.palette.primary.main, mb: 2 }}>{item.icon}</Box>
                  <Typography variant="h5" fontWeight={700} gutterBottom>{item.title}</Typography>
                  <Typography color="text.secondary">{item.desc}</Typography>
                </Paper>
              </FadeInUp>
            </Grid>
          ))}
        </Grid>
      </Container>


      {/* --- CTA SECTION --- */}
      <Box sx={{ py: 15, bgcolor: theme.palette.mode === 'dark' ? '#0f172a' : '#f0f9ff' }}>
        <Container maxWidth="md" sx={{ textAlign: 'center' }}>
          <FadeInUp>
            <Typography variant="h2" fontWeight={800} gutterBottom>
              Ready to modernize your workforce?
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 6 }}>
              Join the forwarding-thinking companies using SalaryApp today. No credit card required.
            </Typography>
            <Link
              href={
                session
                  ? session.user?.role === "employee"
                    ? "/user?userPageSelect=dashboard"
                    : "/user?userPageSelect=mycompanies"
                  : "/api/auth/signin"
              }
            >
              <Button
                variant="contained"
                size="large"
                sx={{
                  px: 8,
                  py: 2.5,
                  fontSize: '1.2rem',
                  borderRadius: '50px',
                  fontWeight: 700
                }}
              >
                {session ? "Go to Dashboard" : "Start Your Free Trial"}
              </Button>
            </Link>
            <Box mt={4} display="flex" justifyContent="center" gap={4} color="text.secondary">
              <Typography variant="body2" display="flex" alignItems="center" gap={1}><CheckCircleOutline fontSize="small" color="success" /> No setup fees</Typography>
              <Typography variant="body2" display="flex" alignItems="center" gap={1}><CheckCircleOutline fontSize="small" color="success" /> Cancel anytime</Typography>
            </Box>
          </FadeInUp>
        </Container>
      </Box>


      {/* --- FOOTER --- */}
      <Box sx={{ py: 6, bgcolor: theme.palette.background.paper }}>
        <Container maxWidth="lg">
          <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems="center" gap={3}>
            <Box>
              <Image
                src="/Logo_Withtext.png"
                alt="SalaryApp Logo"
                width={120}
                height={40}
                style={{
                  filter: theme.palette.mode === "dark" ? "brightness(0) invert(1)" : "none",
                  opacity: 0.8
                }}
              />
              <Typography variant="caption" display="block" color="text.secondary" mt={1}>
                © 2025 SalaryApp. All rights reserved.
              </Typography>
            </Box>

            <Stack direction="row" spacing={3}>
              <Button color="inherit" href="/policies/privacy">Privacy</Button>
              <Button color="inherit" href="/policies/terms">Terms</Button>
              <Button color="inherit" href="mailto:salaryapp2025@gmail.com" startIcon={<Email />}>Contact</Button>
              <IconButton color="success" href="https://wa.me/+94717539478" target="_blank"><WhatsApp /></IconButton>
            </Stack>
          </Box>

          {session?.user?.role === "admin" && (
            <Box textAlign="center" mt={4}>
              <Link href="/admin">
                <Button variant="outlined" size="small" startIcon={<AdminPanelSettings />}>Admin Dashboard</Button>
              </Link>
            </Box>
          )}
        </Container>
      </Box>

      {/* Demo Dialog */}
      <Dialog
        open={openDemoModal}
        onClose={handleCloseDemoModal}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "black",
            color: "white",
            overflow: "hidden",
            height: isSmallScreen ? "50vh" : "80vh",
          },
        }}
      >
        <Suspense
          fallback={
            <Box
              display="flex"
              justifyContent="center"
              alignItems="center"
              height="100%"
            >
              <CircularProgress color="inherit" />
            </Box>
          }
        >
          <LazyDemoContent />
        </Suspense>
      </Dialog>
    </Box>
  );
}
