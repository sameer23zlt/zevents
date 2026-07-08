"use client";

import { AppBar, Toolbar, Typography, IconButton, Box } from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import SportsSoccerIcon from "@mui/icons-material/SportsSoccer";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthContext";

export default function AppShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const { logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <Box sx={{ minHeight: "100dvh", pb: 4 }}>
      <AppBar position="sticky">
        <Toolbar>
          <SportsSoccerIcon sx={{ mr: 1 }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {title}
          </Typography>
          <IconButton color="inherit" onClick={handleLogout} aria-label="logout">
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 900, mx: "auto" }}>
        {children}
      </Box>
    </Box>
  );
}
