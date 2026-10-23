import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

test("mobile and website share inventory; customer data and staff actions enforce authorization", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "holidayzone-mobile-"));
  const child = spawn(
    process.execPath,
    [fileURLToPath(new URL("../server.mjs", import.meta.url))],
    {
      cwd: tmp,
      env: {
        ...process.env,
        PORT: "0",
        HOST: "127.0.0.1",
        ADMIN_USERNAME: "owner",
        ADMIN_PASSWORD: "TestOnlyPassword!42",
        NODE_ENV: "test",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let base;
  try {
    base = await new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Server startup timed out")),
        15000,
      );
      child.stdout.on("data", (chunk) => {
        const match = String(chunk).match(/http:\/\/localhost:(\d+)/);
        if (match) {
          clearTimeout(timeout);
          resolve("http://127.0.0.1:" + match[1]);
        }
      });
      child.on("error", reject);
    });
    const call = async (endpoint, method = "GET", body, token, key) => {
      const r = await fetch(base + "/api" + endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: "Bearer " + token } : {}),
          ...(key ? { "Idempotency-Key": key } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return { status: r.status, data: await r.json() };
    };
    assert.equal(
      (await call("/mobile/properties")).data.total,
      0,
      "sample listings never appear in mobile inventory",
    );
    assert.equal((await call("/mobile/properties?limit=999")).status, 400);
    const owner = (
      await call("/mobile/login", "POST", {
        staff: true,
        email: "owner",
        password: "TestOnlyPassword!42",
      })
    ).data.token;
    assert(owner);
    const home = {
      name: "Integration test home",
      slug: "1-bhk",
      area: "Muwaileh",
      location: "Muwaileh, Sharjah",
      rentalPeriod: "monthly",
      price: 3500,
      yearlyPrice: 0,
      bathrooms: 2,
      size: "800 sq ft",
      description: "An isolated test property.",
      furnished: true,
      images: ["/assets/studio.webp"],
      hidden: false,
    };
    const created = await call("/properties", "POST", home, owner);
    assert.equal(created.status, 200);
    const property = created.data;
    const website = (await call("/properties")).data.find(
      (p) => p.id === property.id,
    );
    assert.equal(website.price, 3500);
    assert.equal(
      (await call("/mobile/properties?q=Integration&max=3600")).data.items[0]
        .id,
      property.id,
    );
    assert.equal(
      (await call("/mobile/properties/" + property.id)).data.canonicalUrl,
      "https://holidayzone.online/property/" + property.id,
    );
    await call("/properties", "POST", { ...property, price: 3750 }, owner);
    assert.equal(
      (await call("/mobile/properties/" + property.id)).data.price,
      3750,
      "website edits reach mobile",
    );
    assert.equal(
      (
        await call(
          "/properties",
          "POST",
          { ...property, price: 3800, expectedUpdatedAt: property.updatedAt },
          owner,
        )
      ).status,
      409,
      "stale edits fail",
    );
    const account = {
      name: "Test Customer",
      email: "customer@example.test",
      phone: "+971501234567",
      password: "CustomerTestPassword!42",
      roleId: "owner",
      permissions: ["users.manage"],
    };
    const registered = await call("/mobile/register", "POST", account);
    assert.equal(registered.status, 201);
    assert.equal(registered.data.user.roleId, "customer");
    assert.deepEqual(registered.data.user.permissions, []);
    const customer = registered.data.token;
    assert.equal(
      (await call("/properties", "POST", home, customer)).status,
      401,
    );
    assert.equal(
      (await call("/mobile/session", "GET", undefined, customer)).data.user
        .email,
      account.email,
    );
    assert.equal(
      (
        await call(
          "/mobile/favorites",
          "POST",
          { property: property.id },
          customer,
        )
      ).status,
      200,
    );
    const secondLogin = (await call("/mobile/login", "POST", account)).data
      .token;
    assert.equal(
      (await call("/mobile/favorites", "GET", undefined, secondLogin)).data[0]
        .id,
      property.id,
    );
    const other = (
      await call("/mobile/register", "POST", {
        ...account,
        email: "other@example.test",
      })
    ).data.token;
    assert.deepEqual(
      (await call("/mobile/favorites", "GET", undefined, other)).data,
      [],
    );
    const inquiry = {
      property: property.id,
      message: "Can I arrange a viewing?",
    };
    const first = await call(
      "/mobile/inquiries",
      "POST",
      inquiry,
      customer,
      "inquiry-key-123456789",
    );
    assert.equal(first.status, 201);
    assert.equal(
      (
        await call(
          "/mobile/inquiries",
          "POST",
          inquiry,
          customer,
          "inquiry-key-123456789",
        )
      ).data.id,
      first.data.id,
    );
    assert(
      (await call("/enquiries", "GET", undefined, owner)).data.some(
        (r) => r.id === first.data.id,
      ),
      "mobile inquiry visible in website dashboard",
    );
    const date = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
      request = { ...inquiry, scheduledAt: date + "T14:00:00+04:00" };
    assert.equal(
      (
        await call(
          "/mobile/viewings",
          "POST",
          { ...request, scheduledAt: "2000-01-01T14:00:00+04:00" },
          customer,
          "past-booking-1234567",
        )
      ).status,
      400,
    );
    const booking = await call(
      "/mobile/viewings",
      "POST",
      request,
      customer,
      "viewing-key-123456789",
    );
    assert.equal(booking.status, 201);
    assert.equal(
      (
        await call(
          "/mobile/viewings",
          "POST",
          request,
          customer,
          "viewing-key-123456789",
        )
      ).data.id,
      booking.data.id,
    );
    assert.equal(
      (
        await call(
          "/mobile/viewings/" + booking.data.id + "/cancel",
          "POST",
          {},
          other,
        )
      ).status,
      404,
    );
    assert.equal(
      (
        await call(
          "/mobile/admin/viewings/" + booking.data.id,
          "POST",
          { status: "confirmed" },
          owner,
        )
      ).status,
      200,
    );
    assert.equal(
      (await call("/mobile/viewings", "GET", undefined, customer)).data[0]
        .status,
      "confirmed",
    );
    assert.equal(
      (await call("/mobile/notifications", "GET", undefined, customer)).data
        .length,
      1,
    );
    const employee = (
      await call(
        "/users",
        "POST",
        {
          name: "Test Editor",
          username: "editor",
          password: "EmployeePassword!42",
          roleId: "editor",
        },
        owner,
      )
    ).data;
    const employeeToken = (
      await call("/mobile/login", "POST", {
        email: "editor",
        password: "EmployeePassword!42",
        staff: true,
      })
    ).data.token;
    assert.equal(
      (
        await call(
          "/properties/" + property.id,
          "DELETE",
          undefined,
          employeeToken,
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await call(
          "/properties",
          "POST",
          { ...property, price: 1 },
          employeeToken,
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await call(
          "/users",
          "POST",
          { ...employee, roleId: "manager" },
          employeeToken,
        )
      ).status,
      403,
    );
    await call("/users", "POST", { ...employee, active: false }, owner);
    assert.equal(
      (await call("/mobile/session", "GET", undefined, employeeToken)).data
        .user,
      null,
    );
    await call(
      "/properties/" + property.id + "/visibility",
      "POST",
      { hidden: true },
      owner,
    );
    assert.equal((await call("/mobile/properties/" + property.id)).status, 404);
    assert(!(await call("/properties")).data.some((p) => p.id === property.id));
    await call("/mobile/logout", "POST", {}, customer);
    assert.equal(
      (await call("/mobile/favorites", "GET", undefined, customer)).status,
      401,
    );
    const stored = JSON.parse(
      await fs.readFile(path.join(tmp, ".local", "database.json"), "utf8"),
    );
    assert.equal(stored.customers.length, 2);
    assert.equal(stored.viewings.length, 1);
    assert.equal(
      stored.properties.filter((p) => p.id === property.id).length,
      1,
    );
    assert(
      !JSON.stringify(stored).includes(account.password),
      "password is not stored in plaintext",
    );
  } finally {
    if (child.exitCode === null) {
      const stopped = new Promise((resolve) => child.once("exit", resolve));
      child.kill();
      await stopped;
    }
    // The OS temporary directory is retained for failure diagnosis; never touches live data.
  }
});
