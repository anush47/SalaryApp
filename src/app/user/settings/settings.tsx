import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  useMediaQuery,
  useTheme,
  Box,
} from "@mui/material";
import EditForm from "./clientComponents/editForm";

const Settings = ({
  user,
}: {
  user: { name: string; email: string; id: string };
}) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));

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
              Settings
            </Typography>
          }
        />
        <CardContent
          sx={{ maxWidth: { xs: "100vw", md: "calc(100vw - 240px)" } }}
        >
          <EditForm user={user} />
        </CardContent>
      </Card>
    </Box>
  );
};

export default Settings;
