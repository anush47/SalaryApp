"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  TextField,
  InputAdornment,
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  ClickAwayListener,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { helpContentData } from "./helpData";
import { useLanguage } from "../context/LanguageContext";

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  setSelectedSectionId: React.Dispatch<React.SetStateAction<string | null>>;
}

interface FilteredItem {
  id: string;
  title: string;
  snippet?: string;
}

const SearchBar = ({
  searchQuery,
  setSearchQuery,
  setSelectedSectionId,
}: SearchBarProps) => {
  const { currentLanguage } = useLanguage();
  const [filteredItems, setFilteredItems] = useState<FilteredItem[]>([]);
  const [openDropdown, setOpenDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const getSnippet = (content: string, query: string, snippetLength = 50) => {
    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerContent.indexOf(lowerQuery);
    if (index === -1) return "";
    const start = Math.max(0, index - snippetLength);
    const end = Math.min(
      content.length,
      index + lowerQuery.length + snippetLength
    );
    let snippet = content.substring(start, end);
    if (start > 0) snippet = "..." + snippet;
    if (end < content.length) snippet = snippet + "...";
    return snippet;
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

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredItems([]);
      setOpenDropdown(false);
      return;
    }

    const results: FilteredItem[] = [];

    const queryLower = searchQuery.toLowerCase();

    helpContentData.forEach((section) => {
      const sectionTitleCurrent = section.title[currentLanguage] || "";
      const sectionTitleEn = section.title.en || "";
      const sectionTitleSi = section.title.si || "";
      const sectionContentCurrent = Array.isArray(
        section.content[currentLanguage]
      )
        ? section.content[currentLanguage].join(" ")
        : section.content[currentLanguage] || "";
      const sectionContentEn = Array.isArray(section.content.en)
        ? section.content.en.join(" ")
        : section.content.en || "";
      const sectionContentSi = Array.isArray(section.content.si)
        ? section.content.si.join(" ")
        : section.content.si || "";

      // Check if searchQuery matches in any language title or content
      const matchesTitle =
        sectionTitleEn.toLowerCase().includes(queryLower) ||
        sectionTitleSi.toLowerCase().includes(queryLower);
      const matchesContent =
        sectionContentEn.toLowerCase().includes(queryLower) ||
        sectionContentSi.toLowerCase().includes(queryLower);

      if (matchesTitle || matchesContent) {
        let snippet = "";
        if (!matchesTitle && matchesContent) {
          snippet = getSnippet(sectionContentCurrent, searchQuery);
        }
        results.push({ id: section.id, title: sectionTitleCurrent, snippet });
      }

      if (section.subsections) {
        section.subsections.forEach((sub) => {
          const subTitleCurrent = sub.title[currentLanguage] || "";
          const subTitleEn = sub.title.en || "";
          const subTitleSi = sub.title.si || "";
          const subContentCurrent = Array.isArray(sub.content[currentLanguage])
            ? sub.content[currentLanguage].join(" ")
            : sub.content[currentLanguage] || "";
          const subContentEn = Array.isArray(sub.content.en)
            ? sub.content.en.join(" ")
            : sub.content.en || "";
          const subContentSi = Array.isArray(sub.content.si)
            ? sub.content.si.join(" ")
            : sub.content.si || "";

          const matchesSubTitle =
            subTitleEn.toLowerCase().includes(queryLower) ||
            subTitleSi.toLowerCase().includes(queryLower);
          const matchesSubContent =
            subContentEn.toLowerCase().includes(queryLower) ||
            subContentSi.toLowerCase().includes(queryLower);

          if (matchesSubTitle || matchesSubContent) {
            let snippet = "";
            if (!matchesSubTitle && matchesSubContent) {
              snippet = getSnippet(subContentCurrent, searchQuery);
            }
            results.push({
              id: sub.id,
              title: `${subTitleCurrent} (in ${sectionTitleCurrent})`,
              snippet,
            });
          }
        });
      }
    });

    setFilteredItems(results);
    setOpenDropdown(results.length > 0);
  }, [searchQuery, currentLanguage]);

  const handleSelect = (id: string) => {
    setSelectedSectionId(id);
    setSearchQuery("");
    setOpenDropdown(false);
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  const handleClickAway = () => {
    setOpenDropdown(false);
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  return (
    <ClickAwayListener onClickAway={handleClickAway}>
      <Box sx={{ mb: 4, position: "relative" }}>
        <TextField
          fullWidth
          variant="filled"
          placeholder="Search help topics..."
          value={searchQuery}
          onChange={handleChange}
          inputRef={inputRef}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          autoComplete="off"
        />
        {openDropdown && (
          <Paper
            sx={{
              position: "absolute",
              width: "100%",
              maxHeight: 300,
              overflowY: "auto",
              zIndex: 10,
              mt: 1,
            }}
          >
            <List dense>
              {filteredItems.map((item) => (
                <ListItem key={item.id} disablePadding>
                  <ListItemButton onClick={() => handleSelect(item.id)}>
                    <ListItemText
                      primary={item.title}
                      secondary={
                        item.snippet
                          ? highlightText(item.snippet, searchQuery)
                          : null
                      }
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Paper>
        )}
      </Box>
    </ClickAwayListener>
  );
};

export default SearchBar;
