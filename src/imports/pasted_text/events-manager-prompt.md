Here's the fully rewritten, comprehensive system prompt incorporating all updates:

---

## EventsManager — Full System Prompt v3.0

---

### System Overview

Build a production-grade, multi-page **Events Management Web Application** called **EventsManager**. The system serves two distinct user roles: **Admin** (authenticated, full CRUD access via a persistent sidebar navigation dashboard) and **Participant** (unauthenticated, event discovery and registration via Google Form redirection). All pages share a unified design system. The backend is **Supabase** (PostgreSQL + Realtime + Storage). Google Form submissions are piped into Supabase via a **Google Apps Script `onFormSubmit` trigger**. All dynamic behaviors are implemented in vanilla JavaScript using the Supabase JS client (`@supabase/supabase-js v2`) loaded from CDN unless otherwise specified.

---

### Design System — Typography

Load both fonts from Google Fonts via a single `<link>` tag in `<head>`.

**Display / UI font:** `Plus Jakarta Sans` — weights 400, 500, 600, 700, 800. Apply to: all `<h1>`–`<h3>` headings, sidebar app name, navigation labels, stat card values, button text, table column headers, badge text, modal titles, form section titles, and card titles.

**Body / data font:** `Manrope` — weights 300, 400, 500, 600, 700. Apply to: all body copy, form input values and placeholders, table cell content, metadata strings, timestamps, descriptive subtitles, tooltip text, and tag labels.

Establish a typographic scale via CSS custom properties:
```
--fs-display:    26px / weight 800 / letter-spacing -0.5px  → page titles
--fs-heading:    18px / weight 800 / letter-spacing -0.3px  → card titles, modal headers
--fs-subheading: 14px / weight 700                          → section labels, panel titles
--fs-body:       13px / weight 400                          → primary body text
--fs-small:      11px / weight 500                          → metadata, timestamps, helper text
--fs-label:      10px / weight 700 / uppercase / letter-spacing 0.8px  → form labels, table headers
--fs-micro:       9px / weight 700 / uppercase / letter-spacing 1px    → badges, pills, sidebar section headers
```

---

### Design System — Color Palette

Define all values as CSS custom properties on `:root`.

**Arctic Depth:**
```
--ad-950: #0C1B2E   /* sidebar bg, page bg dark */
--ad-900: #162840   /* dark card surface */
--ad-800: #1D3A55   /* elevated dark surface */
--ad-600: #378ADD   /* primary interactive blue */
--ad-400: #1D9E75   /* success, positive delta, synced */
--ad-200: #6EC9A8   /* light success tint */
--ad-100: #C8E8F8   /* lightest blue tint */
```

**Bloom & Stone:**
```
--bs-900: #1a1730   /* deepest purple bg */
--bs-800: #2a2550   /* user avatar bg */
--bs-600: #7F77DD   /* PRIMARY ACCENT — active nav, buttons, focus rings */
--bs-400: #D4537E   /* danger, alerts, unread indicators, badges */
--bs-50:  #F5F0FC   /* lightest purple tint */
```

**Semantic:**
```
--amber:      #EF9F27
--coral:      #E85D24
--red-bg:     rgba(224,80,80,0.08)
--red-text:   #C04040
```

**Light mode surfaces:**
```
--bg:       #F2F4F8
--surface:  #FFFFFF
--surface2: #F7F8FB
--border:   rgba(0,0,0,0.07)
--border2:  rgba(0,0,0,0.13)
--text:     #0F1E30
--text-sec: #4A6080
--text-dim: #98ABBE
```

**Sidebar-specific:**
```
--sidebar-bg:   #0C1B2E
--sidebar-text: #C8DFF0
--sidebar-dim:  #3D6080
```

---

### Design System — Spacing, Shape, Shadow

```css
--radius-sm: 8px   --radius-md: 10px   --radius-lg: 14px
--radius-xl: 20px  --radius-full: 9999px

--space-xs: 4px    --space-sm: 8px     --space-md: 14px
--space-lg: 20px   --space-xl: 28px
```

Shadows:
```
Card default:         0 1px 4px rgba(0,0,0,0.05)
Card hover (lifted):  0 8px 28px rgba(0,0,0,0.09)
Floating panels:      0 12px 40px rgba(0,0,0,0.13), 0 2px 8px rgba(0,0,0,0.06)
Active nav item:      0 3px 14px rgba(127,119,221,0.35)
Primary button:       0 4px 16px rgba(127,119,221,0.30)
Primary button hover: 0 6px 22px rgba(127,119,221,0.42)
```

---

### Design System — Animation

```css
@keyframes fadeUp   { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
@keyframes fadeDown { from { opacity:0; transform:translateY(-12px)} to { opacity:1; transform:translateY(0) } }
@keyframes fadeIn   { from { opacity:0 } to { opacity:1 } }
@keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:0.4} }
@keyframes shimmer  { from{background-position:-200% 0} to{background-position:200% 0} }
```

Stagger page-load animations at `0.05s` delay increments per card/row. All hover transitions use `transition: all 0.17s ease`. Button hover applies `transform: translateY(-1px)`. Active button resets to `transform: translateY(0)`.

