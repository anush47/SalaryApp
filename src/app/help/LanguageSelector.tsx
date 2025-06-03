"use client";

import React from "react";
import { FormControl, InputLabel, Select, MenuItem, Box } from "@mui/material";
import { useLanguage } from "../context/LanguageContext";

const LanguageSelector = () => {
  const { currentLanguage, setLanguage, languages } = useLanguage();

  const handleChange = (event: any) => {
    setLanguage(event.target.value as string);
  };

  return (
    <Box sx={{ minWidth: 120, mb: 3 }}>
      <FormControl fullWidth>
        <InputLabel id="language-select-label">Language</InputLabel>
        <Select
          labelId="language-select-label"
          id="language-select"
          value={currentLanguage}
          label="Language"
          onChange={handleChange}
        >
          {languages.map((lang) => (
            <MenuItem key={lang.code} value={lang.code}>
              {lang.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};

export default LanguageSelector;
