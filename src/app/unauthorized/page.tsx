"use client";
import Link from "next/link";
import { Box, Button, Container, Typography } from "@mui/material";
import BlockIcon from "@mui/icons-material/Block";

export default function UnauthorizedPage() {
  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          textAlign: "center",
          gap: 3,
        }}
      >
        <BlockIcon
          sx={{
            fontSize: 120,
            color: "error.main",
          }}
        />

        <Typography variant="h3" component="h1" gutterBottom>
          Access Denied
        </Typography>

        <Typography variant="h6" color="text.secondary" paragraph>
          You don&apos;t have permission to access this page.
        </Typography>

        <Typography variant="body1" color="text.secondary" paragraph>
          This area is restricted. If you believe you should have access, please
          contact your administrator.
        </Typography>

        <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
          <Button
            variant="contained"
            component={Link}
            href="/user"
            size="large"
          >
            Go to Dashboard
          </Button>

          <Button
            variant="outlined"
            component={Link}
            href="/auth/signIn"
            size="large"
          >
            Sign In
          </Button>
        </Box>
      </Box>
    </Container>
  );
}
