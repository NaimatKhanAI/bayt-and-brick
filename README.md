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

Open `/admin`. Your configured username and password are in `.local/admin-access.txt`. On first server startup, a unique random password is saved in `.local/admin-access.txt`. Keep that file private. Alternatively provide `ADMIN_USERNAME` and `ADMIN_PASSWORD` on the **first** startup. Passwords are stored as salted scrypt hashes; sessions use HttpOnly SameSite cookies and expire after 8 hours. Restarting the server signs admins out. Login attempts are rate limited.

The dashboard supports creating, editing and deleting properties; separate monthly/yearly prices; custom UAE areas; JPG/PNG/WebP photos and MP4/WebM video uploads (50 MB each); removing media; and reading viewing enquiries. The first photo is the cover. Save a property to publish media changes. Unsaved uploads are not published; uploaded files can remain on disk after cancelling an edit. Viewing enquiries are stored in the dashboard; email/SMS delivery is not configured.

## Storage and deployment

`.local/database.json` holds property and enquiry data; `uploads/` holds uploaded media. Both must be persistent and backed up together. Admin credentials live in `.local/admin.json`. None of these private runtime files are served by the app. This setup supports one Node server process; use a database and object storage before scaling to multiple instances.

For hosting, build assets, run the Node server behind an HTTPS reverse proxy, set `NODE_ENV=production` to enable Secure cookies, and configure `HOST`/`PORT` as needed. The proxy must preserve the original Host header for origin checks. Limit request bodies to 50 MB and retain persistent storage. Static-only hosting is insufficient for the admin backend.

Initial properties are clearly labelled sample listings with illustrative images and example prices. Replace them with your real inventory before launching. Other UAE areas show honest empty states until properties are added. Favourites are saved on the visitorâ€™s browser. Do not publish the local admin credential file.

## Checks

`npm run build` checks the production bundle. `npm test` runs isolated API integration checks (authentication, uploads, enquiries, property CRUD and persistence) using a temporary runtime directory.