---

### Global Layout Architecture

```css
body {
  display: grid;
  grid-template-columns: 224px 1fr;
  min-height: 100vh;
}
```

- Left: `.sidebar` — `position: sticky; top: 0; height: 100vh; overflow: hidden`
- Right: `.main` — `display: flex; flex-direction: column`
  - `.topbar` — `position: sticky; top: 0; height: 58px; z-index: 200`
  - `.content` — `flex: 1; overflow-y: auto; padding: 28px`

---

### Sidebar Component

Background `var(--sidebar-bg)`. Right border `1px solid rgba(55,138,221,0.08)`. Atmospheric top glow via `::before`: `position:absolute; top:0; left:0; right:0; height:180px; background: radial-gradient(ellipse at 50% -20%, rgba(127,119,221,0.18) 0%, transparent 70%)`.

**Logo area:** 34×34px rounded square, `background: linear-gradient(135deg, var(--bs-600), var(--ad-600))`, white calendar SVG icon. App name "EventsManager" in Plus Jakarta Sans 800, 15px, `#E8F4FF`. Separated by `border-bottom: 1px solid rgba(255,255,255,0.05)`.

**Nav sections — Main:**
- Dashboard
- Calendar
- Events *(badge: total event count, reactive)*
- Certificates *(new — links to certificate management page)*
- **Quick Actions** sub-group (visually separated by a lighter 9px label, not a full separator):
  - New Event *(teal-tinted style: `background: rgba(55,138,221,0.1); border: 1px solid rgba(55,138,221,0.18); color: var(--ad-100)`)*
  - Scan QR Code *(same teal-tinted style, opens QR scanner modal)*

**Nav sections — System:**
- Notifications *(badge: unread count, reactive)*
- Settings

**Bottom section:** Collapse (muted, 60% opacity) + Sign Out (color `#E06060`).

**Nav item base styles:** `display:flex; align-items:center; gap:10px; padding:9px 12px; border-radius:10px`. Default color `var(--sidebar-text)`. Hover: `rgba(255,255,255,0.06)`. Active: `background: var(--bs-600); color:#fff; font-weight:700; box-shadow: 0 3px 14px rgba(127,119,221,0.35)`. Icons 16×16px, `opacity:0.75` default, `1.0` on active/hover.

**Reactive badges:** Both the Events and Notifications badges subscribe to a custom DOM event system. The Events badge reflects `em_events` store count. The Notifications badge reflects the count of objects with `read: false` in `em_notifications`. Both re-render on `eventsUpdated` and `notificationsUpdated` custom events dispatched via `document.dispatchEvent()`.

---

### Topbar Component

Background `var(--surface)`, `border-bottom: 1px solid var(--border)`, height 58px.

1. **Search input** — max-width 380px, left-aligned SVG search icon, `border-radius: 9px`, background `var(--surface2)`, focus: `border-color: var(--bs-600); box-shadow: 0 0 0 3px rgba(127,119,221,0.1)`.

2. **Synced pill** — `background: rgba(29,158,117,0.08); border: 1px solid rgba(29,158,117,0.18); color: var(--ad-400)`. 6px animated pulsing dot. Label changes to "Saving…" in amber during active write operations (600ms simulated delay for localStorage, actual await for Supabase calls), reverts to "Synced" on completion.

3. **Notification bell** — 34×34px icon button. Pink `var(--bs-400)` unread dot, visible only when unread count > 0. Clicking opens the Notifications floating panel.

4. **User avatar chip** — 32px circle, `background: linear-gradient(135deg, var(--bs-800), var(--bs-600)); border: 2px solid var(--bs-600)`. Displays 2-letter admin initials from stored credentials.

---

### Supabase Database Schema

All tables live in the `public` schema. Enable Row Level Security on all tables. Use the **service role key** only in Google Apps Script (server-side). Use the **anon public key** in the browser client, governed by RLS policies.

```sql
-- Events
create table events (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  category text check (category in ('Conference','Workshop','Meetup','Webinar','Social','Gala','Summit')),
  status text default 'Draft' check (status in ('Draft','Published','Ended')),
  date date,
  time_start time,
  time_end time,
  location text,
  description text,
  capacity integer,
  tags text[],
  google_form_url text,
  google_sheet_id text,
  certificate_template_id uuid references certificate_templates(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Registrations (populated by Google Forms via Apps Script)
create table registrations (
  id uuid default gen_random_uuid() primary key,
  event_id uuid references events(id) on delete cascade,
  full_name text not null,
  email text not null,
  sector text,
  gender text,
  phone text,
  certificate_number text unique,
  certificate_sent boolean default false,
  certificate_sent_at timestamptz,
  registered_at timestamptz default now(),
  source text default 'google_form'
);

-- Certificate Templates
create table certificate_templates (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  category_tag text,
  document_url text,        -- Supabase Storage URL for the uploaded template file
  document_type text,       -- 'docx' | 'pdf' | 'pptx'
  placeholder_map jsonb,    -- maps token names to document field positions/bookmarks
  preview_image_url text,   -- Supabase Storage URL for the thumbnail preview
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Notifications
create table notifications (
  id uuid default gen_random_uuid() primary key,
  type text,
  message text,
  event_id uuid references events(id) on delete cascade,
  read boolean default false,
  created_at timestamptz default now()
);

-- Admin Credentials (simple single-admin setup)
create table admin_credentials (
  id integer default 1 primary key,
  username text not null unique,
  password_hash text not null,
  updated_at timestamptz default now()
);
```

