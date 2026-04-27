import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import postgres from "npm:postgres";
import { createClient } from "npm:@supabase/supabase-js@2";

const app = new Hono();

app.use('*', logger(console.log));
app.use("/*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
}));

const BASE = "/make-server-3fb3cb7a";

// ── Supabase Storage client ───────────────────────────────────────────────────
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
const ID_BUCKET = "make-3fb3cb7a-attendee-ids";

// Idempotently create the private bucket on startup
(async () => {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some((b: any) => b.name === ID_BUCKET);
    if (!bucketExists) {
      await supabase.storage.createBucket(ID_BUCKET, { public: false });
      console.log(`Created storage bucket: ${ID_BUCKET}`);
    }
  } catch (e) {
    console.log(`Bucket init warning (non-fatal): ${e}`);
  }
})();

// ── Health ────────────────────────────────────────────────────────────────────
app.get(`${BASE}/health`, (c) => c.json({ status: "ok" }));

// ── Full data load ─────────────────────────────────────────────────────────────
app.get(`${BASE}/data`, async (c) => {
  try {
    const [events, attendees, notifications] = await Promise.all([
      kv.getByPrefix("event:"),
      kv.getByPrefix("attendee:"),
      kv.getByPrefix("notification:"),
    ]);
    return c.json({ events, attendees, notifications, seeded: events.length > 0 });
  } catch (e) {
    console.log("Error loading data:", e);
    return c.json({ error: `Failed to load data: ${e}` }, 500);
  }
});

// ── Seed data (only if DB is empty) ───────────────────────────────────────────
app.post(`${BASE}/data/seed`, async (c) => {
  try {
    const existing = await kv.getByPrefix("event:");
    if (existing.length > 0) {
      return c.json({ alreadySeeded: true, eventCount: existing.length });
    }

    const { events, attendees, notifications } = await c.req.json();

    // Seed events
    await kv.mset(
      events.map((e: any) => `event:${e.id}`),
      events,
    );

    // Seed attendees in chunks of 100 to avoid payload limits
    const CHUNK = 100;
    for (let i = 0; i < attendees.length; i += CHUNK) {
      const chunk = attendees.slice(i, i + CHUNK);
      await kv.mset(
        chunk.map((a: any) => `attendee:${a.eventId}:${a.id}`),
        chunk,
      );
    }

    // Seed notifications (if any)
    if (notifications && notifications.length > 0) {
      await kv.mset(
        notifications.map((n: any) => `notification:${n.id}`),
        notifications,
      );
    }

    return c.json({ success: true, seeded: { events: events.length, attendees: attendees.length } });
  } catch (e) {
    console.log("Error seeding data:", e);
    return c.json({ error: `Failed to seed data: ${e}` }, 500);
  }
});

// ── Events ─────────────────────────────────────────────────────────────────────
app.get(`${BASE}/events`, async (c) => {
  try {
    const events = await kv.getByPrefix("event:");
    return c.json({ events });
  } catch (e) {
    console.log("Error getting events:", e);
    return c.json({ error: `Failed to get events: ${e}` }, 500);
  }
});

app.post(`${BASE}/events`, async (c) => {
  try {
    const event = await c.req.json();
    await kv.set(`event:${event.id}`, event);
    return c.json({ event });
  } catch (e) {
    console.log("Error creating event:", e);
    return c.json({ error: `Failed to create event: ${e}` }, 500);
  }
});

app.put(`${BASE}/events/:id`, async (c) => {
  try {
    const event = await c.req.json();
    await kv.set(`event:${event.id}`, event);
    return c.json({ event });
  } catch (e) {
    console.log("Error updating event:", e);
    return c.json({ error: `Failed to update event: ${e}` }, 500);
  }
});

app.delete(`${BASE}/events/:id`, async (c) => {
  try {
    const id = c.req.param("id");
    // Delete the event
    await kv.del(`event:${id}`);
    // Delete all attendees for this event
    const attendees: any[] = await kv.getByPrefix(`attendee:${id}:`);
    if (attendees.length > 0) {
      await kv.mdel(attendees.map((a: any) => `attendee:${a.eventId}:${a.id}`));
    }
    return c.json({ success: true, deletedAttendees: attendees.length });
  } catch (e) {
    console.log("Error deleting event:", e);
    return c.json({ error: `Failed to delete event: ${e}` }, 500);
  }
});

