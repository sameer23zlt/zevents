"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  Divider,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import PeopleIcon from "@mui/icons-material/People";
import PaymentsIcon from "@mui/icons-material/Payments";

interface EventItem {
  _id: string;
  title: string;
  description: string;
  amount: number;
  capacity: number;
  attendeeCount: number;
  isFull: boolean;
  myStatus: "none" | "pending" | "confirmed" | "rejected";
}

interface Attendee {
  _id: string;
  fullName: string;
  username: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function UserDashboard() {
  const { data, error, isLoading, mutate } = useSWR<EventItem[]>(
    "/api/events",
    fetcher
  );
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [modalEvent, setModalEvent] = useState<EventItem | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);

  const handleJoin = async (eventId: string) => {
    setPendingId(eventId);
    setActionError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/join`, {
        method: "POST",
      });
      const body = await res.json();
      if (!res.ok) {
        setActionError(body.error ?? "Could not send request");
        return;
      }
      await mutate();
    } catch {
      setActionError("Network error. Please try again.");
    } finally {
      setPendingId(null);
    }
  };

  const openAttendees = async (ev: EventItem) => {
    setModalEvent(ev);
    setLoadingAttendees(true);
    setAttendees([]);
    try {
      const res = await fetch(`/api/events/${ev._id}/attendees`);
      const body = await res.json();
      if (res.ok) setAttendees(body);
    } finally {
      setLoadingAttendees(false);
    }
  };

  const handlePay = async (ev: EventItem) => {
    setPayingId(ev._id);
    setActionError(null);
    try {
      const res = await fetch("/api/payment-config");
      const cfg = await res.json();
      if (!res.ok) {
        setActionError(cfg.error ?? "Payment not configured");
        return;
      }
      const upiUrl =
        `upi://pay?pa=${encodeURIComponent(cfg.upiId)}` +
        `&pn=${encodeURIComponent(cfg.payeeName)}` +
        `&am=${encodeURIComponent(String(ev.amount))}` +
        `&cu=INR`;
      window.location.href = upiUrl;
    } catch {
      setActionError("Could not start payment. Please try again.");
    } finally {
      setPayingId(null);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">Failed to load events.</Alert>;
  }

  const events = data ?? [];

  return (
    <Stack spacing={2}>
      <Typography variant="h6">Upcoming Events</Typography>
      {actionError && <Alert severity="error">{actionError}</Alert>}

      {events.length === 0 && (
        <Alert severity="info">No events have been created yet.</Alert>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
          gap: 2,
          justifyContent: "center",
        }}
      >
        {events.map((ev) => (
          <Card variant="outlined" key={ev._id} sx={{ height: "100%" }}>
            <CardContent>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="flex-start"
                  spacing={1}
                >
                  <Typography variant="h6">{ev.title}</Typography>
                  {ev.isFull && <Chip size="small" label="Full" color="error" />}
                </Stack>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1, minHeight: 40, wordBreak: "break-word" }}
                >
                  {ev.description}
                </Typography>

                <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap">
                  <Chip
                    size="small"
                    label={`₹${ev.amount} / person`}
                    color="primary"
                    variant="outlined"
                  />
                  <Chip
                    size="small"
                    label={`${ev.attendeeCount}/${ev.capacity} joined`}
                    variant="outlined"
                    clickable
                    onClick={() => openAttendees(ev)}
                    icon={<PeopleIcon />}
                  />
                </Stack>

                <Box sx={{ mt: 2 }}>
                  {ev.myStatus === "none" && (
                    <Button
                      variant="contained"
                      fullWidth
                      disabled={ev.isFull || pendingId === ev._id}
                      onClick={() => handleJoin(ev._id)}
                    >
                      {pendingId === ev._id ? "Sending…" : "Mark IN"}
                    </Button>
                  )}
                  {ev.myStatus === "pending" && (
                    <Button
                      variant="outlined"
                      fullWidth
                      disabled
                      startIcon={<HourglassEmptyIcon />}
                    >
                      Request Pending
                    </Button>
                  )}
                  {ev.myStatus === "confirmed" && (
                    <Button
                      variant="contained"
                      color="success"
                      fullWidth
                      disabled
                      startIcon={<CheckCircleIcon />}
                    >
                      Confirmed Attendee
                    </Button>
                  )}
                  {ev.myStatus === "rejected" && (
                    <Button
                      variant="outlined"
                      color="error"
                      fullWidth
                      disabled={ev.isFull || pendingId === ev._id}
                      onClick={() => handleJoin(ev._id)}
                    >
                      {pendingId === ev._id ? "Re-sending…" : "Re-send Request"}
                    </Button>
                  )}

                  <Button
                    variant="outlined"
                    fullWidth
                    sx={{ mt: 1.5 }}
                    disabled={payingId === ev._id}
                    onClick={() => handlePay(ev)}
                    startIcon={<PaymentsIcon />}
                  >
                    {payingId === ev._id ? "Opening UPI…" : "Pay Now"}
                  </Button>
                </Box>
              </CardContent>
            </Card>
        ))}
      </Box>

      <Dialog
        open={!!modalEvent}
        onClose={() => setModalEvent(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>
          Attendees
          <Typography variant="body2" color="text.secondary">
            {modalEvent?.title}
          </Typography>
        </DialogTitle>
        <DialogContent>
          {loadingAttendees ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
              <CircularProgress size={28} />
            </Box>
          ) : attendees.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No attendees yet.
            </Typography>
          ) : (
            <List disablePadding>
              {attendees.map((a, i) => (
                <div key={a._id}>
                  {i > 0 && <Divider />}
                  <ListItem disableGutters>
                    <ListItemText primary={a.fullName} />
                  </ListItem>
                </div>
              ))}
            </List>
          )}
        </DialogContent>
      </Dialog>
    </Stack>
  );
}
