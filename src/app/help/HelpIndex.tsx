"use client";

import React from "react";
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  Divider,
} from "@mui/material";
import { useLanguage } from "../context/LanguageContext";
import { helpContentData } from "./helpData";

const HelpIndex = () => {
  const { currentLanguage } = useLanguage();

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 360,
        bgcolor: "background.paper",
        p: 2,
        borderRadius: 2,
        boxShadow: 3,
      }}
    >
      <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
        Table of Contents
      </Typography>
      <Divider sx={{ mb: 2 }} />
      <List component="nav" aria-label="help guide table of contents">
        {helpContentData.map((section) => (
          <React.Fragment key={section.id}>
            <ListItem disablePadding>
              <ListItemButton onClick={() => scrollToSection(section.id)}>
                <ListItemText
                  primary={section.title[currentLanguage]}
                  primaryTypographyProps={{ fontWeight: "medium" }}
                />
              </ListItemButton>
            </ListItem>
            {section.subsections &&
              section.subsections.map((sub) => (
                <ListItem key={sub.id} disablePadding sx={{ pl: 2 }}>
                  <ListItemButton onClick={() => scrollToSection(sub.id)}>
                    <ListItemText
                      primary={sub.title[currentLanguage]}
                      primaryTypographyProps={{ variant: "body2" }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
          </React.Fragment>
        ))}
      </List>
    </Box>
  );
};

export default HelpIndex;
