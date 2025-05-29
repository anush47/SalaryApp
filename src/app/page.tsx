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
} from "@mui/material";
import { motion } from "framer-motion";
import EmailIcon from "@mui/icons-material/Email";
import ContactMailIcon from "@mui/icons-material/ContactMail";
import BusinessIcon from "@mui/icons-material/Business";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import GroupIcon from "@mui/icons-material/Group";
import { ThemeSwitch } from "./theme-provider";
import { ArrowForward, Logout } from "@mui/icons-material";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";

export default function LandingPage() {
  const theme = useTheme();
  const { data: session, status } = useSession();

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
            position: "absolute",
            top: 16,
            right: 16,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          <ThemeSwitch />
          {session && (
            <Tooltip title="Sign Out">
              <Link href="/api/auth/signout">
                <IconButton color="inherit">
                  <Logout />
                </IconButton>
              </Link>
            </Tooltip>
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
              pt: { xs: 8, sm: 5 }, // Add padding top for spacing
            }}
          >
            <div className="flex justify-center mb-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              >
                <Image
                  src="/Logo_Withtext.png"
                  alt="SalaryApp Logo"
                  width={400}
                  height={400}
                  style={{
                    padding: 0,
                    margin: 0,
                    objectFit: "cover",
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
                  fontSize: { xs: "2.5rem", md: "4rem" },
                  fontWeight: 800,
                  color: theme.palette.text.primary,
                  mb: 2,
                  lineHeight: 1.2,
                }}
              >
                Your Ultimate Solution for HR & Payroll
              </Typography>
              <Typography
                variant="h5"
                sx={{
                  fontSize: { xs: "1.2rem", md: "1.8rem" },
                  color: theme.palette.text.secondary,
                  mb: 4,
                  maxWidth: 800,
                  mx: "auto",
                }}
              >
                Streamline salary processing, EPF/ETF, AH form management,
                comprehensive employee operations with ease.
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
                <Button
                  variant="contained"
                  size="large"
                  sx={{
                    fontSize: "1.3rem",
                    px: 5,
                    py: 2,
                    borderRadius: 10,
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
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
              >
                <Button
                  variant="contained"
                  size="large"
                  sx={{
                    fontSize: "1.3rem",
                    px: 5,
                    py: 2,
                    borderRadius: 10,
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
              </motion.div>
            )}
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
            <Grid item xs={12} sm={6} md={6} lg={3}>
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
                  <AttachMoneyIcon
                    sx={{
                      fontSize: 60,
                      color: theme.palette.primary.main,
                      mb: 2,
                    }}
                  />
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    Seamless Salary Processing
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: theme.palette.text.secondary }}
                  >
                    Automate calculations, manage deductions, and generate
                    precise payslips with unparalleled ease.
                  </Typography>
                </Box>
              </motion.div>
            </Grid>
            <Grid item xs={12} sm={6} md={6} lg={3}>
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
                  <BusinessIcon
                    sx={{
                      fontSize: 60,
                      color: theme.palette.primary.main,
                      mb: 2,
                    }}
                  />
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    Effortless EPF/ETF Compliance
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: theme.palette.text.secondary }}
                  >
                    Simplify provident fund contributions and generate
                    compliance-ready reports with confidence.
                  </Typography>
                </Box>
              </motion.div>
            </Grid>
            <Grid item xs={12} sm={6} md={6} lg={3}>
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
                  <GroupIcon
                    sx={{
                      fontSize: 60,
                      color: theme.palette.primary.main,
                      mb: 2,
                    }}
                  />
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    Intuitive Employee Management
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: theme.palette.text.secondary }}
                  >
                    Add, edit, and organize employee records efficiently, all
                    within a centralized platform.
                  </Typography>
                </Box>
              </motion.div>
            </Grid>
            <Grid item xs={12} sm={6} md={6} lg={3}>
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
                  <ContactMailIcon
                    sx={{
                      fontSize: 60,
                      color: theme.palette.primary.main,
                      mb: 2,
                    }}
                  />
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    Simplified AH Form Handling
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: theme.palette.text.secondary }}
                  >
                    Generate, manage, and download AH forms (successor to
                    B-cards) effortlessly, ensuring compliance.
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
            <Typography variant="h3" sx={{ mb: 2, fontWeight: 700 }}>
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
              <Link href="mailto:salaryapp2025@gmail.com" passHref>
                <Button
                  color="primary"
                  variant="contained"
                  size="large"
                  sx={{
                    fontSize: "1.2rem",
                    px: 4,
                    py: 2,
                    borderRadius: 8,
                    boxShadow: "0px 4px 15px rgba(0, 123, 255, 0.3)",
                    transition: "transform 0.3s",
                    ":hover": {
                      transform: "scale(1.05)",
                      background: theme.palette.primary.dark,
                    },
                    width: { xs: "100%", sm: "auto" },
                  }}
                  startIcon={<EmailIcon />}
                >
                  salaryapp2025@gmail.com
                </Button>
              </Link>
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
