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
} from "@mui/material";
import { motion, useAnimation, useInView } from "framer-motion";
import { useEffect, useRef } from "react";
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
} from "@mui/icons-material";
import { ThemeSwitch } from "./theme-provider";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";

export default function LandingPage() {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const { data: session, status } = useSession();
  const heroControls = useAnimation();
  const statsControls = useAnimation();
  const featuresControls = useAnimation();
  const ctaControls = useAnimation();
  const footerControls = useAnimation();

  const heroRef = useRef(null);
  const statsRef = useRef(null);
  const featuresRef = useRef(null);
  const ctaRef = useRef(null);
  const footerRef = useRef(null);

  const isHeroInView = useInView(heroRef, { once: true, amount: 0.1 });
  const isStatsInView = useInView(statsRef, { once: true, amount: 0.1 });
  const isFeaturesInView = useInView(featuresRef, { once: true, amount: 0.1 });
  const isCtaInView = useInView(ctaRef, { once: true, amount: 0.1 });
  const isFooterInView = useInView(footerRef, { once: true, amount: 0.1 });

  useEffect(() => {
    if (isHeroInView) heroControls.start("visible");
  }, [isHeroInView, heroControls]);

  useEffect(() => {
    if (isStatsInView) statsControls.start("visible");
  }, [isStatsInView, statsControls]);

  useEffect(() => {
    if (isFeaturesInView) featuresControls.start("visible");
  }, [isFeaturesInView, featuresControls]);

  useEffect(() => {
    if (isCtaInView) ctaControls.start("visible");
  }, [isCtaInView, ctaControls]);

  useEffect(() => {
    if (isFooterInView) footerControls.start("visible");
  }, [isFooterInView, footerControls]);

  const userName = (() => {
    if (session?.user?.name) {
      return session.user.name.split(" ")[0];
    }
    if (session?.user?.email) {
      return session.user.email.split("@")[0].split(" ")[0];
    }
    return "User";
  })();

  const gradientBackground =
    theme.palette.mode === "dark"
      ? "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)"
      : "linear-gradient(300deg, #F2FCFF 0%, #B3DBE6 100%)";

  const stats = [
    { value: "25+", label: "Trusted Companies", icon: <Business /> },
    { value: "150+", label: "Employees Managed", icon: <Groups /> },
    { value: "500+", label: "Salaries Processed", icon: <RequestPage /> },
  ];

  const features = [
    {
      icon: <AccessTime sx={{ fontSize: 32 }} />,
      title: "Smart Attendance",
      description: "Automated tracking with OT calculations",
    },
    {
      icon: <Payments sx={{ fontSize: 32 }} />,
      title: "Instant Payroll",
      description: "Generate accurate salaries in minutes",
    },
    {
      icon: <Description sx={{ fontSize: 32 }} />,
      title: "EPF/ETF Reports",
      description: "Compliant with government regulations",
    },
    {
      icon: <People sx={{ fontSize: 32 }} />,
      title: "Employee Management",
      description: "Centralized staff records",
    },
    {
      icon: <Description sx={{ fontSize: 32 }} />,
      title: "AH Forms Generation",
      description: "Generate and manage AH forms effortlessly",
    },
  ];

  const fadeInUp = {
    hidden: { opacity: 0, y: 40 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
    },
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: gradientBackground,
        color: theme.palette.text.primary,
        overflowX: "hidden",
      }}
    >
      {/* Header */}
      <Container maxWidth="lg">
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
                filter:
                  theme.palette.mode === "dark"
                    ? "brightness(0) invert(1)"
                    : "none",
              }}
            />
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            {session && (
              <Chip
                avatar={
                  <Avatar
                    alt={session?.user?.name ?? undefined}
                    src={session?.user?.image ?? undefined}
                  />
                }
                label={
                  <Box
                    sx={{
                      maxWidth: { xs: 50, sm: 170 },
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      display: "block",
                    }}
                  >
                    {userName}
                  </Box>
                }
                variant="outlined"
                sx={{
                  borderColor: alpha(theme.palette.primary.main, 0.2),
                  fontWeight: 500,
                  maxWidth: { xs: 120, sm: "none" },
                }}
              />
            )}
            <ThemeSwitch />
            {session && (
              <Tooltip title="Sign Out">
                <IconButton
                  onClick={() => (window.location.href = "/api/auth/signout")}
                  sx={{
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    "&:hover": {
                      bgcolor: alpha(theme.palette.primary.main, 0.2),
                    },
                  }}
                >
                  <Logout fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
      </Container>

      {/* Hero Section */}
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 8 } }}>
        <Grid container spacing={6} alignItems="center">
          <Grid item xs={12} md={6}>
            <motion.div
              ref={heroRef}
              initial="hidden"
              animate={heroControls}
              variants={fadeInUp}
            >
              <Typography
                variant="h1"
                sx={{
                  fontSize: { xs: "2.5rem", md: "3.5rem" },
                  fontWeight: 800,
                  lineHeight: 1.2,
                  mb: 3,
                }}
              >
                Payroll, EPF/ETF Management Made Simple
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  fontSize: "1.2rem",
                  color: theme.palette.text.secondary,
                  mb: 4,
                  maxWidth: 600,
                }}
              >
                Effortlessly handle salaries, attendance, and
                government-mandated EPF/ETF contributions—all in one platform.
              </Typography>

              {status === "loading" ? (
                <Box display="flex" alignItems="center" gap={2}>
                  <CircularProgress size={24} />
                  <Typography>Loading...</Typography>
                </Box>
              ) : (
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <Link
                    href={
                      session
                        ? "/user?userPageSelect=mycompanies"
                        : "/api/auth/signin"
                    }
                  >
                    <Button
                      variant="contained"
                      size="large"
                      fullWidth
                      endIcon={<ArrowForward />}
                      sx={{
                        px: 4,
                        py: 1.5,
                        borderRadius: 2,
                        fontSize: "1rem",
                      }}
                      component={motion.div}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {session ? "Goto My Companies" : "Get Started Free"}
                    </Button>
                  </Link>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => alert("Demo coming soon!")}
                    startIcon={<PlayCircleOutline />}
                    sx={{
                      px: 4,
                      py: 1.5,
                      borderRadius: 2,
                      fontSize: "1rem",
                    }}
                    component={motion.div}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Watch Demo
                  </Button>
                </Stack>
              )}

              <Stack
                direction="row"
                spacing={3}
                sx={{ mt: 4, flexWrap: "wrap" }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    fontWeight: 500,
                  }}
                >
                  <CheckCircleOutline color="success" fontSize="small" />
                  No setup fees
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    fontWeight: 500,
                  }}
                >
                  <CheckCircleOutline color="success" fontSize="small" />
                  3-months free
                </Typography>
              </Stack>
            </motion.div>
          </Grid>

          <Grid item xs={12} md={6}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
            >
              <Box
                sx={{
                  position: "relative",
                  width: "100%",
                  height: { xs: 300, md: 400 },
                }}
              >
                <Image
                  src="/payroll.png"
                  alt="Payroll illustration"
                  fill
                  style={{ objectFit: "contain" }}
                  priority
                />
              </Box>
            </motion.div>
          </Grid>
        </Grid>
      </Container>

      {/* Stats Section */}
      <Box sx={{ py: 6, bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
        <Container maxWidth="lg">
          <motion.div
            ref={statsRef}
            initial="hidden"
            animate={statsControls}
            variants={staggerContainer}
          >
            <Grid container spacing={4}>
              {stats.map((stat, index) => (
                <Grid item xs={12} sm={4} key={index}>
                  <motion.div variants={fadeInUp}>
                    <Box
                      sx={{
                        textAlign: "center",
                        p: 3,
                      }}
                    >
                      <Typography
                        variant="h3"
                        sx={{
                          fontWeight: 700,
                          mb: 1,
                          color: theme.palette.primary.main,
                        }}
                      >
                        {stat.value}
                      </Typography>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 500,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 1,
                        }}
                      >
                        {stat.icon} {stat.label}
                      </Typography>
                    </Box>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          </motion.div>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box textAlign="center" sx={{ mb: 6 }}>
          <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
            <Typography
              variant="overline"
              sx={{
                color: "primary.main",
                fontWeight: 600,
                letterSpacing: 1,
                fontSize: "1rem",
                mb: 2,
                display: "inline-block",
              }}
            >
              Features
            </Typography>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 700,
                mb: 2,
              }}
            >
              Everything You Need
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: theme.palette.text.secondary,
                maxWidth: 600,
                mx: "auto",
                fontSize: "1.1rem",
              }}
            >
              Comprehensive tools to simplify your payroll process
            </Typography>
          </motion.div>
        </Box>

        <motion.div
          ref={featuresRef}
          initial="hidden"
          animate={featuresControls}
          variants={staggerContainer}
        >
          <Grid container spacing={4}>
            {features.map((feature, index) => (
              <Grid item xs={12} sm={6} md={2.4} key={index}>
                <motion.div variants={fadeInUp}>
                  <Box
                    sx={{
                      p: 3,
                      height: "100%",
                      borderRadius: 2,
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                      transition: "all 0.3s ease",
                    }}
                  >
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        mb: 3,
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        color: theme.palette.primary.main,
                      }}
                    >
                      {feature.icon}
                    </Box>
                    <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                      {feature.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: theme.palette.text.secondary }}
                    >
                      {feature.description}
                    </Typography>
                  </Box>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </motion.div>
      </Container>

      {/* CTA Section */}
      <Box sx={{ py: 8, bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
        <Container maxWidth="md" sx={{ textAlign: "center" }}>
          <motion.div
            ref={ctaRef}
            initial="hidden"
            animate={ctaControls}
            variants={fadeInUp}
          >
            <Typography
              variant="h3"
              sx={{
                fontWeight: 700,
                mb: 3,
              }}
            >
              Ready to Simplify Your Payroll?
            </Typography>
            <Typography
              variant="body1"
              sx={{
                mb: 4,
                color: theme.palette.text.secondary,
                fontSize: "1.1rem",
                maxWidth: 600,
                mx: "auto",
              }}
            >
              Join businesses that trust SalaryApp for their payroll needs.
            </Typography>
            <Link
              href={
                session
                  ? "/user?userPageSelect=mycompanies"
                  : "/api/auth/signin"
              }
            >
              <Button
                variant="contained"
                size="large"
                endIcon={<ArrowForward />}
                sx={{
                  px: 5,
                  py: 1.5,
                  borderRadius: 2,
                }}
                component={motion.div}
                whileHover={{ y: -2, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {session ? "Goto My Companies" : "Start Free Trial"}
              </Button>
            </Link>
          </motion.div>
        </Container>
      </Box>

      {/* Footer */}
      <Container maxWidth="lg" sx={{ py: 6 }} ref={footerRef}>
        <Divider sx={{ mb: 4 }} />
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            justifyContent: "space-between",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Image
              src="/Logo_Withtext.png"
              alt="SalaryApp Logo"
              width={120}
              height={40}
              style={{
                filter:
                  theme.palette.mode === "dark"
                    ? "brightness(0) invert(1)"
                    : "none",
              }}
            />
          </Box>
          <Typography
            variant="body2"
            sx={{ color: theme.palette.text.secondary }}
          >
            © SalaryApp 2025. All rights reserved.
          </Typography>
          <Stack direction="row" spacing={2}>
            <Link href="/policies/privacy" passHref>
              <Button variant="text" size="small">
                Privacy
              </Button>
            </Link>
            <Link href="/policies/terms" passHref>
              <Button variant="text" size="small">
                Terms
              </Button>
            </Link>
            <Link href="/policies/agreement" passHref>
              <Button variant="text" size="small">
                Agreement
              </Button>
            </Link>
          </Stack>
        </Box>

        {session?.user?.role === "admin" && (
          <motion.div
            initial="hidden"
            animate={footerControls}
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: {
                opacity: 1,
                y: 0,
                transition: {
                  duration: 0.6,
                  ease: [0.16, 1, 0.3, 1],
                  delay: 0.3,
                },
              },
            }}
            style={{ textAlign: "center", marginTop: "2rem" }}
          >
            <Link href="/admin" passHref>
              <Button
                variant="contained"
                size="small"
                startIcon={<AdminPanelSettings />}
                component={motion.div}
                whileHover={{
                  y: -2,
                  scale: 1.02,
                  boxShadow: theme.shadows[4],
                }}
                whileTap={{ scale: 0.98 }}
              >
                Admin Page
              </Button>
            </Link>
          </motion.div>
        )}
      </Container>
    </Box>
  );
}
