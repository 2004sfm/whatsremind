import { Elysia, t } from "elysia";
import { db, schema } from "../db";
import { eq, desc, and } from "drizzle-orm";
import { gowaConfig, ensureGowaStarted } from "../supervisor/gowa";

interface VerifyResult {
  valid: boolean;
  error?: string;
  verifiedName?: string;
  displayPhoneNumber?: string;
  wabaId?: string;
}

export async function verifyChannelCredentials(
  engine: string,
  credentials: Record<string, unknown> | string,
  phoneNumber?: string
): Promise<VerifyResult> {
  let creds: Record<string, unknown> = {};
  try {
    creds = typeof credentials === "string" ? JSON.parse(credentials || "{}") : credentials;
  } catch {
    return { valid: false, error: "Formato de credenciales inválido (no es JSON válido)." };
  }

  if (engine === "meta") {
    const token = String(creds.token || "").trim();
    const phoneId = String(creds.phoneId || "").trim();

    if (!token) {
      return { valid: false, error: "El Token de acceso de Meta es obligatorio." };
    }
    if (!phoneId) {
      return { valid: false, error: "El Phone ID de Meta es obligatorio." };
    }

    try {
      const url = `https://graph.facebook.com/v21.0/${phoneId}?fields=id,display_phone_number,verified_name,quality_rating,whatsapp_business_account`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: { message?: string; code?: number; error_subcode?: number };
        } | null;
        const msg = data?.error?.message || `HTTP ${res.status}`;
        return { valid: false, error: `Meta API: Credenciales inválidas (${msg})` };
      }

      const data = (await res.json()) as {
        display_phone_number?: string;
        verified_name?: string;
        whatsapp_business_account?: { id?: string };
      };
      return {
        valid: true,
        displayPhoneNumber: data.display_phone_number,
        verifiedName: data.verified_name,
        wabaId: data.whatsapp_business_account?.id || (typeof creds.wabaId === "string" ? creds.wabaId : undefined),
      };
    } catch (err: unknown) {
      const detail = err instanceof Error ? err.message : "Error de red al conectar con Meta";
      return { valid: false, error: `Conexión con Meta fallida: ${detail}` };
    }
  }

  if (engine === "ycloud") {
    const apiKey = String(creds.apiKey || "").trim();
    const fromPhone = String(creds.from || phoneNumber || "").trim();

    if (!apiKey) {
      return { valid: false, error: "La Clave de API (API Key) de YCloud es obligatoria." };
    }

    try {
      const url = "https://api.ycloud.com/v2/whatsapp/phoneNumbers";
      const res = await fetch(url, {
        headers: { "X-API-Key": apiKey },
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: { message?: string };
          message?: string;
        } | null;
        const msg = data?.error?.message || data?.message || `HTTP ${res.status}`;
        return { valid: false, error: `YCloud API: Clave de API inválida (${msg})` };
      }

      const data = (await res.json()) as {
        items?: Array<{
          phoneNumber?: string;
          status?: string;
          wabaId?: string;
          verifiedName?: string;
          displayPhoneNumber?: string;
        }>;
      };
      const items = Array.isArray(data.items) ? data.items : [];

      if (fromPhone && items.length > 0) {
        const cleanFrom = fromPhone.replace(/\D/g, "");
        const matched = items.find((item) => {
          const cleanItem = String(item.phoneNumber || "").replace(/\D/g, "");
          return cleanItem === cleanFrom;
        });

        if (!matched) {
          const available = items.map((i) => i.phoneNumber).filter(Boolean).join(", ");
          return {
            valid: false,
            error: `El número ${fromPhone} no está registrado en tu cuenta de YCloud. Números registrados disponibles: ${available}`,
          };
        }

        return {
          valid: true,
          displayPhoneNumber: matched.displayPhoneNumber || matched.phoneNumber,
          verifiedName: matched.verifiedName,
          wabaId: matched.wabaId,
        };
      }

      return { valid: true };
    } catch (err: unknown) {
      const detail = err instanceof Error ? err.message : "Error de red al conectar con YCloud";
      return { valid: false, error: `Conexión con YCloud fallida: ${detail}` };
    }
  }

  // Unofficial engine (GOWA) operates with local device pairing
  return { valid: true };
}

