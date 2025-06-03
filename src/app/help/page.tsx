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
} from "@mui/material";
import Image from "next/image";
import { LanguageProvider } from "../context/LanguageContext";
import LanguageSelector from "./LanguageSelector";
import SearchBar from "./SearchBar";
import HelpIndex from "./HelpIndex";
import HelpContent from "./HelpContent";

const HelpPage = () => {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <LanguageProvider>
      <main
        style={{
          background: "linear-gradient(300deg, #F2FCFF 0%, #B3DBE6 100%)",
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
              <Typography variant="h4" sx={{ fontWeight: "bold", mb: 2 }}>
                Help & Support
              </Typography>
              <Divider sx={{ mb: 3 }} />
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
                  />
                </Box>
              </Box>
              <Grid container spacing={4}>
                <Grid item xs={12} md={4}>
                  <HelpIndex />
                </Grid>
                <Grid item xs={12} md={8}>
                  <HelpContent searchQuery={searchQuery} />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Container>
      </main>
    </LanguageProvider>
  );
};

export default HelpPage;
