"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  Alert,
  Stack,
  Tabs,
  Tab,
} from "@mui/material";
import SportsSoccerIcon from "@mui/icons-material/SportsSoccer";
import { useAuth } from "@/components/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [role, setRole] = useState<"user" | "admin">("user");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Users have no password — only send it for admin.
        body: JSON.stringify(
          role === "admin"
            ? { username, password }
            : { username }
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Login failed");
        return;
      }
      await refresh();
      router.replace("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
      }}
    >
      <Card sx={{ width: "100%", maxWidth: 400 }}>
        <CardContent>
          <Stack spacing={2} alignItems="center">
            <SportsSoccerIcon color="primary" sx={{ fontSize: 48 }} />
            <Typography variant="h5">Zevents</Typography>
            <Typography variant="body2" color="text.secondary">
              Sign in to manage your events
            </Typography>
          </Stack>

          <Tabs
            value={role}
            onChange={(_, v) => {
              setRole(v);
              setError(null);
            }}
            variant="fullWidth"
            sx={{ mt: 1 }}
            textColor="primary"
            indicatorColor="primary"
          >
            <Tab value="user" label="User" />
            <Tab value="admin" label="Admin" />
          </Tabs>

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <Stack spacing={2}>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                fullWidth
                required
                autoFocus
              />
              {role === "admin" ? (
                <TextField
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  fullWidth
                  required
                />
              ) : (
                <Typography variant="caption" color="text.secondary">
                  Users sign in with their username only.
                </Typography>
              )}
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={submitting}
              >
                {submitting ? "Signing in…" : "Sign In"}
              </Button>
            </Stack>
          </Box>

          <Typography variant="body2" align="center" sx={{ mt: 3 }}>
            New here?{" "}
            <Link href="/register" style={{ color: "inherit" }}>
              Create an account
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
