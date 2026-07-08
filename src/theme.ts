import { createTheme } from "@mui/material/styles";

/**
 * Zevents theme — clean "sports" look:
 *  - pitch-green primary, energetic amber accent
 *  - light, airy surfaces with generous spacing
 *  - rounded corners, flat buttons (minimal graphics)
 */
const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1B7A3D", dark: "#115C2C", contrastText: "#ffffff" },
    secondary: { main: "#F2A900", contrastText: "#1B1B1B" },
    background: { default: "#F4F7F4", paper: "#ffffff" },
    success: { main: "#1B7A3D" },
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily:
      'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    h5: { fontWeight: 800, letterSpacing: "-0.01em" },
    h6: { fontWeight: 800, letterSpacing: "-0.01em" },
    subtitle1: { fontWeight: 700 },
    button: { textTransform: "none", fontWeight: 700 },
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiAppBar: { defaultProps: { color: "primary" } },
    MuiCard: { styleOverrides: { root: { borderColor: "rgba(0,0,0,0.08)" } } },
    MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
  },
});

export default theme;