---

### Page 1 — Dashboard (`events-dashboard.html`)

**Active nav item:** Dashboard.

**Page header:** "Dashboard" in `--fs-display`. Dynamic date subtitle via `new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })`. Right side: "New Event" primary button — `background: var(--bs-600)`.

**Stat cards** — 4-column CSS grid, gap 14px. Values dynamically queried from Supabase:
- Total Events — `select count(*) from events`
- Today's Events — `select count(*) from events where date = current_date`
- Total Participants — `select count(*) from registrations`
- Upcoming Events — `select count(*) from events where date >= current_date and status = 'Published'`

All stat cards animate in with staggered `fadeUp`. Each card: white surface, 14px radius, flex row between left (label + value + delta) and right (40×40px icon wrap, category-tinted background).

**Two-column panel row** — `grid-template-columns: 1fr 1fr`:

*Upcoming Events panel:* Lists all events where `date >= today` and `status = 'Published'`, sorted ascending by date. Each row is **fully clickable** — clicking anywhere on the row opens the Event Detail modal for that event (not just an icon button). Each row contains: 3px colored left bar (per category color), event title, time range, status pill. Status pill is reactive to actual `status` field.

*Recent Events panel:* Lists events where `date < today`, sorted descending by date. Each row is fully clickable, opening the Event Detail modal. Each row contains: 3px colored left bar, title, date, attendee count from `registrations` joined on `event_id`.

**Three-column bottom row** — `grid-template-columns: 1fr 1fr 1fr`:

*Activity feed:* Last 10 records from `notifications` table, ordered by `created_at` DESC. Each item: colored avatar initials, bold actor/event name + action text, relative timestamp. Subscribe to Supabase Realtime on `notifications` table to auto-append new items on `INSERT`.

*Registration breakdown:* Per-category counts from `registrations` joined with `events` on `event_id`. Rendered as labeled rows with CSS progress bars. Colors match category color mapping.

*Right column:* Mini 7-column calendar (events rendered as colored chips from Supabase data, reactive) + a **Quick Actions** card below it containing: "New Event" button and "Scan QR Code" button (opens QR scanner modal overlay).

---

### Page 2 — Events Table (`events-list.html`)

**Active nav item:** Events.

**Page header:** "Events" + `{count} events found` subtitle + "New Event" primary button.

**Filters bar** (white card, `border-radius: var(--radius-lg)`): inline search input + four `<select>` dropdowns — Category, Status, Time range, Sort order. All filters operate client-side on the fetched data array using `Array.filter()` and `Array.sort()`. Re-query Supabase on page load, then filter in-memory.

**Data table columns:**
1. **Event** — 8px colored dot (category color) + event name (Plus Jakarta Sans 700) + tag pills below. **The entire row is clickable** and opens the Event Detail modal. Do not require the user to click a specific icon to open the event.
2. **Date & Time** — formatted date (600 weight) + time range below in `var(--text-dim)`
3. **Location** — truncated at 22 characters with ellipsis, full value in a `title` attribute tooltip
4. **Category** — colored pill badge
5. **Attendees** — right-aligned count + 4px progress bar (green ≤70%, amber 70–90%, coral >90%)
6. **Status** — pill (Published: green, Draft: gray, Ended: muted, Soon: blue)
7. **Actions** — three 28×28px icon buttons only:
   - **View QR** (QR code icon) — opens the event's QR code modal
   - **Edit** (pencil icon) — opens the edit event modal
   - **Delete** (trash icon) — opens a confirmation dialog

Clicking anywhere on a table row (outside the action buttons) opens the **Event Detail modal** for that event.

**Event Detail modal** (full-height right-side drawer or centered modal, max-width 720px):
- Event name, category badge, status pill at the top
- Info grid: date, time, location, capacity, description, tags
- **Attendee List tab**: table of all registrations for this event pulled from Supabase — columns: Full Name, Email, Sector, Gender, Phone, Certificate Number, Registered At, Certificate Status (Sent / Not Sent), Send Certificate button
- **Certificate tab**: shows the assigned template preview thumbnail, a "Change Template" dropdown, and a "Send All Certificates" bulk action button
- **QR Code tab**: renders the event's Google Form URL as a QR code (QRCode.js), with Download PNG and Copy Link buttons

---

### Page 3 — Calendar (`events-calendar.html`)

**Active nav item:** Calendar.

**Controls:** Left — "Calendar" page title. Right — Month/Week/Day segmented toggle, ‹ Prev, Today, Next ›, current month/year label.

