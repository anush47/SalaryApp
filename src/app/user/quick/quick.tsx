import React from "react";
import {
  Card,
  CardHeader,
  Typography,
  CardContent,
  useMediaQuery,
  useTheme,
  Box,
  Breadcrumbs,
  Link,
  Alert,
} from "@mui/material";
import { NavigateNext } from "@mui/icons-material";

const Dashboard = ({
  user,
}: {
  user: { id: string; name: string; email: string };
}) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const breadcrumbs = [
    <Link underline="hover" key="1" color="inherit" href="/">
      MUI
    </Link>,
    <Link
      underline="hover"
      key="2"
      color="inherit"
      href="/material-ui/getting-started/installation/"
    >
      Core
    </Link>,
    <Typography key="3" color="text.primary">
      Breadcrumb
    </Typography>,
  ];

  return (
    <Box>
      <Card
        sx={{
          minHeight: { xs: "calc(100vh - 57px)", sm: "calc(100vh - 64px)" },
          overflowY: "auto",
        }}
      >
        <CardHeader
          title={
            <Typography variant={isSmallScreen ? "h5" : "h4"} gutterBottom>
              Quick Tools
            </Typography>
          }
        />
        <CardContent
          sx={{ maxWidth: { xs: "100vw", md: "calc(100vw - 240px)" } }}
        >
          <Typography variant="body1">
            Welcome, {user.name}! Here will be your quick tools.
          </Typography>
          <Alert severity="info" sx={{ mt: 2 }}>
            This section is still under development. Stay tuned for updates!
          </Alert>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Dashboard;
