import { CheckCircle, LiveHelpOutlined, Upload } from "@mui/icons-material";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";

export const handleCsvUpload = async (file: File): Promise<string> => {
  try {
    const reader = new FileReader();

    const result = await new Promise<string>((resolve, reject) => {
      reader.onload = (event) => {
        if (event.target?.result) {
          resolve(event.target.result.toString());
        } else {
          reject(new Error("Failed to read the file content"));
        }
      };

      reader.onerror = () => {
        reject(new Error("An error occurred while reading the file"));
      };

      reader.readAsText(file);
    });

    return result;
  } catch (error) {
    console.error("Error during file upload or processing:", error);
    throw new Error(
      error instanceof Error
        ? error.message
        : "An unexpected error occurred during file upload or processing"
    );
  }
};

export const UploadInOutBtn = ({
  inOut,
  setInOut,
}: {
  inOut: string;
  setInOut: (value: string) => void;
}) => {
  return (
    <Stack
      direction="row"
      alignItems="flex-start"
      justifyContent="space-between"
      spacing={1}
      width="100%"
    >
      <Tooltip title="Choose in-out csv file to Upload">
        <Button
          variant="outlined"
          color="primary"
          component="label"
          fullWidth
          startIcon={inOut ? <CheckCircle /> : <Upload />}
        >
          {inOut ? "Re-Upload In-Out CSV" : "Upload In-Out CSV"}
          <input
            type="file"
            accept=".csv"
            hidden
            onChange={async (event) => {
              if (event.target.files && event.target.files[0]) {
                const _inOut = await handleCsvUpload(event.target.files[0]);
                setInOut(_inOut);
              }
            }}
          />
        </Button>
      </Tooltip>
      <Tooltip title="Help with in-out csv format">
        <IconButton
          color="primary"
          onClick={() => window.open("/help/inout-csv", "_blank")}
        >
          <LiveHelpOutlined />
        </IconButton>
      </Tooltip>
    </Stack>
  );
};

export const ViewUploadedInOutBtn = ({
  inOut,
  openDialog,
  setOpenDialog,
}: {
  inOut: string;
  openDialog: boolean;
  setOpenDialog: (value: boolean) => void;
}) => {
  return (
    <>
      <Button
        variant="outlined"
        color="primary"
        onClick={() => setOpenDialog(true)}
        disabled={!inOut || inOut === ""}
      >
        View Uploaded In-Out
      </Button>
      {inOut && inOut !== "" && (
        <ViewUploadedInOutDialog
          openDialog={openDialog}
          setOpenDialog={setOpenDialog}
          inOutFetched={inOut}
        />
      )}
    </>
  );
};

export const ViewUploadedInOutDialog = (props: {
  inOutFetched: string | React.ReactNode;
  openDialog: boolean;
  setOpenDialog: (value: boolean) => void;
}) => {
  const { inOutFetched, openDialog, setOpenDialog } = props;
  const theme = useTheme();
  //const fullScreen = useMediaQuery(theme.breakpoints.down("md"));

  return (
    <Dialog
      open={openDialog}
      onClose={() => setOpenDialog(false)}
      maxWidth={"xl"}
      fullWidth
    >
      <DialogTitle>Fetched In-Out</DialogTitle>
      <DialogContent>
        {typeof inOutFetched === "string"
          ? inOutFetched
              .split("\n")
              .map((line, index) => <Typography key={index}>{line}</Typography>)
          : inOutFetched}
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            setOpenDialog(false);
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};
