"use client";

import React, { useRef, useEffect } from "react";
import { Box, Typography, Button, Tooltip } from "@mui/material";
import { useLanguage } from "../context/LanguageContext";
import { helpContentData } from "./helpData";
import { ArrowBack, ArrowForward } from "@mui/icons-material";

interface HelpContentProps {
  searchQuery: string;
  selectedSectionId: string | null;
  setSelectedSectionId: React.Dispatch<React.SetStateAction<string | null>>;
}

const HelpContent = ({
  searchQuery,
  selectedSectionId,
  setSelectedSectionId,
}: HelpContentProps) => {
  const { currentLanguage } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);

  // Flatten sections and subsections into a linear array for navigation
  const flattenedSections: { id: string; title: string }[] = [];
  helpContentData.forEach((section) => {
    flattenedSections.push({
      id: section.id,
      title: section.title[currentLanguage] || "",
    });
    if (section.subsections) {
      section.subsections.forEach((sub) => {
        flattenedSections.push({
          id: sub.id,
          title: sub.title[currentLanguage] || "",
        });
      });
    }
  });

  // Find index of selectedSectionId or default to 0
  const currentIndex = selectedSectionId
    ? flattenedSections.findIndex((s) => s.id === selectedSectionId)
    : 0;

  // Get current section or subsection data
  let currentSection = null;
  let isSubsection = false;
  for (const section of helpContentData) {
    if (section.id === selectedSectionId) {
      currentSection = section;
      isSubsection = false;
      break;
    }
    if (section.subsections) {
      const sub = section.subsections.find(
        (sub) => sub.id === selectedSectionId
      );
      if (sub) {
        currentSection = sub;
        isSubsection = true;
        break;
      }
    }
  }
  // If no selectedSectionId or not found, default to first section
  if (!currentSection) {
    currentSection = helpContentData[0];
    isSubsection = false;
  }

  // Prepare content to display
  const sectionContent = currentSection.content[currentLanguage] || "";
  const displayContent = Array.isArray(sectionContent)
    ? sectionContent
    : typeof sectionContent === "string"
    ? [sectionContent]
    : [];

  // Get previous and next section ids and titles
  const prevSection =
    currentIndex > 0 ? flattenedSections[currentIndex - 1] : null;
  const nextSection =
    currentIndex < flattenedSections.length - 1
      ? flattenedSections[currentIndex + 1]
      : null;

  const NavigateButton = ({
    section,
    isForward = true,
  }: {
    section: { title: string; id: string };
    isForward?: boolean;
  }) => (
    <Tooltip title={"Goto : " + section.title}>
      <Button
        variant="text"
        onClick={() => setSelectedSectionId(section.id)}
        startIcon={!isForward ? <ArrowBack /> : undefined}
        endIcon={isForward ? <ArrowForward /> : undefined}
      >
        <Typography
          variant="inherit"
          fontSize="12px"
          sx={{
            maxWidth: "150px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {section.title}
        </Typography>
      </Button>
    </Tooltip>
  );

  // Scroll to selected section inside the container
  useEffect(() => {
    if (!selectedSectionId) return;
    if (!containerRef.current) return;

    const element = containerRef.current.querySelector(
      `#${selectedSectionId}`
    ) as HTMLElement | null;
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedSectionId]);

  return (
    <Box
      ref={containerRef}
      sx={{ maxHeight: "70vh", overflowY: "auto", pr: 2 }}
    >
      <Box id={currentSection.id} sx={{ mb: 4 }}>
        <Typography
          variant={isSubsection ? "h6" : "h5"}
          sx={{ fontWeight: "bold", mb: 2 }}
          dangerouslySetInnerHTML={{
            __html: currentSection.title[currentLanguage] || "",
          }}
        />
        {displayContent.map((paragraph, idx) => (
          <Typography
            key={idx}
            variant={isSubsection ? "body2" : "body1"}
            paragraph
            dangerouslySetInnerHTML={{ __html: paragraph }}
          />
        ))}
      </Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 4 }}>
        {prevSection ? (
          <NavigateButton section={prevSection} isForward={false} />
        ) : (
          <Box />
        )}
        {nextSection && <NavigateButton section={nextSection} />}
      </Box>
    </Box>
  );
};

export default HelpContent;
