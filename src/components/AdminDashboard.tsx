"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Stack,
  Typography,
  Alert,
  Tabs,
  Tab,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import EventIcon from "@mui/icons-material/Event";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import PeopleIcon from "@mui/icons-material/People";

interface UserItem {
  _id: string;
  fullName: string;
  username: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

interface EventItem {
  _id: string;
  title: string;
  description: string;
  amount: number;
  capacity: number;
  attendeeCount: number;
  isFull: boolean;
}

interface RequestItem {
  _id: string;
  status: "pending" | "confirmed" | "rejected";
  createdAt: string;
  user: { fullName: string; username: string };
  event: { _id: string; title: string; amount: number };
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function StatusChip({ status }: { status: string }) {
  const map: Record<string, { color: any; label: string }> = {
    pending: { color: "warning", label: "Pending" },
    approved: { color: "success", label: "Approved" },
    confirmed: { color: "success", label: "Confirmed" },
    rejected: { color: "error", label: "Rejected" },
  };
  const s = map[status] ?? { color: "default", label: status };
  return <Chip size="small" color={s.color} label={s.label} />;
}

export default function AdminDashboard() {
  const [tab, setTab] = useState(0);
  const users = useSWR<UserItem[]>("/api/users", fetcher);
  const events = useSWR<EventItem[]>("/api/events", fetcher);
  const requests = useSWR<RequestItem[]>("/api/requests", fetcher);

  const revalidateAll = () => {
    users.mutate();
    events.mutate();
    requests.mutate();
  };

  return (
    <Stack spacing={2}>
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="fullWidth"
        textColor="primary"
        indicatorColor="primary"
      >
        <Tab icon={<PersonAddIcon />} label="Users" />
        <Tab icon={<EventIcon />} label="Events" />
        <Tab icon={<HourglassEmptyIcon />} label="Requests" />
        <Tab icon={<PeopleIcon />} label="Attendees" />
      </Tabs>

      {tab === 0 && (
        <UsersTab data={users.data} loading={users.isLoading} error={users.error} onDone={revalidateAll} />
      )}
      {tab === 1 && (
        <EventsTab data={events.data} loading={events.isLoading} error={events.error} onDone={revalidateAll} />
      )}
      {tab === 2 && (
        <RequestsTab data={requests.data} loading={requests.isLoading} error={requests.error} onDone={revalidateAll} />
      )}
      {tab === 3 && (
        <AttendeesTab data={requests.data} loading={requests.isLoading} error={requests.error} />
      )}
    </Stack>
  );
}

function UsersTab({
  data,
  loading,
  error,
  onDone,
}: {
  data?: UserItem[];
  loading: boolean;
  error: any;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<UserItem | null>(null);
  const [removing, setRemoving] = useState(false);

  const act = async (id: string, status: "approved" | "rejected") => {
    setBusy(id);
    setErr(null);
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      onDone();
    } catch {
      setErr("Action failed. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const confirmRemove = async () => {
    if (!removeTarget) return;
    setRemoving(true);
    setErr(null);
    try {
      const res = await fetch(`/api/users/${removeTarget._id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setRemoveTarget(null);
      onDone();
    } catch {
      setErr("Failed to remove user. Please try again.");
    } finally {
      setRemoving(false);
    }
  };

  if (loading) return <CircularProgress sx={{ mt: 4, mx: "auto" }} />;
  if (error) return <Alert severity="error">Failed to load users.</Alert>;

  const list = data ?? [];
  const pending = list.filter((u) => u.status === "pending");

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        {pending.length} account(s) awaiting approval
      </Typography>
      {err && <Alert severity="error">{err}</Alert>}
      {list.length === 0 && <Alert severity="info">No users registered yet.</Alert>}

      {list.map((u) => (
        <Card variant="outlined" key={u._id}>
          <CardContent>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              spacing={1}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography noWrap variant="subtitle1">{u.fullName}</Typography>
                <Typography noWrap variant="body2" color="text.secondary">
                  @{u.username}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
                <StatusChip status={u.status} />
                <IconButton
                  size="small"
                  color="error"
                  aria-label="remove user"
                  disabled={removing && removeTarget?._id === u._id}
                  onClick={() => setRemoveTarget(u)}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Stack>

            {u.status === "pending" && (
              <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  color="success"
                  size="small"
                  disabled={busy === u._id}
                  onClick={() => act(u._id, "approved")}
                >
                  Approve
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  disabled={busy === u._id}
                  onClick={() => act(u._id, "rejected")}
                >
                  Reject
                </Button>
              </Stack>
            )}
          </CardContent>
        </Card>
      ))}

      <Dialog open={!!removeTarget} onClose={() => setRemoveTarget(null)}>
        <DialogTitle>Remove user?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            This will permanently delete{" "}
            <strong>{removeTarget?.fullName}</strong> (@{removeTarget?.username})
            {" "}and all of their join requests. This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveTarget(null)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={confirmRemove}
            disabled={removing}
          >
            {removing ? "Removing…" : "Remove"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

function EventsTab({
  data,
  loading,
  error,
  onDone,
}: {
  data?: EventItem[];
  loading: boolean;
  error: any;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EventItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EventItem | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    amount: "",
    capacity: "",
  });
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [modalEvent, setModalEvent] = useState<EventItem | null>(null);
  const [attendees, setAttendees] = useState<{ fullName: string }[]>([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);

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

  const openCreate = () => {
    setEditTarget(null);
    setForm({ title: "", description: "", amount: "", capacity: "" });
    setErr(null);
    setOpen(true);
  };

  const openEdit = (ev: EventItem) => {
    setEditTarget(ev);
    setForm({
      title: ev.title,
      description: ev.description,
      amount: String(ev.amount),
      capacity: String(ev.capacity),
    });
    setErr(null);
    setOpen(true);
  };

  const submit = async () => {
    setErr(null);
    setSaving(true);
    try {
      const isEdit = !!editTarget;
      const res = await fetch(
        isEdit ? `/api/events/${editTarget!._id}` : "/api/events",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.title,
            description: form.description,
            amount: Number(form.amount),
            capacity: Number(form.capacity),
          }),
        }
      );
      const body = await res.json();
      if (!res.ok) {
        setErr(body.error ?? "Failed to save event");
        return;
      }
      setOpen(false);
      setEditTarget(null);
      setForm({ title: "", description: "", amount: "", capacity: "" });
      onDone();
    } catch {
      setErr("Network error.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget._id);
    setErr(null);
    try {
      const res = await fetch(`/api/events/${deleteTarget._id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setDeleteTarget(null);
      onDone();
    } catch {
      setErr("Failed to delete event.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Stack spacing={2}>
      <Button variant="contained" startIcon={<EventIcon />} onClick={openCreate}>
        Create Event
      </Button>

      {err && <Alert severity="error">{err}</Alert>}
      {loading && <CircularProgress sx={{ mt: 2, mx: "auto" }} />}
      {error && <Alert severity="error">Failed to load events.</Alert>}

      {(data ?? []).map((ev) => (
        <Card variant="outlined" key={ev._id}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="subtitle1">{ev.title}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, wordBreak: "break-word" }}>
                  {ev.description}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap">
                  <Chip size="small" label={`₹${ev.amount} / person`} color="primary" variant="outlined" />
                  <Chip
                    size="small"
                    label={`${ev.attendeeCount}/${ev.capacity} joined`}
                    variant="outlined"
                    clickable
                    onClick={() => openAttendees(ev)}
                    icon={<PeopleIcon />}
                  />
                </Stack>
              </Box>
              <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0, alignItems: "center" }}>
                {ev.isFull && <Chip size="small" label="Full" color="error" />}
                <IconButton size="small" aria-label="edit event" onClick={() => openEdit(ev)}>
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  color="error"
                  aria-label="delete event"
                  disabled={busyId === ev._id}
                  onClick={() => setDeleteTarget(ev)}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      ))}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{editTarget ? "Edit Event" : "New Event"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              fullWidth
              multiline
              minRows={2}
              required
            />
            <TextField
              label="Per-person amount (₹)"
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Max attendees"
              type="number"
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
              fullWidth
              required
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submit} disabled={saving}>
            {saving ? "Saving…" : editTarget ? "Save" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete event?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            This will permanently delete{" "}
            <strong>{deleteTarget?.title}</strong> and all of its join requests.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={confirmDelete}
            disabled={busyId === deleteTarget?._id}
          >
            {busyId === deleteTarget?._id ? "Deleting…" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

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
                <div key={i}>
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

function RequestsTab({
  data,
  loading,
  error,
  onDone,
}: {
  data?: RequestItem[];
  loading: boolean;
  error: any;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const act = async (id: string, status: "confirmed" | "rejected") => {
    setBusy(id);
    setErr(null);
    try {
      const res = await fetch(`/api/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      onDone();
    } catch {
      setErr("Action failed. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <CircularProgress sx={{ mt: 4, mx: "auto" }} />;
  if (error) return <Alert severity="error">Failed to load requests.</Alert>;

  const list = data ?? [];
  const pending = list.filter((r) => r.status === "pending");

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        {pending.length} request(s) awaiting payment confirmation
      </Typography>
      {err && <Alert severity="error">{err}</Alert>}
      {list.length === 0 && (
        <Alert severity="info">No join requests yet.</Alert>
      )}

      {list.map((r) => (
        <Card variant="outlined" key={r._id}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
              <Box>
                <Typography variant="subtitle1">
                  {r.user.fullName} <Typography component="span" variant="body2" color="text.secondary">@{r.user.username}</Typography>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {r.event.title} · ₹{r.event.amount}
                </Typography>
              </Box>
              <StatusChip status={r.status} />
            </Stack>

            {r.status === "pending" && (
              <>
                <Divider sx={{ my: 1.5 }} />
                <Typography variant="caption" color="text.secondary">
                  Mark confirmed after collecting payment from the user.
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <Button
                    variant="contained"
                    color="success"
                    size="small"
                    startIcon={<CheckCircleIcon />}
                    disabled={busy === r._id}
                    onClick={() => act(r._id, "confirmed")}
                  >
                    Confirm &amp; Paid
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    disabled={busy === r._id}
                    onClick={() => act(r._id, "rejected")}
                  >
                    Reject
                  </Button>
                </Stack>
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}

function AttendeesTab({
  data,
  loading,
  error,
}: {
  data?: RequestItem[];
  loading: boolean;
  error: any;
}) {
  if (loading) return <CircularProgress sx={{ mt: 4, mx: "auto" }} />;
  if (error) return <Alert severity="error">Failed to load attendees.</Alert>;

  const confirmed = (data ?? []).filter((r) => r.status === "confirmed");

  if (confirmed.length === 0) {
    return <Alert severity="info">No attendees confirmed yet.</Alert>;
  }

  // Group confirmed attendees by event.
  const byEvent = new Map<
    string,
    { title: string; amount: number; attendees: RequestItem[] }
  >();
  for (const r of confirmed) {
    const key = r.event._id;
    if (!byEvent.has(key)) {
      byEvent.set(key, {
        title: r.event.title,
        amount: r.event.amount,
        attendees: [],
      });
    }
    byEvent.get(key)!.attendees.push(r);
  }

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        {confirmed.length} confirmed attendee(s) across {byEvent.size} event(s)
      </Typography>

      {Array.from(byEvent.values()).map((group) => (
        <Card variant="outlined" key={group.title}>
          <CardContent>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              spacing={1}
            >
              <Typography variant="subtitle1">{group.title}</Typography>
              <Chip
                size="small"
                color="success"
                label={`${group.attendees.length} joined`}
              />
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              ₹{group.amount} / person
            </Typography>

            <Stack spacing={1} sx={{ mt: 1.5 }} divider={<Divider />}>
              {group.attendees.map((a) => (
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  spacing={1}
                  key={a._id}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography noWrap variant="body1" fontWeight={600}>
                      {a.user.fullName}
                    </Typography>
                    <Typography noWrap variant="caption" color="text.secondary">
                      @{a.user.username}
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    label={`₹${group.amount}`}
                    variant="outlined"
                  />
                </Stack>
              ))}
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}
