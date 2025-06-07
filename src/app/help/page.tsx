"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  Alert,
} from "@mui/material";
import Image from "next/image";
import { LanguageProvider } from "../context/LanguageContext";
import LanguageSelector from "./LanguageSelector";
import SearchBar from "./SearchBar";
import HelpIndex from "./HelpIndex";
import HelpContent from "./HelpContent";
import { ThemeSwitch } from "../theme-provider";

const HelpPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
    null
  );
  const theme = useTheme();
  const gradientBackground =
    theme.palette.mode === "dark"
      ? "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)"
      : "linear-gradient(300deg, #F2FCFF 0%, #B3DBE6 100%)";

  // On mount, read query params and set selectedSectionId
  useEffect(() => {
    const sectionID = searchParams.get("sectionID");
    const section = searchParams.get("section");
    if (section) {
      setSelectedSectionId(section);
    } else if (sectionID) {
      setSelectedSectionId(sectionID);
    }
  }, [searchParams]);

  // Update URL query params when selectedSectionId changes
  useEffect(() => {
    if (!selectedSectionId) return;
    const section = searchParams.get("section");

    // Only update if different to avoid infinite loop
    if (selectedSectionId !== section) {
      const newParams = new URLSearchParams(searchParams.toString());
      // We can set section to selectedSectionId and clear sectionID for clarity
      newParams.set("section", selectedSectionId);
      newParams.delete("sectionID");

      const newUrl = `${window.location.pathname}?${newParams.toString()}`;
      router.replace(newUrl);
    }
  }, [selectedSectionId, router, searchParams]);

  // Scroll to element with selectedSectionId on change
  useEffect(() => {
    if (!selectedSectionId) return;
    const element = document.getElementById(selectedSectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedSectionId]);

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
                sx={{ mb: 2 }}
              >
                <Typography variant="h5" sx={{ fontWeight: "bold", mb: 2 }}>
                  Help & Support
                </Typography>
                <Box display={"flex"}>
                  <Alert severity="warning" sx={{ mr: 2 }}>
                    This section is still under development.
                  </Alert>
                  <ThemeSwitch />
                </Box>
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
                <Box sx={{ width: { xs: "100%", sm: "66%" } }}>
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
              <Divider sx={{ my: 2 }} />

              <Box mt={4} textAlign="center">
                <Typography variant="body2" color="textSecondary" mb={1}>
                  If you need further assistance, please contact our support
                  team:
                </Typography>
                <Link href="mailto:salaryapp2025@gmail.com">
                  <Typography variant="body1" color="textSecondary" mb={1}>
                    salaryapp2025@gmail.com
                  </Typography>
                </Link>
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
