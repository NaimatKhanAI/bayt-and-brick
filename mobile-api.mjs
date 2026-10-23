import { randomBytes, createHash, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { categories } from "./src/data.js";
import { notificationService } from './notifications.mjs';

const derive = promisify(scrypt);
const id = () => randomBytes(16).toString("hex");
const digest = (value) => createHash("sha256").update(value).digest("hex");
const fail = (message, status = 400) => {
  throw Object.assign(new Error(message), { status });
};
const text = (value, max = 500) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";
const email = (value) => text(value, 254).toLowerCase();
const safeCustomer = (c) => ({
  id: c.id,
  name: c.name,
  email: c.email,
  phone: c.phone,
  notifications: c.notifications,
  roleId: "customer",
  permissions: [],
});
const validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const validPhone = (v) => /^[+\d ()-]{7,25}$/.test(v);
const validViewingTime = value => {
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d:00\+04:00$/.test(value))return false;
  const stamp=Date.parse(value);
  return Number.isFinite(stamp) && new Date(stamp+4*3600000).toISOString().slice(0,16)===value.slice(0,16) && stamp>=Date.now()+3600000 && stamp<=Date.now()+90*86400000;
};
async function hashPassword(password) {
  if (
    typeof password !== "string" ||
    password.length < 10 ||
    password.length > 200
  )
    fail("Use a password between 10 and 200 characters.");
  const salt = id();
  return {
    salt,
    hash: Buffer.from(await derive(password, salt, 64)).toString("hex"),
  };
}

