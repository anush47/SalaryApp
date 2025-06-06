"use client";

import React from "react";
import { Box, Typography, Button } from "@mui/material";
import { useLanguage } from "../context/LanguageContext";
import { helpContentData } from "./helpData";

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

  const filterContent = (
    content: string | string[] | undefined,
    query: string
  ) => {
    if (!content) return [];
    if (Array.isArray(content)) {
      return content.filter(
        (paragraph) =>
          typeof paragraph === "string" &&
          paragraph.toLowerCase().includes(query.toLowerCase())
      );
    }
    return typeof content === "string" &&
      content.toLowerCase().includes(query.toLowerCase())
      ? [content]
      : [];
  };

  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, "gi"));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} style={{ backgroundColor: "yellow" }}>
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

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
  const displayContent = searchQuery
    ? filterContent(sectionContent, searchQuery)
    : Array.isArray(sectionContent)
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

  return (
    <Box>
      <Box id={currentSection.id} sx={{ mb: 4 }}>
        <Typography
          variant={isSubsection ? "h6" : "h5"}
          sx={{ fontWeight: "bold", mb: 2 }}
        >
          {highlightText(
            currentSection.title[currentLanguage] || "",
            searchQuery
          )}
        </Typography>
        {displayContent.map((paragraph, idx) => (
          <Typography
            key={idx}
            variant={isSubsection ? "body2" : "body1"}
            paragraph
          >
            {highlightText(paragraph, searchQuery)}
          </Typography>
        ))}
      </Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 4 }}>
        {prevSection ? (
          <Button
            variant="contained"
            onClick={() => setSelectedSectionId(prevSection.id)}
          >
            {"<"} Previous: {prevSection.title}
          </Button>
        ) : (
          <Box />
        )}
        {nextSection ? (
          <Button
            variant="contained"
            onClick={() => setSelectedSectionId(nextSection.id)}
          >
            Next: {nextSection.title} {">"}
          </Button>
        ) : (
          <Box />
        )}
      </Box>
    </Box>
  );
};

export default HelpContent;