**Month grid:** 7-column CSS grid. Day cells `min-height: 110px`. Today's date: day number in `var(--bs-600)` filled 26×26px circle. Other-month days: dimmed background. Event chips are rendered dynamically from Supabase events data. **Each event chip is clickable** and opens the Event Detail modal for that event. Chips are styled by category color (10px font, 6px border-radius, tinted background).

Subscribe to Supabase Realtime on the `events` table so that newly created events appear on the calendar immediately without a page refresh.

---

### Page 4 — Certificates (`events-certificates.html`)

**Active nav item:** Certificates.

This is a dedicated page — not a modal — for managing reusable certificate templates.

**Page header:** "Certificates" + "Manage your certificate templates" subtitle + "New Template" primary button.

**Template Library** — responsive card grid (`repeat(auto-fill, minmax(240px, 1fr))`). Each card:
- Thumbnail preview image (stored in Supabase Storage, rendered as `<img>`)
- Template name in Plus Jakarta Sans 700
- Category tag pill (if assigned)
- Document type badge (DOCX / PDF / PPTX) in small gray pill
- Action buttons: **Preview**, **Edit**, **Assign to Event**, **Delete**

**"New Template" / "Edit Template" modal — Document Upload Workflow:**

The certificate template creator uses a **document file upload approach** (not a raw HTML editor). The workflow is as follows:

1. Admin provides a **Template Name** (text input, required).
2. Admin optionally selects a **Category Tag** (dropdown: All / Conference / Workshop / Meetup / Webinar / Social / Gala / Summit).
3. Admin uploads a **template document file** via a drag-and-drop upload zone that accepts `.docx`, `.pdf`, and `.pptx` formats. The file upload zone displays: a cloud upload icon, "Drag and drop your template file here", "or click to browse", and an accepted formats note. On file selection, the filename and size are shown with a progress bar during upload to Supabase Storage.
4. A **Placeholder Reference Panel** (displayed alongside the upload zone in a two-column layout) shows a read-only list of all supported placeholder tokens that the admin must manually insert into their document before uploading:

   | Token | Resolves to |
   |---|---|
   | `{{participant_name}}` | Registrant's full name |
   | `{{participant_email}}` | Registrant's email address |
   | `{{certificate_number}}` | Auto-generated unique cert ID |
   | `{{event_name}}` | Event title |
   | `{{event_date}}` | Formatted event date |
   | `{{event_location}}` | Event venue |
   | `{{issue_date}}` | Certificate issue date |

   The panel includes a brief instruction: "Insert these tokens into your document as plain text in the exact positions where participant data should appear. The system will replace them when generating certificates."

   Below the token list, a **"Copy All Tokens"** button copies the full list to clipboard. Each individual token has a copy icon button on its row.

5. Admin uploads an optional **Preview Thumbnail** image (PNG or JPG, max 2MB) to display as the template card thumbnail. If not uploaded, a default placeholder is shown.
6. **"Save Template"** button — on click:
   - Validates required fields (name, document file)
   - Uploads document file to Supabase Storage bucket `certificate-templates/{templateId}/{filename}`
   - Uploads thumbnail (if provided) to `certificate-templates/{templateId}/preview.png`
   - Inserts a record into the `certificate_templates` table with `document_url`, `document_type`, and `preview_image_url` fields populated
   - Closes the modal and renders the new card in the library grid
   - Dispatches `templatesUpdated` custom event

**How certificates are generated and sent — document-based approach:**

Since `.docx` / `.pdf` / `.pptx` files are binary formats that cannot be naively string-replaced in the browser, the recommended architecture uses **Google Apps Script as the generation engine**:

1. The admin uploads a `.docx` template (recommended primary format) with `{{token}}` placeholders as literal text strings in the document body.
2. When "Send Certificate" is clicked for a participant:
   - The frontend constructs a JSON payload: `{ templateUrl, recipientName, recipientEmail, certificateNumber, eventName, eventDate, eventLocation, issueDate }`
   - This payload is `POST`ed to the admin's configured **Google Apps Script Web App URL** (stored in Settings → Integrations)
3. The Apps Script receives the payload and executes:
   ```javascript
   function doPost(e) {
     const data = JSON.parse(e.postData.contents);
     // Fetch the template DOCX from Supabase Storage URL
     const templateBlob = UrlFetchApp.fetch(data.templateUrl).getBlob();
     // Copy template to Drive as a new Google Doc
     const file = DriveApp.createFile(templateBlob);
     const doc = DocumentApp.openById(file.getId());
     const body = doc.getBody();
     // Replace all placeholder tokens
     body.replaceText('{{participant_name}}', data.recipientName);
     body.replaceText('{{participant_email}}', data.recipientEmail);
     body.replaceText('{{certificate_number}}', data.certificateNumber);
     body.replaceText('{{event_name}}', data.eventName);
     body.replaceText('{{event_date}}', data.eventDate);
     body.replaceText('{{event_location}}', data.eventLocation);
     body.replaceText('{{issue_date}}', data.issueDate);
     doc.saveAndClose();
     // Export as PDF
     const pdf = DriveApp.getFileById(file.getId())
       .getAs('application/pdf');
     // Save PDF to designated Drive folder
     const folder = DriveApp.getFolderById('YOUR_DRIVE_FOLDER_ID');
     const savedPdf = folder.createFile(pdf);
     savedPdf.setName(data.recipientName + '_' + data.certificateNumber + '.pdf');
     // Email the PDF to the participant
     MailApp.sendEmail({
       to: data.recipientEmail,
       subject: 'Your Certificate — ' + data.eventName,
       body: 'Dear ' + data.recipientName + ',\n\nPlease find your certificate attached.\n\nBest regards,\nEventسManager',
       attachments: [pdf]
     });
     // Clean up: delete the intermediate Google Doc
     DriveApp.getFileById(file.getId()).setTrashed(true);
     return ContentService.createTextOutput(
       JSON.stringify({ success: true, pdfUrl: savedPdf.getUrl() })
     ).setMimeType(ContentService.MimeType.JSON);
   }
   ```
