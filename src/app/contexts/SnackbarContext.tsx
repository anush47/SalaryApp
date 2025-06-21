"use client";

import React, {
  createContext,
  useState,
  useCallback,
  useContext,
  ReactNode,
} from "react";
import Snackbar from "@mui/material/Snackbar";
import Alert, { AlertColor } from "@mui/material/Alert";

export type Severity = "success" | "error" | "info" | "warning";

export interface SnackbarConfig {
  message: string;
  severity?: Severity;
  duration?: number;
  position?: {
    vertical: "top" | "bottom";
    horizontal: "left" | "center" | "right";
  };
}

interface SnackbarContextType {
  showSnackbar: (config: SnackbarConfig) => void;
}

const SnackbarContext = createContext<SnackbarContextType | undefined>(
  undefined
);

export const useSnackbar = (): SnackbarContextType => {
  const context = useContext(SnackbarContext);
  if (!context) {
    throw new Error("useSnackbar must be used within a SnackbarProvider");
  }
  return context;
};

interface SnackbarProviderProps {
  children: ReactNode;
}

interface SnackbarState extends SnackbarConfig {
  open: boolean;
}

const initialState: SnackbarState = {
  open: false,
  message: "",
  severity: "info",
  duration: 6000,
  position: { vertical: "top", horizontal: "right" },
};

export const SnackbarProvider: React.FC<SnackbarProviderProps> = ({
  children,
}) => {
  const [snackbarState, setSnackbarState] =
    useState<SnackbarState>(initialState);

  const showSnackbar = useCallback((config: SnackbarConfig) => {
    setSnackbarState({
      ...initialState, // Reset to defaults first
      ...config,
      open: true,
    });
  }, []);

  const hideSnackbar = useCallback(() => {
    setSnackbarState((prevState) => ({ ...prevState, open: false }));
  }, []);

  const handleClose = (
    event?: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === "clickaway") {
      return;
    }
    hideSnackbar();
  };

  return (
    <SnackbarContext.Provider value={{ showSnackbar }}>
      {children}
      <Snackbar
        open={snackbarState.open}
        autoHideDuration={snackbarState.duration}
        onClose={handleClose}
        anchorOrigin={snackbarState.position}
      >
        <Alert
          onClose={handleClose}
          severity={snackbarState.severity as AlertColor}
          sx={{ width: "100%" }}
          variant="filled"
        >
          {snackbarState.message}
        </Alert>
      </Snackbar>
    </SnackbarContext.Provider>
  );
};