// ── Attendees ──────────────────────────────────────���───────────────────────────
app.get(`${BASE}/events/:eventId/attendees`, async (c) => {
  try {
    const eventId = c.req.param("eventId");
    const attendees = await kv.getByPrefix(`attendee:${eventId}:`);
    return c.json({ attendees });
  } catch (e) {
    console.log("Error getting attendees:", e);
    return c.json({ error: `Failed to get attendees: ${e}` }, 500);
  }
});

app.post(`${BASE}/attendees`, async (c) => {
  try {
    const attendee = await c.req.json();
    await kv.set(`attendee:${attendee.eventId}:${attendee.id}`, attendee);
    return c.json({ attendee });
  } catch (e) {
    console.log("Error creating attendee:", e);
    return c.json({ error: `Failed to create attendee: ${e}` }, 500);
  }
});

app.post(`${BASE}/attendees/bulk`, async (c) => {
  try {
    const { attendees } = await c.req.json();
    const CHUNK = 100;
    for (let i = 0; i < attendees.length; i += CHUNK) {
      const chunk = attendees.slice(i, i + CHUNK);
      await kv.mset(
        chunk.map((a: any) => `attendee:${a.eventId}:${a.id}`),
        chunk,
      );
    }
    return c.json({ success: true, count: attendees.length });
  } catch (e) {
    console.log("Error bulk creating attendees:", e);
    return c.json({ error: `Failed to bulk create attendees: ${e}` }, 500);
  }
});

// Update attendee — PUT /attendees/:eventId/:id
app.put(`${BASE}/attendees/:eventId/:id`, async (c) => {
  try {
    const attendee = await c.req.json();
    await kv.set(`attendee:${attendee.eventId}:${attendee.id}`, attendee);
    return c.json({ attendee });
  } catch (e) {
    console.log("Error updating attendee:", e);
    return c.json({ error: `Failed to update attendee: ${e}` }, 500);
  }
});

// Delete attendee — DELETE /attendees/:eventId/:id
app.delete(`${BASE}/attendees/:eventId/:id`, async (c) => {
  try {
    const eventId = c.req.param("eventId");
    const id = c.req.param("id");
    await kv.del(`attendee:${eventId}:${id}`);
    return c.json({ success: true });
  } catch (e) {
    console.log("Error deleting attendee:", e);
    return c.json({ error: `Failed to delete attendee: ${e}` }, 500);
  }
});

// Bulk delete attendees
app.post(`${BASE}/attendees/bulk-delete`, async (c) => {
  try {
    const { attendees } = await c.req.json();
    const keys = attendees.map((a: { id: string; eventId: string }) => `attendee:${a.eventId}:${a.id}`);
    if (keys.length > 0) await kv.mdel(keys);
    return c.json({ success: true, deleted: keys.length });
  } catch (e) {
    console.log("Error bulk deleting attendees:", e);
    return c.json({ error: `Failed to bulk delete attendees: ${e}` }, 500);
  }
});

// Delete ALL attendees for an event
app.delete(`${BASE}/events/:eventId/attendees`, async (c) => {
  try {
    const eventId = c.req.param("eventId");
    const attendees: any[] = await kv.getByPrefix(`attendee:${eventId}:`);
    if (attendees.length > 0) {
      await kv.mdel(attendees.map((a: any) => `attendee:${a.eventId}:${a.id}`));
    }
    return c.json({ success: true, deleted: attendees.length });
  } catch (e) {
    console.log("Error deleting event attendees:", e);
    return c.json({ error: `Failed to delete event attendees: ${e}` }, 500);
  }
});

// ── Notifications ──────────────────────────────────────────────────────────────
app.get(`${BASE}/notifications`, async (c) => {
  try {
    const notifications = await kv.getByPrefix("notification:");
    return c.json({ notifications });
  } catch (e) {
    console.log("Error getting notifications:", e);
    return c.json({ error: `Failed to get notifications: ${e}` }, 500);
  }
});

