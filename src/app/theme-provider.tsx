"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { ThemeProvider, createTheme, Theme } from "@mui/material/styles";
import { IconButton, Tooltip, useTheme } from "@mui/material";
import { DarkMode, LightMode } from "@mui/icons-material";

// Define light and dark themes
const darkTheme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#303030",
    },
  },
});

const lightTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1976d2",
    },
    background: {
      default: "#f5f5f5",
      paper: "#ffffff",
    },
  },
});

// Create a context for theme
const ThemeContext = createContext({
  theme: darkTheme,
  toggleTheme: () => {},
});

// Custom hook to use theme context
export const useThemeContext = () => useContext(ThemeContext);

// Theme switcher component
export const ThemeSwitch = () => {
  const { toggleTheme } = useThemeContext();
  const theme = useTheme();

  return (
    <Tooltip title="Toggle Theme" arrow>
      <IconButton onClick={toggleTheme}>
        {theme.palette.mode === "dark" ? (
          <LightMode color="inherit" />
        ) : (
          <DarkMode color="inherit" />
        )}
      </IconButton>
    </Tooltip>
  );
};

// Global theme provider to manage the theme state
interface AppThemeProviderProps {
  children: React.ReactNode;
}

const AppThemeProvider: React.FC<AppThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(darkTheme);

  // Effect to load theme from localStorage (client-side only)
  useEffect(() => {
    const storedTheme = localStorage.getItem("theme");
    //choose default here
    if (storedTheme === "dark") {
      setTheme(darkTheme);
    } else {
      setTheme(lightTheme);
    }
  }, []); // Only runs once after mount

  const toggleTheme = () => {
    setTheme((prevTheme) =>
      prevTheme.palette.mode === "dark" ? lightTheme : darkTheme
    );
    // Save the new theme to localStorage
    const newTheme = theme.palette.mode === "dark" ? "light" : "dark";
    localStorage.setItem("theme", newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </ThemeContext.Provider>
  );
};

export default AppThemeProvider;
