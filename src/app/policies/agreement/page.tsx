"use client";
import { Box, Container, Button, useTheme } from "@mui/material";
import Agreement from "./agreement";
import Link from "next/link";

export default function UserAgreement() {
  const theme = useTheme();
  const gradientBackground =
    theme.palette.mode === "dark"
      ? "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)"
      : "linear-gradient(300deg, #F2FCFF 0%, #B3DBE6 100%)";
  return (
    <main
      style={{
        background: gradientBackground,
        paddingBottom: "2rem",
      }}
    >
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Agreement />
      </Container>
      <Box display="flex" justifyContent="center" mt={4}>
        <Link href="/">
          <Button variant="contained" color="primary" sx={{ my: 1 }}>
            Go Back to Home
          </Button>
        </Link>
      </Box>
    </main>
  );
}