app.post(`${BASE}/notifications`, async (c) => {
  try {
    const notification = await c.req.json();
    await kv.set(`notification:${notification.id}`, notification);
    return c.json({ notification });
  } catch (e) {
    console.log("Error creating notification:", e);
    return c.json({ error: `Failed to create notification: ${e}` }, 500);
  }
});

app.patch(`${BASE}/notifications/:id`, async (c) => {
  try {
    const id = c.req.param("id");
    const existing: any = await kv.get(`notification:${id}`);
    if (!existing) return c.json({ error: "Notification not found" }, 404);
    const updated = { ...existing, read: true };
    await kv.set(`notification:${id}`, updated);
    return c.json({ notification: updated });
  } catch (e) {
    console.log("Error marking notification read:", e);
    return c.json({ error: `Failed to mark notification read: ${e}` }, 500);
  }
});

app.post(`${BASE}/notifications/mark-all-read`, async (c) => {
  try {
    const notifications: any[] = await kv.getByPrefix("notification:");
    if (notifications.length > 0) {
      const updated = notifications.map((n: any) => ({ ...n, read: true }));
      await kv.mset(
        updated.map((n: any) => `notification:${n.id}`),
        updated,
      );
    }
    return c.json({ success: true, updated: notifications.length });
  } catch (e) {
    console.log("Error marking all notifications read:", e);
    return c.json({ error: `Failed to mark all notifications read: ${e}` }, 500);
  }
});

// ── Email helper ───────────────────────────────────────────────────────────────
async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    console.log(`[EMAIL SKIPPED] No RESEND_API_KEY set. Would have sent: "${subject}" to ${to}`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: Deno.env.get("EMAIL_FROM") || "EventsManager <onboarding@resend.dev>",
      to,
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Resend error: ${JSON.stringify(err)}`);
  }
}

function qrUrl(data: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(data)}`;
}

function registrationEmailHtml(p: {
  name: string; eventTitle: string; eventDate: string; eventTime: string;
  eventLocation: string; virtualLink?: string; attendeeId: string; sector: string;
}) {
  const qr = qrUrl(`EVT-${p.attendeeId}`);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f1f5f9;padding:32px 16px}
