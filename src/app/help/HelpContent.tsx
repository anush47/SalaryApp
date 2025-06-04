"use client";

import React from "react";
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useLanguage } from "../context/LanguageContext";
import { helpContentData } from "./helpData";

interface HelpContentProps {
  searchQuery: string;
}

const HelpContent = ({ searchQuery }: HelpContentProps) => {
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

  const filteredSections = helpContentData.filter((section) => {
    const title = section.title[currentLanguage] || "";
    const content = section.content[currentLanguage];

    const matchesTitle = title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesContent = Array.isArray(content)
      ? content.some(
          (p) =>
            typeof p === "string" &&
            p.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : typeof content === "string" &&
        content.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSubsections = section.subsections?.some((sub) => {
      const subTitle = sub.title[currentLanguage] || "";
      const subContent = sub.content[currentLanguage];
      return (
        subTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (Array.isArray(subContent)
          ? subContent.some(
              (p) =>
                typeof p === "string" &&
                p.toLowerCase().includes(searchQuery.toLowerCase())
            )
          : typeof subContent === "string" &&
            subContent.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    });

    return matchesTitle || matchesContent || matchesSubsections;
  });

  return (
    <Box>
      {filteredSections.map((section) => {
        const sectionTitle =
          section.title[currentLanguage as keyof typeof section.title] || "";
        const sectionContent =
          section.content[currentLanguage as keyof typeof section.content] ||
          "";
        const sectionVideoUrl =
          section.videoUrl?.[currentLanguage] || section.videoUrl?.en; // Fallback to English video

        const displayContent = searchQuery
          ? filterContent(sectionContent, searchQuery)
          : Array.isArray(sectionContent)
          ? sectionContent
          : typeof sectionContent === "string"
          ? [sectionContent]
          : [];

        if (
          displayContent.length === 0 &&
          !sectionVideoUrl &&
          !section.subsections?.length
        ) {
          return null; // Don't render section if no content matches search and no video/subsections
        }

        return (
          <Box key={section.id} id={section.id} sx={{ mb: 4 }}>
            <Accordion defaultExpanded={searchQuery !== ""}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h5" sx={{ fontWeight: "bold" }}>
                  {highlightText(sectionTitle, searchQuery)}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                {section.id === "overview-video" && sectionVideoUrl && (
                  <Box
                    sx={{ mb: 3, display: "flex", justifyContent: "center" }}
                  >
                    <iframe
                      width="800" // Increased width for better visibility
                      height="450" // Adjusted height for 16:9 aspect ratio
                      src={sectionVideoUrl}
                      title={sectionTitle}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      style={{ border: "none" }}
                    ></iframe>
                  </Box>
                )}
                {displayContent.map((paragraph, idx) => (
                  <Typography key={idx} variant="body1" paragraph>
                    {highlightText(paragraph, searchQuery)}
                  </Typography>
                ))}

                {section.subsections &&
                  section.subsections.map((sub) => {
                    const subTitle = sub.title[currentLanguage] || "";
                    const subContent = sub.content[currentLanguage];

                    const displaySubContent = searchQuery
                      ? filterContent(subContent, searchQuery)
                      : Array.isArray(subContent)
                      ? subContent
                      : typeof subContent === "string"
                      ? [subContent]
                      : [];

                    if (
                      displaySubContent.length === 0 &&
                      !subTitle
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase())
                    ) {
                      return null; // Don't render subsection if no content matches search
                    }

                    return (
                      <Box
                        key={sub.id}
                        id={sub.id}
                        sx={{ mt: 3, pl: 2, borderLeft: "2px solid #eee" }}
                      >
                        <Typography
                          variant="h6"
                          sx={{ fontWeight: "medium", mb: 1 }}
                        >
                          {highlightText(subTitle, searchQuery)}
                        </Typography>
                        {displaySubContent.map((paragraph, idx) => (
                          <Typography key={idx} variant="body2" paragraph>
                            {highlightText(paragraph, searchQuery)}
                          </Typography>
                        ))}
                      </Box>
                    );
                  })}
              </AccordionDetails>
            </Accordion>
          </Box>
        );
      })}
      {filteredSections.length === 0 && searchQuery && (
        <Typography
          variant="h6"
          color="textSecondary"
          sx={{ textAlign: "center", mt: 5 }}
        >
          No results found for &quot;{searchQuery}&quot; in{" "}
          {currentLanguage.toUpperCase()} content.
        </Typography>
      )}
    </Box>
  );
};

export default HelpContent;
