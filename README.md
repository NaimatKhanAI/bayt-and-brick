# Bayt & Brick â€” UAE rentals

Responsive React website with Home, About, Neighbourhoods, Contact, Studio, 1 BHK, 2 BHK, property detail pages and an authenticated admin dashboard. The visual design combines a full-width property-image slider and gold buttons inspired by haus & haus Holidays with the white space, clear typography and teal accents of Dubai South. Original Bayt & Brick content and existing apartment imagery are retained. Subtle card depth respects reduced-motion preferences.

The active landing page is `src/Landing.jsx`; `src/reference-theme.css` styles all pages over the shared base in `src/design.css`. Property navigation includes category and monthly/yearly links. The homepage includes a functional three-image slider, area/type/rental-period search and expandable rental FAQs.

## Run locally

```sh
npm install
npm run dev
```

Vite serves the site at `http://localhost:5173` (or the next available port) and proxies API/uploads to port 3001. For a built site: `npm run build`, then `npm start`, then open `http://localhost:3001`.

## Admin

Open `/admin`. Your configured username and password are in `.local/admin-access.txt`. On first server startup, a unique random password is saved in `.local/admin-access.txt`. Keep that file private. Alternatively set `ADMIN_USERNAME` and `ADMIN_PASSWORD` in your hosting environment. When `ADMIN_PASSWORD` is set, these credentials override the saved admin login on every server startup, including existing installations; the updated hash is persisted and the old plaintext access file is removed. Save the variables and restart/redeploy the updated server to apply changes. Passwords are stored as salted scrypt hashes; sessions use HttpOnly SameSite cookies and expire after 8 hours. Restarting the server signs admins out. Login attempts are rate limited.

The dashboard supports creating, editing and deleting properties; separate monthly/yearly prices; custom UAE areas; JPG/PNG/WebP photos and MP4/WebM video uploads (50 MB each); removing media; and reading viewing enquiries. The first photo is the cover. Save a property to publish media changes. Unsaved uploads are not published; uploaded files can remain on disk after cancelling an edit. Viewing enquiries are stored in the dashboard; email/SMS delivery is not configured.

## Property search and neighbourhoods

The property catalogue includes location, apartment type, monthly/yearly price ranges, furnishing, size ranges, keywords, video tours, saved homes, sorting and list/grid views. Search writes the selected filters to a shareable URL. Property details include a structured information table and viewing enquiry form. The landing page retains its existing layout.

Admins can add and delete neighbourhoods in the **Areas** tab. Areas persist in `.local/database.json` and feed the home search, catalogue, neighbourhood page and property editor. Existing installations migrate their initial areas on server startup. An area with properties cannot be deleted until those properties are moved or removed. Restart the backend after updating server code.

## Storage and deployment

`.local/database.json` holds property, area and enquiry data; `uploads/` holds uploaded media. Both must be persistent and backed up together. Admin credentials live in `.local/admin.json`. None of these private runtime files are served by the app. This setup supports one Node server process; use a database and object storage before scaling to multiple instances.

For hosting, build assets, run the Node server behind an HTTPS reverse proxy, set `NODE_ENV=production` to enable Secure cookies, and configure `HOST`/`PORT` as needed. The proxy must preserve the original Host header for origin checks. Limit request bodies to 50 MB and retain persistent storage. Static-only hosting is insufficient for the admin backend.

Initial properties are clearly labelled sample listings with illustrative images and example prices. Replace them with your real inventory before launching. Other UAE areas show honest empty states until properties are added. Favourites are saved on the visitorâ€™s browser. Do not publish the local admin credential file.

## Checks

`npm run build` checks the production bundle. `npm test` runs isolated API integration checks (authentication, uploads, enquiries, property CRUD and persistence) using a temporary runtime directory.


## Property assistance

Homepage search includes maximum budget and furnishing. The floating assistant matches loaded listings by type, area, monthly/yearly budget and furnishing, opens filtered results, and links to the viewing enquiry flow. It uses local search rules without an external AI service or API key. Messages remain in memory during the page session.

## Team administration, roles and activity

The existing login remains the protected **Super admin** account. Open `/admin` to create team members in **Users**, assign built-in or custom **Roles**, reset their passwords, and deactivate accounts. New team passwords must be 8?200 characters. Deactivation, password changes, user edits and role changes revoke affected sessions. The original super admin cannot be disabled or reassigned through the team panel.

Permissions are enforced by the API for creating, editing and deleting properties, managing areas, reading enquiries, managing users/roles and viewing activity. Users with user/role management permissions can grant administrative access; reserve these permissions for trusted administrators. Editors can create/edit all properties, not just their own. Inactive accounts are retained to preserve history. Roles with assigned users must be reassigned before deletion.

**Activity** records the user, time and before/after values for property, user, role and area changes, plus media upload/deletion and successful logins. Deleted property details remain reviewable. Passwords and password hashes are excluded from API responses and audit entries. Events before this upgrade cannot be reconstructed. Logs have no delete endpoint; host filesystem administrators can still modify the underlying JSON store. Filters support user, action, text and UTC date range.

## Move-in availability and larger homes

Home types now include Studio and 1?8 BHK in admin, search and category routes. Only the original nine sample listings are seeded; larger homes appear when staff add them. Bathrooms are entered separately from bedrooms.

Set **Available from** in the property editor. The homepage and catalogue **Move-in date** filter shows listings whose confirmed availability date is on or before the chosen date. Unknown dates are excluded only when a date filter is active. Dates are saved in shareable search URLs. This is an availability filter, not a check-in/check-out booking calendar or reservation system.

Deploy the updated frontend and backend together and restart the Node.js app. Back up and persist `.local/database.json`, `.local/admin.json` and `uploads/` on the hosting server: team accounts, roles and activity now live alongside property data. No private `.local` files should be committed to Git. Existing database files migrate automatically; keep using one server process with this JSON storage implementation.

`npm test` includes access-control, audit persistence and availability tests in addition to the existing API checks. `npm run build` builds the client. With Microsoft Edge installed, `node qa/access-ui.mjs` runs isolated browser checks after a build; it creates only temporary test accounts and data.