.wrap{max-width:580px;margin:0 auto}.card{background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)}
.head{background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);padding:40px 40px 32px;text-align:center}
.head-icon{width:64px;height:64px;background:rgba(255,255,255,.2);border-radius:16px;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;font-size:28px}
.head h1{color:#fff;font-size:22px;font-weight:700;margin-bottom:6px}.head p{color:#c7d2fe;font-size:14px}
.body{padding:36px 40px}.greeting{font-size:16px;color:#334155;margin-bottom:20px}
.event-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:24px;margin-bottom:24px}
.event-box h2{font-size:18px;color:#1e293b;font-weight:700;margin-bottom:16px}
.row{display:flex;gap:10px;align-items:flex-start;margin-bottom:10px;font-size:14px;color:#475569}
.row-icon{font-size:16px;min-width:20px}.row-label{font-weight:600;color:#334155;margin-right:4px}
.qr-box{border:2px dashed #c7d2fe;border-radius:12px;padding:28px;text-align:center;margin-bottom:24px;background:#fafbff}
.qr-box h3{font-size:15px;color:#4f46e5;font-weight:700;margin-bottom:4px}.qr-box p{font-size:12px;color:#94a3b8;margin-top:8px}
.qr-id{font-size:11px;color:#cbd5e1;margin-top:4px;font-family:monospace}
.badge{display:inline-block;background:#eef2ff;color:#6366f1;font-size:12px;font-weight:600;padding:4px 12px;border-radius:999px;margin-bottom:20px}
.footer{background:#f8fafc;padding:20px 40px;text-align:center;font-size:12px;color:#94a3b8;border-top:1px solid #f1f5f9}
</style></head><body><div class="wrap"><div class="card">
<div class="head"><div class="head-icon">🎉</div><h1>Registration Confirmed!</h1><p>You're all set for ${p.eventTitle}</p></div>
<div class="body">
  <p class="greeting">Hi <strong>${p.name}</strong>,</p>
  <p style="font-size:14px;color:#64748b;margin-bottom:20px">Your spot has been secured. Here are your event details and entry QR code.</p>
  <div class="event-box">
    <h2>${p.eventTitle}</h2>
    <div class="row"><span class="row-icon">📅</span><div><span class="row-label">Date</span>${p.eventDate}</div></div>
    <div class="row"><span class="row-icon">🕐</span><div><span class="row-label">Time</span>${p.eventTime}</div></div>
    <div class="row"><span class="row-icon">📍</span><div><span class="row-label">Location</span>${p.eventLocation}</div></div>
    ${p.virtualLink ? `<div class="row"><span class="row-icon">🔗</span><div><span class="row-label">Virtual Link</span><a href="${p.virtualLink}" style="color:#6366f1">${p.virtualLink}</a></div></div>` : ""}
    <div class="row"><span class="row-icon">🏷️</span><div><span class="row-label">Sector</span>${p.sector}</div></div>
  </div>
  <div class="qr-box">
    <h3>Your Entry QR Code</h3>
    <img src="${qr}" alt="QR Code" width="180" height="180" style="display:block;margin:16px auto;border-radius:8px" />
    <p>Show this QR code at the event entrance for check-in</p>
    <p class="qr-id">ID: ${p.attendeeId}</p>
  </div>
  <p style="font-size:13px;color:#64748b">We look forward to seeing you there! 🚀</p>
</div>
<div class="footer">EventsManager · Automated registration confirmation</div>
</div></div></body></html>`;
}

function certificateEmailHtml(p: {
  name: string; eventTitle: string; eventDate: string; eventLocation: string; issuedAt: string;
}) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Georgia,'Times New Roman',serif;background:#f1f5f9;padding:32px 16px}
.wrap{max-width:680px;margin:0 auto}.outer{background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,.12)}
.banner{background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 60%,#a78bfa 100%);padding:20px;text-align:center}
.banner p{color:#c7d2fe;font-size:13px;letter-spacing:2px;text-transform:uppercase;font-family:-apple-system,sans-serif}
.cert{border:3px solid #6366f1;margin:24px;padding:48px 40px;text-align:center;border-radius:12px;position:relative;background:#fff}
.cert::before{content:'';position:absolute;inset:6px;border:1px solid #e0e7ff;border-radius:8px;pointer-events:none}
.medallion{width:72px;height:72px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:50%;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;font-size:32px;box-shadow:0 4px 16px rgba(99,102,241,.4)}
.cert-title{font-size:13px;letter-spacing:3px;text-transform:uppercase;color:#6366f1;font-family:-apple-system,sans-serif;font-weight:600;margin-bottom:8px}
.cert-heading{font-size:32px;color:#1e293b;font-weight:700;margin-bottom:6px;font-family:Georgia,serif}
.cert-sub{font-size:14px;color:#64748b;font-family:-apple-system,sans-serif;margin-bottom:28px}
.awardee{font-size:36px;color:#4f46e5;font-weight:700;font-style:italic;margin-bottom:8px;border-bottom:2px solid #e0e7ff;padding-bottom:16px;display:inline-block}
.event-name{font-size:18px;color:#334155;font-weight:600;font-family:-apple-system,sans-serif;margin:20px 0 6px}
.event-meta{font-size:13px;color:#94a3b8;font-family:-apple-system,sans-serif;margin-bottom:28px}
.sig-row{display:flex;justify-content:center;gap:60px;margin-top:32px;padding-top:24px;border-top:1px solid #f1f5f9}
.sig{text-align:center}.sig-line{width:140px;border-top:1px solid #94a3b8;margin:0 auto 6px}
.sig-label{font-size:11px;color:#94a3b8;font-family:-apple-system,sans-serif;letter-spacing:1px;text-transform:uppercase}
.footer-note{padding:20px;text-align:center;font-size:12px;color:#94a3b8;font-family:-apple-system,sans-serif;background:#f8fafc}
</style></head><body><div class="wrap"><div class="outer">
<div class="banner"><p>Certificate of Completion</p></div>
<div class="cert">
  <div class="medallion">🏆</div>
  <p class="cert-title">Certificate of Completion</p>
  <h1 class="cert-heading">This is to certify that</h1>
  <p class="cert-sub">the following individual has successfully completed</p>
  <p class="awardee">${p.name}</p>
  <p class="event-name">${p.eventTitle}</p>
  <p class="event-meta">📅 ${p.eventDate} &nbsp;·&nbsp; 📍 ${p.eventLocation}</p>
  <div class="sig-row">
    <div class="sig"><div class="sig-line"></div><p class="sig-label">Event Organizer</p></div>
    <div class="sig"><div class="sig-line"></div><p class="sig-label">Date Issued: ${p.issuedAt}</p></div>
  </div>
</div>
<div class="footer-note">Issued by EventsManager · ${p.issuedAt}</div>
</div></div></body></html>`;
}

// ── Public Event Registration ──────────────────────────────────────────────────
app.get(`${BASE}/events/published`, async (c) => {
  try {
    const events: any[] = await kv.getByPrefix("event:");
    const published = events.filter((e: any) => e.status === "published");
    return c.json({ events: published });
  } catch (e) {
    console.log("Error fetching published events:", e);
    return c.json({ error: `Failed to fetch published events: ${e}` }, 500);
  }
});

app.get(`${BASE}/events/:id/public`, async (c) => {
  try {
    const id = c.req.param("id");
    const event = await kv.get(`event:${id}`);
    if (!event) return c.json({ error: "Event not found" }, 404);
    return c.json({ event });
  } catch (e) {
    console.log("Error fetching public event:", e);
    return c.json({ error: `Failed to fetch event: ${e}` }, 500);
  }
});

app.post(`${BASE}/events/:id/register`, async (c) => {
  try {
    const eventId = c.req.param("id");
    const event: any = await kv.get(`event:${eventId}`);
    if (!event) return c.json({ error: "Event not found" }, 404);
    if (event.status !== "published") return c.json({ error: "Event is not open for registration" }, 400);

    const { name, email, sector, phone, idPhoto, idPhotoName } = await c.req.json();
    if (!name || !email) return c.json({ error: "name and email are required" }, 400);

    // Check for duplicate email
    const existing: any[] = await kv.getByPrefix(`attendee:${eventId}:`);
    const duplicate = existing.find((a: any) => a.email.toLowerCase() === email.toLowerCase());
    if (duplicate) return c.json({ error: "This email is already registered for this event" }, 409);

    const attendeeId = `att-reg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // Upload ID photo to Supabase Storage if provided
    let idPhotoPath: string | undefined;
    if (idPhoto && typeof idPhoto === "string" && idPhoto.startsWith("data:")) {
      try {
        // Parse base64 data URL
        const matches = idPhoto.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          const mimeType = matches[1];
          const base64Data = matches[2];
          const ext = mimeType.split("/")[1] === "jpeg" ? "jpg" : mimeType.split("/")[1] || "jpg";
          const filePath = `${eventId}/${attendeeId}.${ext}`;

          // Decode base64 to Uint8Array
          const binaryStr = atob(base64Data);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }

          const { error: uploadErr } = await supabase.storage
            .from(ID_BUCKET)
            .upload(filePath, bytes, {
              contentType: mimeType,
              upsert: true,
            });

          if (uploadErr) {
            console.log(`ID photo upload failed: ${uploadErr.message}`);
          } else {
            idPhotoPath = filePath;
            console.log(`ID photo uploaded: ${filePath}`);
          }
        }
      } catch (uploadErr) {
        console.log(`ID photo upload error (registration continues): ${uploadErr}`);
      }
    }

    const attendee: any = {
      id: attendeeId,
      eventId,
      name,
      email,
      sector: sector || undefined,
      phone: phone || undefined,
      idPhotoPath,
      status: "confirmed",
      checkedIn: false,
      registeredAt: new Date().toISOString(),
    };

    await kv.set(`attendee:${eventId}:${attendeeId}`, attendee);

    // Format event details for email
    const eventDate = new Date(event.date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const eventTime = `${event.startTime} – ${event.endTime}`;

    // Send confirmation email
    try {
      const html = registrationEmailHtml({
        name, sector: sector || "Not specified", eventTitle: event.title, eventDate, eventTime,
        eventLocation: event.location, virtualLink: event.virtualLink, attendeeId,
      });
      await sendEmail(email, `Registration Confirmed: ${event.title}`, html);
      console.log(`Registration email sent to ${email}`);
    } catch (emailErr) {
      console.log(`Email send failed (registration still succeeded): ${emailErr}`);
    }

    return c.json({ success: true, attendee });
  } catch (e) {
    console.log("Error registering attendee:", e);
    return c.json({ error: `Registration failed: ${e}` }, 500);
  }
});

// ── Send Certificates ──────────────────────────────────────────────────────────
app.post(`${BASE}/events/:id/send-certificates`, async (c) => {
  try {
    const eventId = c.req.param("id");
    const event: any = await kv.get(`event:${eventId}`);
    if (!event) return c.json({ error: "Event not found" }, 404);

    const { attendeeIds } = await c.req.json() as { attendeeIds: string[] };
    if (!attendeeIds || attendeeIds.length === 0) return c.json({ error: "No attendee IDs provided" }, 400);

    const eventDate = new Date(event.date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const issuedAt = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

    let sent = 0;
    let failed = 0;
    const now = new Date().toISOString();
    const updatedAttendees: any[] = [];

    for (const attendeeId of attendeeIds) {
      const attendee: any = await kv.get(`attendee:${eventId}:${attendeeId}`);
      if (!attendee) continue;

      try {
        const html = certificateEmailHtml({
          name: attendee.name,
          eventTitle: event.title,
          eventDate,
          eventLocation: event.location,
          issuedAt,
        });
        await sendEmail(attendee.email, `🏆 Certificate of Completion: ${event.title}`, html);
        const updated = { ...attendee, certificateSentAt: now };
        await kv.set(`attendee:${eventId}:${attendeeId}`, updated);
        updatedAttendees.push(updated);
        sent++;
      } catch (emailErr) {
        console.log(`Certificate email failed for ${attendee.email}: ${emailErr}`);
        failed++;
      }
    }

    return c.json({ success: true, sent, failed, updatedAttendees });
  } catch (e) {
    console.log("Error sending certificates:", e);
    return c.json({ error: `Failed to send certificates: ${e}` }, 500);
  }
});

// ── Attendee ID photo signed URL ──────────────────────────────────────────────
app.get(`${BASE}/attendees/:eventId/:id/id-photo`, async (c) => {
  try {
    const eventId = c.req.param("eventId");
    const id = c.req.param("id");
    const attendee: any = await kv.get(`attendee:${eventId}:${id}`);
    if (!attendee || !attendee.idPhotoPath) {
      return c.json({ error: "No ID photo found for this attendee" }, 404);
    }
    const { data, error } = await supabase.storage
      .from(ID_BUCKET)
      .createSignedUrl(attendee.idPhotoPath, 3600); // 1-hour expiry
    if (error) {
      console.log(`Signed URL error: ${error.message}`);
      return c.json({ error: `Failed to generate signed URL: ${error.message}` }, 500);
    }
    return c.json({ url: data.signedUrl });
  } catch (e) {
    console.log("Error fetching ID photo URL:", e);
    return c.json({ error: `Failed to fetch ID photo: ${e}` }, 500);
  }
});

// ── Admin: Purge all data (bypasses PostgREST via direct SQL) ─────────────────
app.delete(`${BASE}/admin/purge-all`, async (c) => {
  try {
    const dbUrl = Deno.env.get("SUPABASE_DB_URL");
    if (!dbUrl) {
      return c.json({ error: "SUPABASE_DB_URL not configured" }, 500);
    }
    const sql = postgres(dbUrl, { ssl: "require", prepare: false, max: 1 });
    try {
      const result = await sql`
        DELETE FROM kv_store_3fb3cb7a
        WHERE key LIKE 'event:%'
           OR key LIKE 'attendee:%'
           OR key LIKE 'notification:%'
      `;
      console.log(`Purged ${result.count} rows from kv_store_3fb3cb7a`);
    } finally {
      await sql.end();
    }
    return c.json({ success: true });
  } catch (e) {
    console.log("Error purging all data:", e);
    return c.json({ error: `Failed to purge all data: ${e}` }, 500);
  }
});

Deno.serve(app.fetch);