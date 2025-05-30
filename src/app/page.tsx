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
} from "@mui/material";
import { motion } from "framer-motion";
import {
  Email,
  ContactMail,
  CheckCircleOutline,
  AccessTime,
  Payments,
  Description,
  People,
  PlayCircleOutline,
  ArrowForward,
  Logout,
} from "@mui/icons-material";
import { ThemeSwitch } from "./theme-provider";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";

export default function LandingPage() {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const { data: session, status } = useSession();
  const userName =
    session?.user?.name || session?.user?.email?.split("@")[0] || "User";

  const gradientBackground =
    theme.palette.mode === "dark"
      ? "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)"
      : "linear-gradient(135deg, #e0f2f7 0%, #c1e4ed 50%, #a2d7e3 100%)";

  const sectionVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: "easeOut" },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" },
    },
  };

  return (
    <main
      className="flex flex-col items-center justify-center min-h-screen"
      style={{
        background: gradientBackground,
        color: theme.palette.text.primary,
        overflow: "hidden",
      }}
    >
      <Container maxWidth="lg" sx={{ p: { xs: 2, sm: 6 } }}>
        <Box
          sx={{
            position: { sm: "absolute" },
            top: 16,
            right: 16,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <ThemeSwitch />
          {session && (
            <>
              <Typography
                variant="h6"
                sx={{
                  fontSize: { xs: "0.9rem", sm: "1.1rem" },
                  fontWeight: 600,
                  color: theme.palette.text.primary,
                  mr: 1,
                }}
              >
                Hello, {userName}!
              </Typography>
              <Tooltip title="Sign Out">
                <IconButton color="inherit" onClick={() => signOut()}>
                  <Logout />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>

        {/* Hero Section */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={sectionVariants}
        >
          <Box
            sx={{
              textAlign: "center",
              mb: 8,
              pt: { xs: 4, sm: 5 },
              px: 2,
            }}
          >
            <div className="flex justify-center mb-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              >
                <Image
                  className="m-0 sm:mr-10"
                  src="/Logo_Withtext.png"
                  alt="SalaryApp Logo"
                  width={isSmallScreen ? 300 : 400}
                  height={isSmallScreen ? 300 : 400}
                  style={{
                    padding: 0,
                  }}
                />
              </motion.div>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
            >
              <Typography
                variant="h2"
                sx={{
                  fontSize: { xs: "2rem", sm: "2.5rem", md: "3.5rem" },
                  fontWeight: 700,
                  color: theme.palette.text.primary,
                  mb: { xs: 1, sm: 2 },
                  lineHeight: 1.2,
                }}
              >
                Effortless Payroll, EPF/ETF, Payslips & Staff Management
              </Typography>
              <Typography
                variant="h5"
                sx={{
                  fontSize: { xs: "1rem", sm: "1.2rem", md: "1.6rem" },
                  color: theme.palette.text.secondary,
                  mb: { xs: 3, sm: 4 },
                  maxWidth: 800,
                  mx: "auto",
                  px: { xs: 2, sm: 0 }, // Add horizontal padding for mobile
                }}
              >
                Simplify salary calculations, generate accurate EPF/ETF reports,
                create instant payslips, and manage your team with ease.
              </Typography>
            </motion.div>
            {status === "loading" ? (
              <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                sx={{ mt: 4, mb: 2 }}
              >
                <CircularProgress color="primary" />
                <Typography
                  variant="h5"
                  sx={{
                    ml: 2,
                    fontSize: { xs: "1.5rem", md: "1.8rem" },
                    color: theme.palette.text.secondary,
                  }}
                >
                  Loading...
                </Typography>
              </Box>
            ) : session ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
              >
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    gap: 2,
                    justifyContent: "center",
                    alignItems: "center",
                    mx: 3,
                  }}
                >
                  <Button
                    variant="contained"
                    size="large"
                    sx={{
                      fontSize: "1.1rem",
                      px: 4,
                      py: 1.5,
                      borderRadius: 8,
                      background: theme.palette.primary.main,
                      boxShadow: "0px 6px 20px rgba(0, 123, 255, 0.4)",
                      transition: "transform 0.3s, box-shadow 0.3s",
                      ":hover": {
                        transform: "scale(1.05)",
                        background: theme.palette.primary.dark,
                        boxShadow: "0px 8px 25px rgba(0, 123, 255, 0.6)",
                      },
                      width: { xs: "100%", sm: "auto" },
                    }}
                    href={"/user?userPageSelect=mycompanies"}
                    endIcon={<ArrowForward />}
                  >
                    My Companies
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    sx={{
                      fontSize: "1.1rem",
                      px: 4,
                      py: 1.5,
                      borderRadius: 8,
                      borderColor: theme.palette.primary.main,
                      color: theme.palette.primary.main,
                      transition: "transform 0.3s, box-shadow 0.3s",
                      ":hover": {
                        transform: "scale(1.05)",
                        background: "rgba(0, 123, 255, 0.1)",
                        boxShadow: "0px 8px 25px rgba(0, 123, 255, 0.2)",
                      },
                      width: { xs: "100%", sm: "auto" },
                    }}
                    onClick={() => alert("Watch Demo clicked!")}
                    startIcon={<PlayCircleOutline />}
                  >
                    Watch a Demo
                  </Button>
                </Box>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
              >
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    gap: 2,
                    justifyContent: "center",
                    alignItems: "center",
                    mx: 3,
                  }}
                >
                  <Button
                    variant="contained"
                    size="large"
                    sx={{
                      fontSize: "1.1rem",
                      px: 4,
                      py: 1.5,
                      borderRadius: 8,
                      background: theme.palette.primary.main,
                      boxShadow: "0px 6px 20px rgba(0, 123, 255, 0.4)",
                      transition: "transform 0.3s, box-shadow 0.3s",
                      ":hover": {
                        transform: "scale(1.05)",
                        background: theme.palette.primary.dark,
                        boxShadow: "0px 8px 25px rgba(0, 123, 255, 0.6)",
                      },
                      width: { xs: "100%", sm: "auto" },
                    }}
                    href={"/api/auth/signin"}
                    endIcon={<ArrowForward />}
                  >
                    Get Started
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    sx={{
                      fontSize: "1.1rem",
                      px: 4,
                      py: 1.5,
                      borderRadius: 8,
                      borderColor: theme.palette.primary.main,
                      color: theme.palette.primary.main,
                      transition: "transform 0.3s, box-shadow 0.3s",
                      ":hover": {
                        transform: "scale(1.05)",
                        background: "rgba(0, 123, 255, 0.1)",
                        boxShadow: "0px 8px 25px rgba(0, 123, 255, 0.2)",
                      },
                      width: { xs: "100%", sm: "auto" },
                    }}
                    onClick={() => alert("Watch Demo clicked!")}
                    startIcon={<PlayCircleOutline />}
                  >
                    Watch a Demo
                  </Button>
                </Box>
              </motion.div>
            )}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8, ease: "easeOut" }}
            >
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  mt: 4,
                  gap: 1,
                }}
              >
                <Typography
                  variant="body1"
                  sx={{
                    fontSize: { xs: "1rem", md: "1.1rem" },
                    color: theme.palette.text.secondary,
                    fontWeight: 500,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <CheckCircleOutline sx={{ color: "success.main" }} />
                  No setup fees.
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    fontSize: { xs: "1rem", md: "1.1rem" },
                    color: theme.palette.text.secondary,
                    fontWeight: 500,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <CheckCircleOutline sx={{ color: "success.main" }} />
                  3-months free access!
                </Typography>
              </Box>
            </motion.div>
          </Box>
        </motion.div>

        {/* Features Section */}
        <Box sx={{ mt: 10, mb: 8 }}>
          <motion.div
            initial="hidden"
            animate="visible"
            variants={sectionVariants}
          >
            <Typography
              variant="h3"
              textAlign="center"
              sx={{
                mb: 6,
                fontSize: { xs: "2rem", md: "3rem" },
                fontWeight: 700,
                color: theme.palette.text.primary,
              }}
            >
              Discover Our Powerful Features
            </Typography>
          </motion.div>
          <Grid container spacing={4} justifyContent="center">
            {/* Feature 1: Smart Attendance & OT */}
            <Grid item xs={12} sm={6} md={4} lg={2.4}>
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.5 }}
                variants={itemVariants}
              >
                <Box
                  textAlign="center"
                  sx={{
                    p: 4,
                    borderRadius: 4,
                    backgroundColor: theme.palette.background.paper,
                    boxShadow: "0px 5px 15px rgba(0, 0, 0, 0.1)",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "transform 0.3s, box-shadow 0.3s",
                    "&:hover": {
                      transform: "translateY(-5px)",
                      boxShadow: "0px 10px 20px rgba(0, 0, 0, 0.2)",
                    },
                  }}
                >
                  <AccessTime
                    sx={{
                      fontSize: 60,
                      color: theme.palette.primary.main,
                      mb: 2,
                    }}
                  />
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    Smart Attendance & OT
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: theme.palette.text.secondary }}
                  >
                    Handles In/Out records, identifies working days, and
                    calculates overtime, holiday pay, and special allowances.
                  </Typography>
                </Box>
              </motion.div>
            </Grid>

            {/* Feature 2: Automated Payroll Generation */}
            <Grid item xs={12} sm={6} md={4} lg={2.4}>
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.5 }}
                variants={itemVariants}
                transition={{ delay: 0.1 }}
              >
                <Box
                  textAlign="center"
                  sx={{
                    p: 4,
                    borderRadius: 4,
                    backgroundColor: theme.palette.background.paper,
                    boxShadow: "0px 5px 15px rgba(0, 0, 0, 0.1)",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "transform 0.3s, box-shadow 0.3s",
                    "&:hover": {
                      transform: "translateY(-5px)",
                      boxShadow: "0px 10px 20px rgba(0, 0, 0, 0.2)",
                    },
                  }}
                >
                  <Payments
                    sx={{
                      fontSize: 60,
                      color: theme.palette.primary.main,
                      mb: 2,
                    }}
                  />
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    Automated Payroll
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: theme.palette.text.secondary }}
                  >
                    Generates monthly payslips, handles EPF/ETF calculations,
                    and accounts for basic salary, allowances, and deductions.
                  </Typography>
                </Box>
              </motion.div>
            </Grid>

            {/* Feature 3: EPF/ETF & Compliance Reporting */}
            <Grid item xs={12} sm={6} md={4} lg={2.4}>
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.5 }}
                variants={itemVariants}
                transition={{ delay: 0.2 }}
              >
                <Box
                  textAlign="center"
                  sx={{
                    p: 4,
                    borderRadius: 4,
                    backgroundColor: theme.palette.background.paper,
                    boxShadow: "0px 5px 15px rgba(0, 0, 0, 0.1)",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "transform 0.3s, box-shadow 0.3s",
                    "&:hover": {
                      transform: "translateY(-5px)",
                      boxShadow: "0px 10px 20px rgba(0, 0, 0, 0.2)",
                    },
                  }}
                >
                  <Description
                    sx={{
                      fontSize: 60,
                      color: theme.palette.primary.main,
                      mb: 2,
                    }}
                  />
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    EPF/ETF & Compliance
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: theme.palette.text.secondary }}
                  >
                    Find EPF reference numbers, attendance, and payroll reports
                    to ensure full regulatory compliance.
                  </Typography>
                </Box>
              </motion.div>
            </Grid>

            {/* Feature 4: Simplified AH Form Handling */}
            <Grid item xs={12} sm={6} md={4} lg={2.4}>
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.5 }}
                variants={itemVariants}
                transition={{ delay: 0.3 }}
              >
                <Box
                  textAlign="center"
                  sx={{
                    p: 4,
                    borderRadius: 4,
                    backgroundColor: theme.palette.background.paper,
                    boxShadow: "0px 5px 15px rgba(0, 0, 0, 0.1)",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "transform 0.3s, box-shadow 0.3s",
                    "&:hover": {
                      transform: "translateY(-5px)",
                      boxShadow: "0px 10px 20px rgba(0, 0, 0, 0.2)",
                    },
                  }}
                >
                  <ContactMail
                    sx={{
                      fontSize: 60,
                      color: theme.palette.primary.main,
                      mb: 2,
                    }}
                  />
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    Effortless AH Forms
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: theme.palette.text.secondary }}
                  >
                    Generate and manage AH forms (successor to B-cards)
                    effortlessly, ensuring compliance.
                  </Typography>
                </Box>
              </motion.div>
            </Grid>

            {/* Feature 5: Streamlined Employee Management */}
            <Grid item xs={12} sm={6} md={4} lg={2.4}>
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.5 }}
                variants={itemVariants}
                transition={{ delay: 0.4 }}
              >
                <Box
                  textAlign="center"
                  sx={{
                    p: 4,
                    borderRadius: 4,
                    backgroundColor: theme.palette.background.paper,
                    boxShadow: "0px 5px 15px rgba(0, 0, 0, 0.1)",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "transform 0.3s, box-shadow 0.3s",
                    "&:hover": {
                      transform: "translateY(-5px)",
                      boxShadow: "0px 10px 20px rgba(0, 0, 0, 0.2)",
                    },
                  }}
                >
                  <People
                    sx={{
                      fontSize: 60,
                      color: theme.palette.primary.main,
                      mb: 2,
                    }}
                  />
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    Streamlined Staff Records
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: theme.palette.text.secondary }}
                  >
                    Centralized management of all employee records, simplifying
                    organizational oversight.
                  </Typography>
                </Box>
              </motion.div>
            </Grid>
          </Grid>
        </Box>

        {/* Contact Section */}
        <Box textAlign="center" sx={{ mt: 10, mb: 8 }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
          >
            <Typography variant="h4" sx={{ mb: 2, fontWeight: 700 }}>
              Connect With Us
            </Typography>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
          >
            <Typography
              variant="h6"
              sx={{ mb: 4, color: theme.palette.text.secondary }}
            >
              Have questions or need support? Reach out to our team:
            </Typography>
          </motion.div>

          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  color: theme.palette.text.secondary,
                  fontSize: { xs: "1rem", sm: "1.1rem" },
                }}
              >
                <Email sx={{ color: theme.palette.primary.main }} />
                <Link href="mailto:salaryapp2025@gmail.com" passHref>
                  <Box
                    sx={{
                      color: theme.palette.text.secondary,
                      textDecoration: "none",
                      "&:hover": {
                        textDecoration: "underline",
                        color: theme.palette.primary.main,
                      },
                    }}
                  >
                    <Typography
                      variant="body1"
                      sx={{
                        fontSize: { xs: "1rem", sm: "1.1rem" },
                        transition: "color 0.3s",
                        "&:hover": {
                          color: theme.palette.primary.main,
                        },
                      }}
                    >
                      salaryapp2025@gmail.com
                    </Typography>
                  </Box>
                </Link>
              </Box>
            </motion.div>
          </Box>
        </Box>

        {/* Footer Section */}
        <Box textAlign="center" sx={{ mt: 8, pb: 4 }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7, ease: "easeOut" }}
          >
            <Typography
              variant="body2"
              sx={{ mb: 2, color: theme.palette.text.secondary }}
            >
              © {new Date().getFullYear()} SalaryApp. All rights reserved.
            </Typography>
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                flexWrap: "wrap",
                gap: 2,
              }}
            >
              <Link href="/policies/privacy" passHref>
                <Button color="primary" variant="text" sx={{ mx: 1 }}>
                  Privacy Policy
                </Button>
              </Link>
              <Link href="/policies/terms" passHref>
                <Button color="primary" variant="text" sx={{ mx: 1 }}>
                  Terms of Service
                </Button>
              </Link>
              <Link href="/policies/agreement" passHref>
                <Button color="primary" variant="text" sx={{ mx: 1 }}>
                  Agreement
                </Button>
              </Link>
            </Box>
          </motion.div>
        </Box>

        {session?.user.role === "admin" && (
          <Box textAlign="center" sx={{ mt: 4 }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8, ease: "easeOut" }}
            >
              <Link href="/admin">
                <Button variant="contained">Admin Dashboard</Button>
              </Link>
            </motion.div>
          </Box>
        )}
      </Container>
    </main>
  );
}
