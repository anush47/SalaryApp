"use client";

import React, { useState } from "react";
import {
  Box,
  List,
  ListItem,
  ListItemText,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  useTheme,
  useMediaQuery,
  ListItemButton,
} from "@mui/material";
import { useLanguage } from "../context/LanguageContext";
import { helpContentData } from "./helpData";
import { ExpandMore } from "@mui/icons-material";

interface HelpIndexProps {
  selectedSectionId: string | null;
  setSelectedSectionId: React.Dispatch<React.SetStateAction<string | null>>;
}

const HelpIndex = ({
  selectedSectionId,
  setSelectedSectionId,
}: HelpIndexProps) => {
  const { currentLanguage } = useLanguage();
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("lg"));

  const handleSectionClick = (id: string) => {
    setSelectedSectionId(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <Accordion
      defaultExpanded={!isSmallScreen}
      sx={{
        backgroundColor: "background.paper",
        boxShadow: 3,
      }}
    >
      <AccordionSummary expandIcon={<ExpandMore />}>
        <Typography variant="h6" sx={{ fontWeight: "bold" }}>
          Table of Contents
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <List component="nav" aria-label="help guide table of contents">
          {helpContentData.map((section) => (
            <React.Fragment key={section.id}>
              <ListItem disablePadding>
                <ListItemButton
                  onClick={() => handleSectionClick(section.id)}
                  selected={selectedSectionId === section.id}
                >
                  <ListItemText
                    primary={section.title[currentLanguage]}
                    primaryTypographyProps={{ fontWeight: "medium" }}
                  />
                </ListItemButton>
              </ListItem>
              {section.subsections &&
                section.subsections.map((sub) => (
                  <ListItem key={sub.id} disablePadding sx={{ pl: 2 }}>
                    <ListItemButton
                      onClick={() => handleSectionClick(sub.id)}
                      selected={selectedSectionId === sub.id}
                    >
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
      </AccordionDetails>
    </Accordion>
  );
};

export default HelpIndex;
