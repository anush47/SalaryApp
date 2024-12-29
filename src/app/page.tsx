"use client";
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Typography,
  Container,
  Grid,
  useTheme,
  IconButton,
  Tooltip,
} from "@mui/material";
import EmailIcon from "@mui/icons-material/Email";
import ContactMailIcon from "@mui/icons-material/ContactMail";
import BusinessIcon from "@mui/icons-material/Business";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import GroupIcon from "@mui/icons-material/Group";
import { ThemeSwitch } from "./theme-provider";
import { ArrowForward, Logout } from "@mui/icons-material";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function LandingPage() {
  const theme = useTheme();
  const { data: session, status } = useSession();

  return (
    <main
      className="flex flex-col items-center justify-center min-h-screen"
      style={{
        background:
          theme.palette.mode === "dark"
            ? "linear-gradient(to right, #0f2c61, #1a237e, #283593, #303f9f)"
            : "linear-gradient(to right, #e3f2fd, #bbdefb, #90caf9)",
        color: theme.palette.text.primary,
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

        <Card
          sx={{
            p: { xs: 3, sm: 5 },
            borderRadius: 4,
            boxShadow: 6,
            textAlign: "center",
            gap: 3,
            mb: 6,
            backgroundColor: theme.palette.background.paper,
          }}
        >
          <CardContent>
            <Typography
              variant="h2"
              component="h1"
              sx={{
                fontWeight: "bold",
                mb: 2,
                fontSize: { xs: "2rem", md: "3rem" },
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  animation: `typing ${
                    theme.breakpoints.down("sm")
                      ? "3s steps(30, end)"
                      : "6s steps(60, end)"
                  }`,
                }}
              >
                <span style={{ color: theme.palette.primary.main }}>
                  Salary
                </span>
                App
                <span style={{ color: theme.palette.primary.main }}>.</span>
              </span>
              <style jsx>{`
                @keyframes typing {
                  from {
                    width: 0;
                  }
                  to {
                    width: 100%;
                  }
                }
              `}</style>
            </Typography>

            <Typography
              variant="body1"
              sx={{
                mb: 8,
                fontSize: { xs: "1rem", md: "1.2rem" },
              }}
            >
              <span style={{ color: theme.palette.text.secondary }}>
                Simplify Salary, EPF/ETF, AH Form Management, and Employee
                Operations for Your Business.
              </span>
            </Typography>
            {session ? (
              <>
                <Typography
                  variant="h5"
                  sx={{
                    mb: 2,
                    fontSize: { xs: "1.5rem", md: "1.8rem" },
                    color: theme.palette.text.secondary,
                  }}
                >
                  Welcome, {session.user.name}!
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  sx={{
                    fontSize: "1.2rem",
                    px: 4,
                    py: 2,
                    mt: 2,
                    borderRadius: 8,
                    boxShadow: "0px 4px 15px rgba(0, 123, 255, 0.5)",
                    transition: "transform 0.3s",
                    ":hover": {
                      transform: "scale(1.05)",
                      background: theme.palette.primary.dark,
                    },
                    width: { xs: "100%", sm: "auto" },
                  }}
                  href={"/user?userPageSelect=mycompanies"}
                  endIcon={<ArrowForward />}
                >
                  My Companies
                </Button>
              </>
            ) : (
              <Button
                variant="contained"
                size="large"
                sx={{
                  fontSize: "1.2rem",
                  px: 4,
                  py: 2,
                  mt: 2,
                  borderRadius: 8,
                  background: theme.palette.primary.main,
                  boxShadow: "0px 4px 15px rgba(0, 123, 255, 0.5)",
                  transition: "transform 0.3s",
                  ":hover": {
                    transform: "scale(1.05)",
                    background: theme.palette.primary.dark,
                  },
                  width: { xs: "100%", sm: "auto" },
                }}
                href={"/api/auth/signin"}
                endIcon={<ArrowForward />}
              >
                Get Started
              </Button>
            )}
          </CardContent>
        </Card>

        <Grid container spacing={4} justifyContent="center">
          <Grid item xs={12} sm={6} md={4}>
            <Box textAlign="center">
              <AttachMoneyIcon
                sx={{ fontSize: 60, color: theme.palette.primary.main }}
              />
              <Typography variant="h6" sx={{ mt: 2 }}>
                Effortless Salary Management
              </Typography>
              <Typography variant="body2">
                Automate salary calculations, handle adjustments, and generate
                payslips with ease.
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Box textAlign="center">
              <BusinessIcon
                sx={{ fontSize: 60, color: theme.palette.primary.main }}
              />
              <Typography variant="h6" sx={{ mt: 2 }}>
                EPF/ETF Contributions
              </Typography>
              <Typography variant="body2">
                Easily manage provident fund contributions with compliance-ready
                reports.
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Box textAlign="center">
              <GroupIcon
                sx={{ fontSize: 60, color: theme.palette.primary.main }}
              />
              <Typography variant="h6" sx={{ mt: 2 }}>
                Easy Employee Management
              </Typography>
              <Typography variant="body2">
                Add, edit, and manage employee records efficiently, all in one
                place.
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Box textAlign="center">
              <ContactMailIcon
                sx={{ fontSize: 60, color: theme.palette.primary.main }}
              />
              <Typography variant="h6" sx={{ mt: 2 }}>
                AH Form Management
              </Typography>
              <Typography variant="body2">
                Generate, manage, and download AH forms (successor to B-cards)
                effortlessly.
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 6 }} />

        <Box textAlign="center">
          <Typography variant="h4" sx={{ mb: 2 }}>
            Contact Us
          </Typography>

          <Typography variant="body1" sx={{ mb: 2 }}>
            For inquiries or support, reach out to us at:
          </Typography>

          <Box sx={{ display: "flex", justifyContent: "center", gap: 2 }}>
            <Button
              variant="text"
              startIcon={<EmailIcon />}
              href="mailto:support@salaryapp.com"
              color="info"
            >
              support@salaryapp.com
            </Button>
          </Box>
        </Box>
      </Container>
    </main>
  );
}