async function syncAppConfig(engine: string, credentialsStr: string, fallbackPhone: string) {
  try {
    const creds = JSON.parse(credentialsStr || "{}");
    const now = new Date();
    if (engine === "meta") {
      await db
        .update(schema.appConfig)
        .set({
          metaToken: String(creds.token || ""),
          metaPhoneId: String(creds.phoneId || ""),
          updatedAt: now,
        })
        .where(eq(schema.appConfig.id, 1));
    } else if (engine === "ycloud") {
      await db
        .update(schema.appConfig)
        .set({
          ycloudApiKey: String(creds.apiKey || ""),
          ycloudPhone: String(creds.from || fallbackPhone || ""),
          updatedAt: now,
        })
        .where(eq(schema.appConfig.id, 1));
    }
  } catch {
    // Non-critical background sync
  }
}

async function clearAppConfigEngine(engine: string) {
  try {
    const now = new Date();
    if (engine === "meta") {
      await db
        .update(schema.appConfig)
        .set({ metaToken: null, metaPhoneId: null, updatedAt: now })
        .where(eq(schema.appConfig.id, 1));
    } else if (engine === "ycloud") {
      await db
        .update(schema.appConfig)
        .set({ ycloudApiKey: null, ycloudPhone: null, updatedAt: now })
        .where(eq(schema.appConfig.id, 1));
    }
  } catch {
    // Non-critical background sync
  }
}