// Additive migration 1; legacy properties, staff, media and enquiries are untouched.
export function mobileApi({ db, sessions, access, save, parse, rate }) {
  for (const key of [
    "customers",
    "favorites",
    "viewings",
    "notifications",
    "passwordResets",
    "propertyRequests",
  ])
    db[key] ||= [];
  db.schemaVersion = Math.max(db.schemaVersion || 0, 1);
  const push=notificationService(db,save);
  const website = (
    process.env.PUBLIC_WEBSITE_URL || "https://holidayzone.online"
  ).replace(/\/$/, "");
  const publicProperties = () =>
    db.properties.filter((p) => !p.hidden && !p.demo);
  const property = (propertyId) =>
    publicProperties().find((p) => p.id === propertyId) ||
    fail("This property is no longer available.", 404);
  const decorate = (p) => ({
    ...p,
    canonicalUrl: `${website}/property/${encodeURIComponent(p.id)}`,
  });
  const customer = (token) => {
    const session = sessions.get(token);
    return session?.expires > Date.now() && session.customerId
      ? db.customers.find((c) => c.id === session.customerId && c.active)
      : null;
  };
  function issue(user, isCustomer) {
    const token = randomBytes(32).toString("hex"),
      expires = Date.now() + 7 * 86400000;
    sessions.set(token, {
      expires,
      ...(isCustomer ? { customerId: user.id } : { userId: user.id }),
    });
    return { token, expires, user: isCustomer ? safeCustomer(user) : user };
  }
  function revoke(customerId) {
    for (const [token, s] of sessions)
      if (s.customerId === customerId) sessions.delete(token);
  }
  function notify(customerId, title, body) {
    const notificationId=id();
    db.notifications.unshift({
      id: notificationId,
      customerId,
      title,
      body,
      createdAt: new Date().toISOString(),
      read: false,
    });
    push.queue(customerId,notificationId);
  }
  function permitted(actor, permission) {
    if (!actor) fail("Sign in to continue.", 401);
    access.requirePermission(actor, permission);
  }
  const staffScope = (actor, item) =>
    actor.id === "owner" ||
    item.assignedTo === actor.id ||
    db.properties.some(
      (p) => p.id === item.property && p.createdBy === actor.id,
    );
  const requestKey = (req) => {
    const key = req.headers["idempotency-key"];
    if (typeof key !== "string" || !/^[\w-]{16,100}$/.test(key))
      fail("A valid request key is required.");
    return key;
  };
  async function handle(req, url, actor, token) {
    const p = url.pathname,
      method = req.method;
    if (!p.startsWith("/api/mobile/")) return null;
    const c = customer(token);
    const needCustomer = () => {
      if (!c) fail("Sign in with your customer account.", 401);
      return c;
    };
    if (p === "/api/mobile/config" && method === "GET")
      return [
        200,
        {
          website,
          phone: "+971543592223",
          whatsapp: "+971509794499",
          about:
            "Holidayzone brings residential listings and rental enquiries together, so you can compare homes and contact the team about the ones that interest you.",
          categories: categories.map(({ slug, label }) => ({ slug, label })),
          passwordResetAvailable: Boolean(process.env.RESET_EMAIL_WEBHOOK),
        },
      ];
    if (p === "/api/mobile/properties" && method === "GET") {
      const q = url.searchParams,
        page = Number(q.get("page") || 1),
        limit = Number(q.get("limit") || 20);
      if (
        !Number.isSafeInteger(page) ||
        page < 1 ||
        !Number.isSafeInteger(limit) ||
        limit < 1 ||
        limit > 50
      )
        fail("Invalid pagination.");
      const period = q.get("period") || "monthly",
        keyword = (q.get("q") || "").toLowerCase();
      if (!["monthly", "yearly"].includes(period))
        fail("Invalid rental period.");
      for (const key of ["min", "max", "bathrooms"])
        if (
          q.has(key) &&
          (!Number.isFinite(Number(q.get(key))) || Number(q.get(key)) < 0)
        )
          fail("Invalid numeric filter.");
      let items = publicProperties().filter((p) => {
        const price = period === "yearly" ? p.yearlyPrice : p.price;
        return (
          price > 0 &&
          (!keyword ||
            [p.name, p.area, p.location, p.reference, p.category, p.description]
              .join(" ")
              .toLowerCase()
              .includes(keyword)) &&
          (!q.get("area") || p.area === q.get("area")) &&
          (!q.get("slug") || p.slug === q.get("slug")) &&
          (!q.has("min") || price >= Number(q.get("min"))) &&
          (!q.has("max") || price <= Number(q.get("max"))) &&
          (!q.has("bathrooms") || p.bathrooms >= Number(q.get("bathrooms"))) &&
          (!q.has("furnished") || String(p.furnished) === q.get("furnished"))
        );
      });
      if (q.get("sort") === "price")
        items.sort(
          (a, b) =>
            (period === "yearly" ? a.yearlyPrice : a.price) -
            (period === "yearly" ? b.yearlyPrice : b.price),
        );
      else
        items.sort((a, b) =>
          (b.updatedAt || "").localeCompare(a.updatedAt || ""),
        );
      return [
        200,
        {
          items: items.slice((page - 1) * limit, page * limit).map(decorate),
          total: items.length,
          page,
          nextPage: page * limit < items.length ? page + 1 : null,
        },
      ];
    }
    if (/^\/api\/mobile\/properties\/[^/]+$/.test(p) && method === "GET")
      return [200, decorate(property(p.split("/").pop()))];
    if (p === "/api/mobile/areas" && method === "GET")
      return [
        200,
        db.areas.map((a) => ({
          ...a,
          count: publicProperties().filter((p) => p.area === a.name).length,
        })),
      ];
    if (p === "/api/mobile/register" && method === "POST") {
      rate(req, "register", 5);
      const d = await parse(req),
        name = text(d.name, 100),
        address = email(d.email);
      if (!name || !validEmail(address) || !validPhone(d.phone || ""))
        fail("Enter your name, email and phone number.");
      const password = await hashPassword(d.password);
      if (db.customers.some((c) => c.email === address))
        fail("An account already exists for this email.", 409);
      const account = {
        id: id(),
        name,
        email: address,
        phone: text(d.phone, 25),
        active: true,
        notifications: true,
        createdAt: new Date().toISOString(),
        ...password,
      };
      db.customers.push(account);
      await save();
      return [201, issue(account, true)];
    }
    if (p === "/api/mobile/login" && method === "POST") {
      rate(req, "mobile-login", 10);
      const d = await parse(req);
      if (d.staff === true) {
        const user = access.login(d.email, d.password);
        if (!user) fail("Incorrect login details.", 401);
        access.record(user, "login", "session", user.id, "Mobile sign in");
        await save();
        return [200, issue(user, false)];
      }
      const account = db.customers.find(
        (c) => c.email === email(d.email) && c.active,
      );
      const hash = Buffer.from(
        await derive(
          typeof d.password === "string" ? d.password.slice(0, 200) : "",
          account?.salt || "invalid-account",
          64,
        ),
      );
      if (!account || !timingSafeEqual(hash, Buffer.from(account.hash, "hex")))
        fail("Incorrect login details.", 401);
      return [200, issue(account, true)];
    }
    if (p === "/api/mobile/session" && method === "GET")
      return [200, { user: c ? safeCustomer(c) : actor || null }];
    if (p === "/api/mobile/logout" && method === "POST") {
      sessions.delete(token);
      return [200, { ok: true }];
    }
    if(p==='/api/mobile/push-device' && ['POST','DELETE'].includes(method)) {
      needCustomer();const d=await parse(req);
      if(typeof d.token!=='string'||! /^(Expo|Exponent)PushToken\[[\w-]{10,200}\]$/.test(d.token))fail('Invalid notification device.');
      if(method==='DELETE')db.pushDevices=db.pushDevices.filter(device=>!(device.token===d.token&&device.customerId===c.id));
      else {db.pushDevices=db.pushDevices.filter(device=>device.token!==d.token);db.pushDevices.push({token:d.token,customerId:c.id,updatedAt:new Date().toISOString()});}
      await save();return [200,{ok:true}];
    }
    if (p === "/api/mobile/forgot-password" && method === "POST") {
      rate(req, "reset", 5);
      const d = await parse(req);
      if (!process.env.RESET_EMAIL_WEBHOOK)
        fail(
          "Password recovery is not configured. Please contact the team.",
          503,
        );
      const account = db.customers.find(
        (c) => c.email === email(d.email) && c.active,
      );
      if (account) {
        const secret = randomBytes(32).toString("hex");
        const endpoint = new URL(process.env.RESET_EMAIL_WEBHOOK);
        if (endpoint.protocol !== "https:")
          fail("Password recovery is unavailable.", 503);
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.RESET_EMAIL_TOKEN || ""}`,
          },
          body: JSON.stringify({
            email: account.email,
            resetUrl: `holidayzone://reset-password?token=${secret}`,
          }),
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok)
          fail("Password recovery is temporarily unavailable.", 503);
        db.passwordResets = db.passwordResets.filter(
          (r) => r.customerId !== account.id && r.expires > Date.now(),
        );
        db.passwordResets.push({
          hash: digest(secret),
          customerId: account.id,
          expires: Date.now() + 1800000,
        });
        await save();
      }
      return [
        200,
        {
          ok: true,
          message: "If an account exists, a reset link has been sent.",
        },
      ];
    }
    if (p === "/api/mobile/reset-password" && method === "POST") {
      rate(req, "reset-confirm", 10);
      const d = await parse(req),
        reset = db.passwordResets.find(
          (r) =>
            r.hash === digest(text(d.token, 100)) && r.expires > Date.now(),
        );
      if (!reset) fail("This reset link is invalid or expired.");
      const password = await hashPassword(d.password);
      if (!db.passwordResets.includes(reset))
        fail("This reset link has already been used.");
      const account = db.customers.find(
        (c) => c.id === reset.customerId && c.active,
      );
      if (!account) fail("This reset link is invalid.");
      Object.assign(account, password);
      db.passwordResets = db.passwordResets.filter(
        (r) => r.customerId !== account.id,
      );
      revoke(account.id);
      await save();
      return [200, { ok: true }];
    }
    if (p === "/api/mobile/profile") {
      needCustomer();
      if (method === "GET") return [200, safeCustomer(c)];
      if (method === "POST") {
        const d = await parse(req);
        if (
          !text(d.name, 100) ||
          !validPhone(d.phone || "") ||
          typeof d.notifications !== "boolean"
        )
          fail("Enter a name, phone and notification preference.");
        Object.assign(c, {
          name: text(d.name, 100),
          phone: text(d.phone, 25),
          notifications: d.notifications,
        });
        await save();
        return [200, safeCustomer(c)];
      }
      if (method === "DELETE") {
        c.deletionRequestedAt = new Date().toISOString();
        c.active = false;
        revoke(c.id);
        await save();
        return [200, { ok: true }];
      }
    }
    if (p === "/api/mobile/favorites") {
      needCustomer();
      if (method === "GET")
        return [
          200,
          publicProperties()
            .filter((p) =>
              db.favorites.some(
                (f) => f.customerId === c.id && f.property === p.id,
              ),
            )
            .map(decorate),
        ];
      if (["POST", "DELETE"].includes(method)) {
        const d = await parse(req);
        if (method === "POST") property(d.property);
        db.favorites = db.favorites.filter(
          (f) => !(f.customerId === c.id && f.property === d.property),
        );
        if (method === "POST")
          db.favorites.push({ customerId: c.id, property: d.property });
        await save();
        return [200, { ok: true }];
      }
    }
    if (["/api/mobile/inquiries", "/api/mobile/viewings"].includes(p)) {
      needCustomer();
      const viewing = p.endsWith("viewings"),
        records = viewing ? db.viewings : db.enquiries;
      if (method === "GET")
        return [200, records.filter((r) => r.customerId === c.id)];
      if (method === "POST") {
        rate(req, "customer-request", 30);
        const d = await parse(req),
          key = requestKey(req);
        const existing = records.find(
          (r) => r.customerId === c.id && r.requestKey === key,
        );
        if (existing) return [200, existing];
        const home = property(d.property);
        if (!text(d.message, 2000)) fail("Add a message for the team.");
        if (
          viewing &&
          !validViewingTime(d.scheduledAt)
        )
          fail(
            "Choose a UAE viewing time at least one hour ahead and within 90 days.",
          );
        if (
          viewing &&
          home.availableFrom &&
          d.scheduledAt.slice(0, 10) < home.availableFrom
        )
          fail("This property is not available on that date.");
        if (
          viewing &&
          db.viewings.some(
            (r) =>
              r.customerId === c.id &&
              r.property === home.id &&
              r.scheduledAt === d.scheduledAt &&
              !["cancelled", "rejected"].includes(r.status),
          )
        )
          fail("You already requested this viewing.", 409);
        const record = {
          id: id(),
          customerId: c.id,
          property: home.id,
          propertyName: home.name,
          name: c.name,
          email: c.email,
          phone: c.phone,
          message: text(d.message, 2000),
          source: "mobile_app",
          status: viewing ? "pending" : "new",
          assignedTo: home.createdBy || "owner",
          created: new Date().toISOString(),
          requestKey: key,
          ...(viewing
            ? { scheduledAt: d.scheduledAt }
            : { date: new Date().toISOString().slice(0, 10) }),
        };
        records.unshift(record);
        await save();
        return [201, record];
      }
    }
    if (
      /^\/api\/mobile\/viewings\/[^/]+\/cancel$/.test(p) &&
      method === "POST"
    ) {
      needCustomer();
      const record = db.viewings.find(
        (r) => r.id === p.split("/")[4] && r.customerId === c.id,
      );
      if (!record) fail("Viewing not found.", 404);
      if (["completed", "rejected", "cancelled"].includes(record.status))
        fail("This viewing is already closed.", 409);
      record.status = "cancelled";
      await save();
      return [200, record];
    }
    if (p === "/api/mobile/notifications" && method === "GET") {
      needCustomer();
      return [
        200,
        db.notifications.filter((n) => n.customerId === c.id).slice(0, 100),
      ];
    }
    if(/^\/api\/mobile\/notifications\/[^/]+\/read$/.test(p)&&method==='POST') {needCustomer();const n=db.notifications.find(n=>n.id===p.split('/')[4]&&n.customerId===c.id);if(!n)fail('Notification not found.',404);n.read=true;await save();return [200,{ok:true}];}
    if (p === "/api/mobile/admin/dashboard" && method === "GET") {
      permitted(actor, "enquiries.view");
      const properties = db.properties.filter(
        (p) => actor.id === "owner" || p.createdBy === actor.id,
      );
      return [
        200,
        {
          properties: properties.length,
          published: properties.filter((p) => !p.hidden).length,
          drafts: properties.filter((p) => p.hidden).length,
          inquiries: db.enquiries.filter(
            (r) => staffScope(actor, r) && (!r.status || r.status === "new"),
          ).length,
          pending: db.viewings.filter(
            (r) => staffScope(actor, r) && r.status === "pending",
          ).length,
        },
      ];
    }
    if (/^\/api\/mobile\/admin\/(inquiries|viewings)(\/[^/]+)?$/.test(p)) {
      const viewing = p.split("/")[4] === "viewings",
        records = viewing ? db.viewings : db.enquiries;
      permitted(actor, method === "GET" ? "enquiries.view" : "requests.manage");
      if (method === "GET")
        return [200, records.filter((r) => staffScope(actor, r))];
      if (method === "POST") {
        const d = await parse(req),
          record = records.find(
            (r) => r.id === p.split("/")[5] && staffScope(actor, r),
          );
        if (!record) fail("Request not found.", 404);
        const statuses = viewing
          ? [
              "pending",
              "confirmed",
              "reschedule_requested",
              "completed",
              "cancelled",
              "rejected",
            ]
          : ["new", "contacted", "follow_up", "qualified", "closed"];
        if (!statuses.includes(d.status)) fail("Invalid status.");
        if (
          viewing &&
          ["completed", "cancelled", "rejected"].includes(record.status)
        )
          fail("This viewing is already closed.", 409);
        if (d.assignedTo && actor.id !== "owner")
          fail("Only the owner can assign requests.", 403);
        if (d.assignedTo && !access.resolve(d.assignedTo))
          fail("Select an active employee.");
        if (
          d.scheduledAt &&
          (!viewing || !validViewingTime(d.scheduledAt))
        )
          fail("Select a future viewing time.");
        if(viewing&&['confirmed','reschedule_requested'].includes(d.status)) {
          const home=property(record.property), nextTime=d.scheduledAt||record.scheduledAt;
          if(!validViewingTime(nextTime))fail('Choose a future viewing time within 90 days.');
          if(home.availableFrom&&nextTime.slice(0,10)<home.availableFrom)fail('The property is not available on that date.');
          if(db.viewings.some(r=>r.id!==record.id&&r.property===record.property&&r.scheduledAt===nextTime&&r.status==='confirmed'))fail('This viewing slot is already confirmed for another customer.',409);
        }
        const before = structuredClone(record);
        record.status = d.status;
        if (d.assignedTo) record.assignedTo = d.assignedTo;
        if (d.scheduledAt) record.scheduledAt = d.scheduledAt;
        record.updatedAt = new Date().toISOString();
        access.record(
          actor,
          "update",
          viewing ? "viewing" : "enquiry",
          record.id,
          record.propertyName || record.name,
          before,
          record,
        );
        if (record.customerId)
          notify(
            record.customerId,
            viewing ? "Viewing updated" : "Inquiry updated",
            `${record.propertyName}: ${record.status.replaceAll("_", " ")}`,
          );
        await save();
        return [200, record];
      }
    }
    return [404, { error: "Not found." }];
  }
  return { handle, customer };
}