4. On success response, the frontend updates the participant's row in the Attendee List: sets `certificate_sent = true`, `certificate_sent_at = now()` in Supabase, renders a green "Sent ✓" badge with timestamp, and pushes a `certificate_sent` notification.

**Bulk send ("Send All Certificates" button):**
- Iterates all registrants where `certificate_sent = false` for the selected event
- Sends requests sequentially with a 400ms delay between each to avoid Apps Script rate limits
- Shows a modal-level progress bar: "Sending 1 of N…" updating in real time
- On completion: shows a summary toast "N certificates sent successfully"

**Certificate send status persistence:** Stored in Supabase `registrations` table fields `certificate_sent` (boolean) and `certificate_sent_at` (timestamptz). Frontend reads these on attendee modal open and renders status badges accordingly.

---

### Page 5 — Settings (`events-settings.html`)

**Active nav item:** Settings.

**Page header:** "Settings" + "Manage your account and data" subtitle.

**Two-tab segmented control:** Account · Data Management.

*(Note: App installation instructions and deployment guides are reserved for a separate system documentation page. Do not include them here.)*

---

**Account tab** — three white cards stacked vertically:

*Card 1 — Change Username:*
- Label: "Username" — current username displayed in a read-only gray input styled identically to a form input but with `background: var(--surface2); cursor: default`
- Input: "New Username" — standard form input with user icon
- Validation on submit: non-empty, min 3 characters, no spaces. On success: update `admin_credentials` in Supabase, show green success toast "Username updated successfully."

*Card 2 — Change Password:*
- Three inputs: "Current Password", "New Password", "Confirm New Password" — each with a lock icon prefix and an eye/eye-off toggle button (SVG) on the right end of the input that switches `type="password"` ↔ `type="text"`
- Validation: current password must match stored hash, new password ≥ 8 characters, new and confirm must match. Show inline error messages below the relevant field on failure.
- On success: update `password_hash` in Supabase, clear all three fields, show green success toast.

*Card 3 — Integrations:*
- Field: "Google Apps Script URL" — text input with a link icon, placeholder `https://script.google.com/macros/s/…/exec`
- A "Test Connection" button that sends a `GET` request to the URL with a `?test=true` query param and shows "Connected ✓" in green or "Connection failed" in red based on the response
- Status indicator: a colored 8px dot + label ("Connected" / "Not Connected") that persists based on the last test result, stored in `localStorage` key `em_appsscript_status`
- Saved to Supabase `admin_settings` table (or `localStorage` key `em_settings` if Supabase table is not configured)

---

**Data Management tab** — one white card with row-based layout:

Each row: label (600 weight, 13px) + description (`var(--text-dim)`, 11px) + right-aligned action button.

| Action | Button Style |
|---|---|
| Export all events → CSV | Primary (purple-tinted) |
| Export attendee data → CSV | Primary |
| Backup database → JSON | Default gray |
| Clear all draft events | Danger (red-tinted) |
| Reset all data | Danger — requires typing "RESET" in a confirmation input dialog |

Destructive actions open a confirmation dialog modal before execution. The Reset all data action requires a secondary input field where the admin types "RESET" exactly before the confirm button becomes enabled.

---

### Login Flow — Three-Screen Architecture (`events-login.html`)

All screens reside in a single HTML file, toggled with `display:none` / `display:block` and `fadeIn` animation. A `currentRole` and `selectedEvent` variable are scoped to the module.

No step indicator / pagination dots are shown anywhere in the login flow.

---

**Screen 1 — Role Selection:**

Centered card (max-width 820px, `border-radius: var(--radius-xl)`, dark navy `rgba(17,34,58,0.78)` background, `backdrop-filter: blur(24px)`). Atmospheric background radial glows and CSS dot-grid overlay on the page body.

Two role cards in a 2-column grid:
- **Participant card** — teal icon wrap (users SVG), "Participant", description "Browse and join upcoming events", teal CTA arrow, hover border `rgba(29,158,117,0.45)`, hover lift `translateY(-3px)`
- **Admin card** — purple icon wrap (shield SVG), "Admin", description "Manage events, attendees, and certificates", purple CTA arrow, hover border `rgba(127,119,221,0.45)`