export const channelsRoutes = new Elysia({ prefix: "/api/channels" })
  .get(
    "/",
    async ({ query }) => {
      const { engine } = query;
      const where = engine ? eq(schema.channels.engine, engine) : undefined;
      const allChannels = await db.query.channels.findMany({
        where,
        orderBy: [desc(schema.channels.id)],
      });

      const hasUnofficial = allChannels.some((ch) => ch.engine === "unofficial");
      let gowaDevices: Array<{ id: string; state?: string; jid?: string }> = [];

      if (!engine || engine === "unofficial" || hasUnofficial) {
        try {
          await ensureGowaStarted();
          const authHeader = `Basic ${Buffer.from(gowaConfig.auth).toString("base64")}`;
          const listRes = await fetch(`${gowaConfig.baseUrl}/devices`, {
            headers: { Authorization: authHeader },
            signal: AbortSignal.timeout(2000),
          });
          if (listRes.ok) {
            const listData = (await listRes.json()) as {
              results?: Array<{ id: string; state?: string; jid?: string }>;
            };
            gowaDevices = listData.results || [];

            // Prune disconnected orphan devices in GOWA not assigned to any channel
            const registeredDeviceIds = new Set(
              allChannels
                .map((c) => {
                  try {
                    return JSON.parse(c.credentials || "{}").deviceId;
                  } catch {
                    return null;
                  }
                })
                .filter(Boolean)
            );

            for (const d of gowaDevices) {
              if (d.state === "disconnected" && !registeredDeviceIds.has(d.id)) {
                fetch(`${gowaConfig.baseUrl}/devices/${d.id}`, {
                  method: "DELETE",
                  headers: { Authorization: authHeader },
                }).catch(() => null);
              }
            }

            // Auto-heal / Auto-import:
            // If GOWA has an active logged-in device that doesn't exist in allChannels, import it!
            for (const dev of gowaDevices) {
              if ((dev.state === "logged_in" || dev.state === "connected") && dev.jid) {
                const devDigits = dev.jid.split("@")[0].split(":")[0].replace(/\D/g, "");
                if (!devDigits) continue;
                const existingChannel = allChannels.find((ch) => {
                  if (ch.engine !== "unofficial") return false;
                  return ch.phoneNumber.replace(/\D/g, "") === devDigits;
                });
                if (!existingChannel) {
                  const now = new Date();
                  const existingUnofficial = allChannels.filter((c) => c.engine === "unofficial");
                  const shouldBeActive = existingUnofficial.length === 0 ? 1 : 0;
                  const [inserted] = await db
                    .insert(schema.channels)
                    .values({
                      engine: "unofficial",
                      phoneNumber: `+${devDigits}`,
                      displayName: "WhatsApp Web",
                      status: "connected",
                      credentials: JSON.stringify({ deviceId: dev.id }),
                      isActive: shouldBeActive,
                      createdAt: now,
                      updatedAt: now,
                    })
                    .returning();
                  if (inserted) {
                    if (!engine || engine === "unofficial") {
                      allChannels.unshift(inserted);
                    }
                    if (shouldBeActive === 1) {
                      await syncAppConfig("unofficial", inserted.credentials, inserted.phoneNumber);
                    }
                  }
                }
              }
            }
          }
        } catch {
          // GOWA service unreachable or starting
        }
      }

      const syncPromises = allChannels.map(async (ch) => {
        if (ch.engine !== "unofficial") {
          return ch;
        }

        try {
          let creds: Record<string, unknown> = {};
          try {
            creds = JSON.parse(ch.credentials || "{}");
          } catch {
            creds = {};
          }
          const currentDeviceId = typeof creds.deviceId === "string" ? creds.deviceId : null;
          const chDigits = ch.phoneNumber.replace(/\D/g, "");

          // 1. First priority: match by phone number in JID of any connected GOWA device
          const matchingDeviceByJid = gowaDevices.find((d) => {
            if (!d.jid) return false;
            const jidDigits = d.jid.split("@")[0].split(":")[0].replace(/\D/g, "");
            return jidDigits === chDigits && (d.state === "logged_in" || d.state === "connected");
          });

          if (matchingDeviceByJid) {
            let shouldUpdateDb = false;
            if (currentDeviceId !== matchingDeviceByJid.id) {
              creds.deviceId = matchingDeviceByJid.id;
              ch.credentials = JSON.stringify(creds);
              shouldUpdateDb = true;
            }
            if (ch.status !== "connected") {
              ch.status = "connected";
              shouldUpdateDb = true;
            }
            if (shouldUpdateDb) {
              await db
                .update(schema.channels)
                .set({
                  credentials: ch.credentials,
                  status: "connected",
                  updatedAt: new Date(),
                })
                .where(eq(schema.channels.id, ch.id));

              if (ch.isActive === 1) {
                await syncAppConfig(ch.engine, ch.credentials, ch.phoneNumber);
              }
            }
            return ch;
          }

          // 2. Second priority: match by device ID in gowaDevices
          const matchingDeviceById = currentDeviceId
            ? gowaDevices.find((d) => d.id === currentDeviceId)
            : null;

          const isConnected = Boolean(
            matchingDeviceById &&
              (matchingDeviceById.state === "logged_in" || matchingDeviceById.state === "connected")
          );

          const expectedStatus = isConnected ? "connected" : "disconnected";
          if (ch.status !== expectedStatus) {
            await db
              .update(schema.channels)
              .set({ status: expectedStatus, updatedAt: new Date() })
              .where(eq(schema.channels.id, ch.id));
            ch.status = expectedStatus;
          }
        } catch {
          // If GOWA service is unreachable, mark as disconnected if it was marked connected
          if (ch.status !== "disconnected") {
            await db
              .update(schema.channels)
              .set({ status: "disconnected", updatedAt: new Date() })
              .where(eq(schema.channels.id, ch.id));
            ch.status = "disconnected";
          }
        }
        return ch;
      });

      return await Promise.all(syncPromises);
    },
    {
      query: t.Object({
        engine: t.Optional(t.String()),
      }),
    }
  )
  .post(
    "/verify",
    async ({ body, set }) => {
      const { engine, credentials, phoneNumber } = body;
      const verification = await verifyChannelCredentials(engine, credentials, phoneNumber);
      if (!verification.valid) {
        set.status = 400;
        return { success: false, error: verification.error };
      }
      return { success: true, ...verification };
    },
    {
      body: t.Object({
        engine: t.String(),
        credentials: t.Union([t.String(), t.Record(t.String(), t.Unknown())]),
        phoneNumber: t.Optional(t.String()),
      }),
    }
  )
  .post(
    "/",
    async ({ body, set }) => {
      const { engine, phoneNumber, displayName, credentials, status } = body;

      const verification = await verifyChannelCredentials(engine, credentials, phoneNumber);
      if (!verification.valid) {
        set.status = 400;
        return { success: false, error: verification.error };
      }

      let parsedCreds: Record<string, unknown> = {};
      try {
        parsedCreds = typeof credentials === "object" ? { ...credentials } : JSON.parse(credentials ?? "{}");
      } catch {
        parsedCreds = {};
      }
      if (verification.wabaId && !parsedCreds.wabaId) {
        parsedCreds.wabaId = verification.wabaId;
      }
      const credentialsStr = JSON.stringify(parsedCreds);

      // Check if a channel with the same engine and phoneNumber already exists (upsert / reconnect flow)
      const newDigits = phoneNumber.replace(/\D/g, "");
      const existingSameEngine = await db.query.channels.findMany({
        where: eq(schema.channels.engine, engine),
      });
      const existingSamePhone = newDigits
        ? existingSameEngine.find((c) => c.phoneNumber.replace(/\D/g, "") === newDigits)
        : existingSameEngine.find((c) => c.phoneNumber === phoneNumber);

      if (existingSamePhone) {
        // If unofficial engine, clean up the old GOWA device slot if it differs
        if (engine === "unofficial") {
          try {
            const oldCreds = JSON.parse(existingSamePhone.credentials || "{}");
            const newCreds = JSON.parse(credentialsStr);
            if (oldCreds.deviceId && newCreds.deviceId && oldCreds.deviceId !== newCreds.deviceId) {
              await ensureGowaStarted();
              const authHeader = `Basic ${Buffer.from(gowaConfig.auth).toString("base64")}`;
              await fetch(`${gowaConfig.baseUrl}/devices/${encodeURIComponent(oldCreds.deviceId)}`, {
                method: "DELETE",
                headers: { Authorization: authHeader },
                signal: AbortSignal.timeout(2000),
              }).catch(() => null);
            }
          } catch {
            // ignore cleanup errors
          }
        }

        const now = new Date();
        const [updated] = await db
          .update(schema.channels)
          .set({
            credentials: credentialsStr,
            displayName: displayName || existingSamePhone.displayName || verification.verifiedName || null,
            status: status || "connected",
            updatedAt: now,
          })
          .where(eq(schema.channels.id, existingSamePhone.id))
          .returning();

        if (existingSamePhone.isActive === 1) {
          await syncAppConfig(engine, credentialsStr, phoneNumber);
        }

        set.status = 200;
        return { ...updated, success: true, channel: updated };
      }

      const existingAny = await db.query.channels.findFirst({
        where: eq(schema.channels.engine, engine),
      });
      const isActive = existingAny ? 0 : 1;

      const now = new Date();
      const [inserted] = await db
        .insert(schema.channels)
        .values({
          engine,
          phoneNumber,
          displayName: displayName || verification.verifiedName || null,
          credentials: credentialsStr,
          isActive,
          status: status || "connected",
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      if (isActive === 1) {
        await syncAppConfig(engine, credentialsStr, phoneNumber);
      }

      set.status = 201;
      return { ...inserted, success: true, channel: inserted };
    },
    {
      body: t.Object({
        engine: t.String(),
        phoneNumber: t.String(),
        displayName: t.Optional(t.String()),
        credentials: t.Union([t.String(), t.Record(t.String(), t.Unknown())]),
        status: t.Optional(t.String()),
      }),
    }
  )
  .post(
    "/:id/activate",
    async ({ params, set }) => {
      const id = Number(params.id);
      const target = await db.query.channels.findFirst({
        where: eq(schema.channels.id, id),
      });
      if (!target) {
        set.status = 404;
        return { success: false, error: "Canal no encontrado" };
      }

      await db
        .update(schema.channels)
        .set({ isActive: 0, updatedAt: new Date() })
        .where(eq(schema.channels.engine, target.engine));

      const [activated] = await db
        .update(schema.channels)
        .set({ isActive: 1, updatedAt: new Date() })
        .where(eq(schema.channels.id, id))
        .returning();

      await syncAppConfig(target.engine, activated.credentials, activated.phoneNumber);

      return { ...activated, success: true, channel: activated };
    },
    {
      params: t.Object({ id: t.Numeric() }),
    }
  )
  .delete(
    "/:id",
    async ({ params, set }) => {
      const id = Number(params.id);
      const target = await db.query.channels.findFirst({
        where: eq(schema.channels.id, id),
      });
      if (!target) {
        set.status = 404;
        return { success: false, error: "Canal no encontrado" };
      }

      // If unofficial engine, clean up device and session in GOWA
      if (target.engine === "unofficial") {
        try {
          const creds = JSON.parse(target.credentials || "{}");
          const deviceId = typeof creds.deviceId === "string" ? creds.deviceId : null;
          if (deviceId) {
            await ensureGowaStarted();
            const authHeader = `Basic ${Buffer.from(gowaConfig.auth).toString("base64")}`;
            // GOWA logout endpoint is GET /app/logout?device_id=... (POST returns 405 Method Not Allowed)
            await fetch(
              `${gowaConfig.baseUrl}/app/logout?device_id=${encodeURIComponent(deviceId)}`,
              {
                method: "GET",
                headers: { Authorization: authHeader },
                signal: AbortSignal.timeout(3500),
              }
            ).catch(() => null);

            await fetch(
              `${gowaConfig.baseUrl}/devices/${encodeURIComponent(deviceId)}`,
              {
                method: "DELETE",
                headers: { Authorization: authHeader },
                signal: AbortSignal.timeout(3500),
              }
            ).catch(() => null);
          }
        } catch {
          // Ignore GOWA delete failure on channel removal
        }
      }

      await db.delete(schema.channels).where(eq(schema.channels.id, id));

      let newlyActivated = null;
      if (target.isActive === 1) {
        const remaining = await db.query.channels.findFirst({
          where: eq(schema.channels.engine, target.engine),
          orderBy: [desc(schema.channels.id)],
        });
        if (remaining) {
          const [act] = await db
            .update(schema.channels)
            .set({ isActive: 1, updatedAt: new Date() })
            .where(eq(schema.channels.id, remaining.id))
            .returning();
          newlyActivated = act;
          await syncAppConfig(target.engine, act.credentials, act.phoneNumber);
        } else {
          await clearAppConfigEngine(target.engine);
        }
      }

      return { success: true, message: "Canal eliminado correctamente", activatedChannel: newlyActivated };
    },
    {
      params: t.Object({ id: t.Numeric() }),
    }
  )
  .put(
    "/:id",
    async ({ params, body, set }) => {
      const id = Number(params.id);
      const target = await db.query.channels.findFirst({
        where: eq(schema.channels.id, id),
      });
      if (!target) {
        set.status = 404;
        return { success: false, error: "Canal no encontrado" };
      }

      const shouldVerify =
        body.credentials !== undefined ||
        (body.phoneNumber !== undefined && body.phoneNumber.trim() !== target.phoneNumber.trim());

      const updates: Partial<typeof schema.channels.$inferInsert> = { updatedAt: new Date() };

      if (shouldVerify) {
        const credsToVerify = body.credentials !== undefined ? body.credentials : target.credentials;
        const phoneToVerify = body.phoneNumber !== undefined ? body.phoneNumber : target.phoneNumber;
        const verification = await verifyChannelCredentials(target.engine, credsToVerify, phoneToVerify);
        if (!verification.valid) {
          set.status = 400;
          return { success: false, error: verification.error };
        }
        updates.status = "connected";
        if (verification.displayPhoneNumber) {
          updates.phoneNumber = verification.displayPhoneNumber;
        }
        if (verification.wabaId) {
          try {
            const currentCreds = typeof updates.credentials === "string"
              ? JSON.parse(updates.credentials)
              : typeof body.credentials === "object"
              ? { ...body.credentials }
              : JSON.parse(target.credentials || "{}");
            if (!currentCreds.wabaId) {
              currentCreds.wabaId = verification.wabaId;
              updates.credentials = JSON.stringify(currentCreds);
            }
          } catch {
            // ignore
          }
        }
      }
      if (body.displayName !== undefined) updates.displayName = body.displayName;
      if (body.credentials !== undefined) {
        updates.credentials =
          typeof body.credentials === "object" ? JSON.stringify(body.credentials) : String(body.credentials);
      }
      if (body.phoneNumber !== undefined) updates.phoneNumber = body.phoneNumber;
      if (body.status !== undefined) updates.status = body.status;

      const [updated] = await db
        .update(schema.channels)
        .set(updates)
        .where(eq(schema.channels.id, id))
        .returning();

      if (updated.isActive === 1 && updates.credentials) {
        await syncAppConfig(target.engine, updated.credentials, updated.phoneNumber);
      }

      return { ...updated, success: true, channel: updated };
    },
    {
      params: t.Object({ id: t.Numeric() }),
      body: t.Object({
        displayName: t.Optional(t.String()),
        credentials: t.Optional(t.Union([t.String(), t.Record(t.String(), t.Unknown())])),
        phoneNumber: t.Optional(t.String()),
        status: t.Optional(t.String()),
      }),
    }
  );
