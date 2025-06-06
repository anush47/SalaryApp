"use client";
import React, { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Container,
  Divider,
  Typography,
  Grid,
  useTheme,
  Link,
  Button,
} from "@mui/material";
import Image from "next/image";
import { LanguageProvider } from "../context/LanguageContext";
import LanguageSelector from "./LanguageSelector";
import SearchBar from "./SearchBar";
import HelpIndex from "./HelpIndex";
import HelpContent from "./HelpContent";
import { ThemeSwitch } from "../theme-provider";

const HelpPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
    null
  );
  const theme = useTheme();
  const gradientBackground =
    theme.palette.mode === "dark"
      ? "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)"
      : "linear-gradient(300deg, #F2FCFF 0%, #B3DBE6 100%)";

  return (
    <LanguageProvider>
      <main
        style={{
          background: gradientBackground,
          paddingBottom: "2rem",
        }}
      >
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Box display="flex" justifyContent="center" mb={4}>
            <Image
              src="/Logo_Withtext.png"
              width={300}
              height={300}
              alt="SalaryApp Logo"
            />
          </Box>
          <Card sx={{ p: { xs: 1, sm: 5 }, borderRadius: 4, boxShadow: 6 }}>
            <CardContent>
              <Box
                display={"flex"}
                justifyContent={"space-between"}
                alignItems="center"
              >
                <Typography variant="h5" sx={{ fontWeight: "bold", mb: 2 }}>
                  Help & Support
                </Typography>
                <ThemeSwitch />
              </Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 4,
                  flexDirection: { xs: "column", sm: "row" },
                }}
              >
                <Box
                  sx={{
                    width: { xs: "100%", sm: "auto" },
                    mb: { xs: 2, sm: 0 },
                  }}
                >
                  <LanguageSelector />
                </Box>
                <Box sx={{ width: { xs: "100%", sm: "60%" } }}>
                  <SearchBar
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    setSelectedSectionId={setSelectedSectionId}
                  />
                </Box>
              </Box>
              <Grid
                container
                spacing={4}
                alignItems="stretch"
                sx={{ position: "relative" }}
              >
                <Grid
                  item
                  xs={12}
                  md={4}
                  sx={{
                    borderRight: { xs: "none", md: "1px solid" },
                    borderColor: "divider",
                    paddingRight: { md: 2 },
                  }}
                >
                  <HelpIndex
                    selectedSectionId={selectedSectionId}
                    setSelectedSectionId={setSelectedSectionId}
                  />
                </Grid>
                <Grid
                  item
                  xs={12}
                  md={8}
                  sx={{
                    paddingTop: { xs: 2, md: 0 },
                  }}
                >
                  <HelpContent
                    searchQuery={searchQuery}
                    selectedSectionId={selectedSectionId}
                    setSelectedSectionId={setSelectedSectionId}
                  />
                </Grid>
              </Grid>

              <Box mt={4} textAlign="center">
                <Typography variant="body2" color="textSecondary" mb={1}>
                  If you need further assistance, please contact our support
                  team:
                </Typography>
                <Button
                  variant="text"
                  component="a"
                  href="mailto:salaryapp2025@gmail.com"
                >
                  salaryapp2025@gmail.com
                </Button>
              </Box>
              <Box mt={4} textAlign="center">
                <Link href="/">
                  <Button variant="contained" color="primary" sx={{ my: 1 }}>
                    Go Back to Home
                  </Button>
                </Link>
              </Box>
            </CardContent>
          </Card>
        </Container>
      </main>
    </LanguageProvider>
  );
};

export default HelpPage;