---

**Screen 2A — Admin Login:**

Two-column layout: 240px dark purple gradient left band + flex-1 right form panel.

*Left band:* `background: linear-gradient(160deg, #3C3489 0%, #1a1730 55%, #0F1623 100%)`, subtle dot pattern overlay via `background-image: radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px); background-size: 24px 24px`, bottom purple glow. Contains: back button (top-left), 50×50px shield icon wrap, "Admin Portal" title, subtitle, three feature bullet points.

*Right form:* "Sign in to Dashboard" title, "Enter your admin credentials to continue" subtitle. Two inputs:
- Username — user icon prefix
- Password — lock icon prefix + show/hide toggle (eye SVG, switches `type` attribute on click)

"Forgot password?" text link right-aligned above the submit button.

"Sign In to Dashboard" primary button (full width, purple gradient). On submit: validate against Supabase `admin_credentials` table (query by username, compare password). On success: store session in `sessionStorage` key `em_admin_session`, redirect to `events-dashboard.html`. On failure: shake animation on the card + inline error message "Incorrect username or password" below the password field with red border on both inputs.

Default credentials info box below the button: gray-tinted card showing username and password in monospaced value pills.

---

**Screen 2B — Participant Event Selection:**

Two-column layout: 240px teal gradient left band + flex-1 right event list.

*Left band:* `background: linear-gradient(160deg, #0F6E56 0%, #102838 55%, #0B1929 100%)`, same dot pattern, bottom teal glow. Contains: back button, users icon, "Join an Event" title, subtitle "Pick an event and register in seconds — no account needed.", three feature bullets.

*Right panel:* "Select an Event" title, "Tap an event to view details and register" subtitle. Scrollable list of **Published** events fetched from Supabase (`status = 'Published'`), sorted ascending by date. Each event item:
- Emoji category icon (34×34px tinted rounded square)
- Event title (Plus Jakarta Sans 700, 12px)
- Date / time / venue meta row (9px icons + text)
- Category badge (right-aligned)
- Chevron arrow (right-aligned)

Hover: `border-color: var(--border-h); background: rgba(55,138,221,0.07); transform: translateX(3px)`. Clicking an item advances to Screen 3 with that event's full data object passed via the `selectedEvent` variable.

---

**Screen 3 — Event Detail + Registration:**

Two-column layout: left info panel + right registration panel.

*Left panel* (background `var(--surface-solid)`): back button → "Back to events", category badge, event name (Plus Jakarta Sans 800, 17px), three info cards (Date, Time, Venue — each with a colored icon wrap), capacity progress bar at the bottom.

*Right panel:* "Register for this Event" title, "Fill in your details to complete registration" subtitle.

The right panel does **not** contain a traditional form with a submit action. Instead it contains:

1. **A prominent "Register via Google Form →" button** (full width, teal gradient, Plus Jakarta Sans 700) — opens the event's `google_form_url` in a new browser tab via `window.open(url, '_blank')`.

2. **QR code** (180×180px, rendered via QRCode.js from the event's `google_form_url`) with label "Scan to register on your phone" (12px, `var(--text-muted)`, centered).

3. **Copyable link row** — Google Form URL truncated with ellipsis inside a gray input-styled container, with a copy icon button on the right that calls `navigator.clipboard.writeText(url)` and shows a brief "Copied!" tooltip.

4. Helper text: "You'll be redirected to an external Google Form. Your submission will be recorded automatically." — 11px, `var(--text-dim)`.

No name, email, or any other input field is present on Screen 3.

---

### Feature — QR Code System

**QR code generation:** Use **QRCode.js** loaded from CDN `https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js`. Initialize with `new QRCode(containerElement, { text: url, width: size, height: size, colorDark: '#0F1E30', colorLight: '#FFFFFF' })`.

**QR code is generated for every event** that has a non-null `google_form_url`. Generation occurs:
- When an event is created or edited and a Google Form URL is saved
- On Screen 3 of the login flow, rendering the selected event's form URL
- In the Event Detail modal (QR Code tab)
- In the Events table, via the View QR action button opening a QR modal

**QR modal** (triggered from Events table QR button, Calendar chip click → QR tab, Dashboard event row): 
- Centered modal, max-width 380px, white surface, `border-radius: var(--radius-xl)`
- Event name + category badge at top
- 240×240px QR code rendered
- Google Form URL as copyable truncated text link
- "Download PNG" button — calls `canvas.toDataURL('image/png')` and triggers a download via a temporary `<a>` element
- "Open Form" button — opens the URL in a new tab
- Close button (×) top-right

**Scan QR Code (Quick Action):** The "Scan QR Code" item in the sidebar Quick Actions group opens a **QR scanner modal**. The modal uses the device camera via `getUserMedia()` and a canvas-based QR decoder (use `jsQR` from CDN `https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js`). Decoded URLs are displayed with an "Open Link" button. If camera permission is denied, show a fallback message with a manual URL input field.

---

### Sector Field — Standardized Across All Entry Points

The **Sector** field must appear identically — same options, same styling — in every context where participant data is collected or displayed:

**Contexts:**
1. Participant login Screen 3 — displayed as part of the event info context (no input here, redirected to Google Form)
2. **Add / Edit Attendee modal** (admin manually adds a participant from the Event Detail modal's Attendee List tab)
3. **Attendee data table** (read-only, rendered as the sector value from the registration record)

**Sector dropdown options (standardized list — must be identical everywhere):**
```
Technology
Finance
Healthcare
Education
Government
Marketing & Media
Engineering
Hospitality & Events
Legal
Non-Profit & NGO
Academic / Research
Other
```

**Styling:** The sector `<select>` element uses `appearance: none; -webkit-appearance: none` to remove native styling. Applied CSS: `background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 10px 32px 10px 36px`. A tag/label SVG icon is positioned absolutely on the left (same as other prefixed inputs). A chevron-down SVG is positioned absolutely on the right via `background-image` or an absolutely positioned sibling `<div>`. Focus state matches all other inputs: `border-color: var(--bs-600); box-shadow: 0 0 0 3px rgba(127,119,221,0.10)`.

---

### Add / Edit Attendee Modal — Admin Manual Entry

Accessible from the Event Detail modal → Attendee List tab → "Add Attendee" button. Also used for editing existing attendee records (pre-populated fields).

**Form fields:**
- Full Name — text input, required, person icon prefix
- Email Address — email input, required, envelope icon prefix, helper text "A confirmation email will be sent to this address."
- Sector — styled dropdown (standardized list above), required, tag icon prefix
- Gender — styled dropdown (Male / Female / Non-binary / Prefer not to say), optional label in muted text
- Phone Number — tel input, optional label, phone icon prefix, placeholder "+63 9XX XXX XXXX"

**No ID or certificate number input field.** Certificate numbers are auto-generated by the system using the format `CERT-{shortEventId}-{YYYYMMDD}-{5-digit-random}` at the point of record creation. They are displayed read-only in the attendee table but never entered manually.

On save:
- Insert into Supabase `registrations` table
- Auto-generate `certificate_number` on the client side before insert
- Update event attendee count displayed in stat cards and the Events table
- Dispatch `eventsUpdated` custom event
- Push a `registration_received` notification to Supabase `notifications` table
- Dispatch `notificationsUpdated` custom event
- Show success toast: "{Full Name} has been added."

---

### Event Detail Modal — Fully Clickable Event Opening

Every surface that displays an event — table rows, dashboard panel rows, calendar chips, notification items referencing an event — must open the **Event Detail modal** when clicked. The only exception is action icon buttons within a row (QR, Edit, Delete), which perform their own specific action and use `event.stopPropagation()` to prevent the row click from also firing.

The Event Detail modal is a right-side drawer (slide in from right, `width: min(720px, 90vw)`, `height: 100vh`, `position: fixed; right: 0; top: 0`). Overlay backdrop `rgba(0,0,0,0.35)` covers the rest of the screen. Close via the × button or clicking the backdrop.

**Modal internal tabs:**
1. **Overview** — event info grid (all fields), description, tags, capacity bar, registered count
2. **Attendees** — table of registrations from Supabase, with Add Attendee button, per-row Send Certificate button, per-row Edit and Remove buttons, and a "Send All Certificates" bulk action button at the top
3. **Certificate** — assigned template card (thumbnail + name), "Change Template" dropdown, "Send All" button
4. **QR Code** — rendered QR code + Download + Copy + Open Form buttons

---

### Notification System

**Storage:** Supabase `notifications` table (primary), mirrored to `localStorage` key `em_notifications` as a fallback cache.

**Notification types and triggers:**

| Type | Trigger |
|---|---|
| `event_created` | Admin saves a new event |
| `event_updated` | Admin edits an existing event |
| `event_deleted` | Admin deletes an event |
| `registration_received` | New row inserted into `registrations` (from Apps Script or manual add) |
| `certificate_sent` | `certificate_sent` set to `true` for a registrant |
| `capacity_warning` | Registration count crosses 75% or 90% of event capacity |

**Notification object:**
```json
{
  "id": "uuid",
  "type": "string",
  "message": "string",
  "event_id": "uuid|null",
  "read": false,
  "created_at": "ISO8601"
}
```

**Realtime subscription:** Subscribe to Supabase Realtime `INSERT` events on `notifications` table. On each new notification: re-render the notification panel list, increment the unread badge count, update the bell dot visibility, and append to the activity feed if on the Dashboard page.

**Notifications floating panel:**
- Position: `absolute; top: 62px; right: 16px` relative to `.topbar-right`
- Width 320px, max-height 420px scrollable body
- Header: "Notifications" (Plus Jakarta Sans 800, 14px) + "Mark all read" text button + × close button
- Unread items: `border-left: 3px solid var(--bs-600); background: var(--bs-50)` + 7px unread dot (`var(--bs-600)`)
- Read items: default surface, no dot
- Each item: 28×28px colored avatar + body (bold actor + action text, 12px) + relative timestamp (10px, `var(--text-dim)`) + unread dot
- Relative timestamps: "just now" (<1 min), "N min ago", "N hr ago", "Yesterday", formatted date for older
- Clicking a notification: marks `read = true` in Supabase, removes dot, decrements badge, navigates to relevant event if `event_id` is present
- "Mark all read": sets all to `read = true` in Supabase batch update, resets badge to zero
- Empty state: "No notifications" centered in `var(--text-dim)`
- Close on outside click via document listener with `stopPropagation()` on panel

---

### Synced Pill Behavior

| State | Label | Dot color | Animation |
|---|---|---|---|
| Idle (data consistent) | "Synced" | `var(--ad-400)` green | Pulsing |
| Write in progress | "Saving…" | `var(--amber)` amber | Pulsing fast |
| Write complete | "Synced" | `var(--ad-400)` green | Returns to normal pulse |
| Supabase unreachable | "Offline" | `var(--bs-400)` pink | Pulsing slow |

Transitions managed by a `setSyncState(state)` helper function called before and after every Supabase write operation.

---

### Google Apps Script — Form Submission to Supabase

Deploy this as a **Google Apps Script bound to the Google Sheet** linked to the Google Form. Add an `onFormSubmit` trigger pointing to this function.

```javascript
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_KEY = 'your-service-role-key'; // server-side only
const EVENT_ID    = 'your-event-uuid';         // hardcoded per event

function onFormSubmit(e) {
  const v = e.values;
  // v[0] = Timestamp (always first column in Google Sheets form responses)
  const fullName = v[1];
  const email    = v[2];
  const sector   = v[3];
  const gender   = v[4];
  const phone    = v[5] || null;

  const certNumber = generateCertNumber(EVENT_ID);

  const payload = JSON.stringify({
    event_id:           EVENT_ID,
    full_name:          fullName,
    email:              email,
    sector:             sector,
    gender:             gender,
    phone:              phone,
    certificate_number: certNumber,
    source:             'google_form'
  });

  const res = UrlFetchApp.fetch(SUPABASE_URL + '/rest/v1/registrations', {
    method:           'POST',
    contentType:      'application/json',
    headers: {
      'apikey':        SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Prefer':        'return=representation'
    },
    payload:          payload,
    muteHttpExceptions: true
  });

  Logger.log(res.getResponseCode() + ': ' + res.getContentText());
}

function generateCertNumber(eventId) {
  const d    = new Date();
  const date = d.getFullYear() +
               String(d.getMonth()+1).padStart(2,'0') +
               String(d.getDate()).padStart(2,'0');
  const rand = Math.floor(Math.random() * 90000) + 10000;
  const eId  = eventId.replace(/-/g,'').substring(0,8).toUpperCase();
  return 'CERT-' + eId + '-' + date + '-' + rand;
}
```

---

### Suggested Additional Features (Future Sprint)

1. **Event Analytics Per-Event Page** — Registration growth sparkline (SVG or Chart.js from CDN), peak registration hour heatmap, sector distribution donut chart, certificate delivery rate gauge — all built from Supabase queries against `registrations` filtered by `event_id`.

2. **Bulk Event Import via CSV** — FileReader API parses uploaded CSV, a column-mapping UI maps CSV columns to event fields, parsed preview table shown before confirm bulk-insert into Supabase.

3. **Event Duplication** — "Duplicate" action on each event row clones all fields into a new Draft with "(Copy)" suffix. Preserves category, template assignment, capacity, and tags. Clears `google_form_url` so admin can assign a new form.

4. **Google Sheets Sync Button** — Per-event "Sync from Sheet" button in the Event Detail modal that fetches the latest rows from the linked Google Sheet via the Apps Script endpoint, compares against existing `registrations`, and upserts new records into Supabase.

5. **Public Event Listing Page** — Read-only, unauthenticated page (`events-public.html`) showing all Published events as cards with QR codes and Google Form buttons, designed for embedding on external websites as an iframe.

6. **Certificate Delivery Log** — Per-event table in the Certificates tab showing all sent certificates: participant name, email, certificate number, sent timestamp, Google Drive PDF link, and a "Resend" button for failed deliveries.

7. **Dark Mode Toggle** — Topbar theme toggle button. Applies `data-theme="dark"` to `<html>`. A `:root[data-theme="dark"]` block overrides all surface, text, and border variables. Persists preference to `localStorage` key `em_theme`.

8. **Automated Capacity Alerts** — Capacity warning notifications at 75% and 90% thresholds. Triggered by a function called after every new registration insert. Pushes a `capacity_warning` notification to Supabase and dispatches `notificationsUpdated`.

9. **Role-Based Admin Access** — Extend `admin_credentials` to include a `role` field (`super_admin` / `event_manager` / `viewer`). Event managers can only edit events they created. Viewers have read-only access. Role checked on every write operation.

10. **Print Certificate (Client-Side Fallback)** — If the Apps Script integration is not configured, a "Print / Save PDF" fallback option opens the filled certificate template HTML (using a client-side token replacement on a plain HTML version of the template) in a new tab and calls `window.print()`. A `@media print` stylesheet hides all UI chrome and renders the certificate at A4 dimensions (`210mm × 297mm`).