import { Elysia, t } from "elysia";
import { ensureGowaStarted, gowaConfig } from "../supervisor/gowa";
import { db, schema } from "../db";
import { eq } from "drizzle-orm";

interface DeviceCreateResponse {
  code?: string;
  message?: string;
  results?: {
    id: string;
    state?: string;
  };
}

interface LoginResponse {
  code?: string;
  message?: string;
  results?: {
    qr_link?: string;
    qr_duration?: number;
  };
}

interface PairCodeResponse {
  code?: string;
  message?: string;
  results?: {
    pair_code?: string;
  };
}

interface StatusResponse {
  code?: string;
  message?: string;
  results?: {
    device_id?: string;
    is_connected?: boolean;
    is_logged_in?: boolean;
    state?: string;
    jid?: string;
  };
}

const authHeader = `Basic ${Buffer.from(gowaConfig.auth).toString("base64")}`;

export const unofficialRoutes = new Elysia({ prefix: "/api/unofficial" })
  .post(
    "/device",
    async ({ body, set }) => {
      const started = await ensureGowaStarted();
      if (!started) {
        set.status = 503;
        return { success: false, error: "No se pudo iniciar el servicio de WhatsApp no oficial." };
      }

      try {
        // Query existing GOWA devices and database channels
        try {
          const listRes = await fetch(`${gowaConfig.baseUrl}/devices`, {
            headers: { Authorization: authHeader },
          });
          if (listRes.ok) {
            const listData = (await listRes.json()) as {
              results?: Array<{ id: string; state?: string; jid?: string }>;
            };
            const devices = listData.results || [];

            const existingChannels = await db.query.channels.findMany({
              where: eq(schema.channels.engine, "unofficial"),
            });
            const registeredDeviceIds = new Set(
              existingChannels
                .map((c) => {
                  try {
                    const parsed = JSON.parse(c.credentials || "{}");
                    return parsed.deviceId;
                  } catch {
                    return null;
                  }
                })
                .filter(Boolean)
            );

            // If a device in GOWA is already logged in and not saved in channels yet, reuse it
            const unlinkedLoggedIn = devices.find(
              (d) => (d.state === "logged_in" || d.jid) && !registeredDeviceIds.has(d.id)
            );
            if (unlinkedLoggedIn) {
              return {
                success: true,
                deviceId: unlinkedLoggedIn.id,
                state: "connected",
              };
            }

            // Cleanup stale disconnected devices to avoid bloat and Store conflicts
            for (const d of devices) {
              if (d.state === "disconnected" || !registeredDeviceIds.has(d.id)) {
                await fetch(`${gowaConfig.baseUrl}/devices/${d.id}`, {
                  method: "DELETE",
                  headers: { Authorization: authHeader },
                }).catch(() => null);
              }
            }
          }
        } catch {
          // Non-critical device cleanup/lookup optimization
        }

        const response = await fetch(`${gowaConfig.baseUrl}/devices`, {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: body.name || "Principal" }),
        });

        const data = (await response.json()) as DeviceCreateResponse;
        if (!response.ok || data.code !== "SUCCESS" || !data.results?.id) {
          set.status = response.status || 500;
          return { success: false, error: data.message || "Error al crear dispositivo en GOWA." };
        }

        return {
          success: true,
          deviceId: data.results.id,
          state: data.results.state || "disconnected",
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Error de red";
        set.status = 500;
        return { success: false, error: message };
      }
    },
    {
      body: t.Object({
        name: t.Optional(t.String()),
      }),
    }
  )
  .get(
    "/qr",
    async ({ query, set }) => {
      const started = await ensureGowaStarted();
      if (!started) {
        set.status = 503;
        return { success: false, error: "Servicio no oficial no iniciado." };
      }

      const { deviceId } = query;
      try {
        const response = await fetch(
          `${gowaConfig.baseUrl}/app/login?device_id=${encodeURIComponent(deviceId)}`,
          {
            headers: { Authorization: authHeader },
          }
        );

        const data = (await response.json()) as LoginResponse;
        if (!response.ok || data.code !== "SUCCESS" || !data.results?.qr_link) {
          // If device has an existing stale store (e.g. user logged out on phone), regenerate clean device
          try {
            await fetch(`${gowaConfig.baseUrl}/devices/${encodeURIComponent(deviceId)}`, {
              method: "DELETE",
              headers: { Authorization: authHeader },
            });
            const createRes = await fetch(`${gowaConfig.baseUrl}/devices`, {
              method: "POST",
              headers: {
                Authorization: authHeader,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ name: "WhatsApp Web" }),
            });
            const createData = (await createRes.json()) as DeviceCreateResponse;
            if (createData.results?.id) {
              const retryLogin = await fetch(
                `${gowaConfig.baseUrl}/app/login?device_id=${encodeURIComponent(createData.results.id)}`,
                { headers: { Authorization: authHeader } }
              );
              const retryData = (await retryLogin.json()) as LoginResponse;
              if (retryLogin.ok && retryData.results?.qr_link) {
                const imgRes = await fetch(retryData.results.qr_link, {
                  headers: { Authorization: authHeader },
                });
                if (imgRes.ok) {
                  const buffer = await imgRes.arrayBuffer();
                  const base64 = Buffer.from(buffer).toString("base64");
                  return {
                    success: true,
                    qr: `data:image/png;base64,${base64}`,
                    qrDuration: retryData.results.qr_duration || 30,
                    newDeviceId: createData.results.id,
                  };
                }
              }
            }
          } catch {
            // fallback to original error
          }

          set.status = response.status || 500;
          return { success: false, error: data.message || "Error al generar código QR." };
        }

        // Fetch image bytes to return base64 data URL to the client
        const imgRes = await fetch(data.results.qr_link, {
          headers: { Authorization: authHeader },
        });

        if (!imgRes.ok) {
          return {
            success: true,
            qrLink: data.results.qr_link,
            qrDuration: data.results.qr_duration || 30,
          };
        }

        const buffer = await imgRes.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        const dataUrl = `data:image/png;base64,${base64}`;

        return {
          success: true,
          qr: dataUrl,
          qrDuration: data.results.qr_duration || 30,
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Error de red al obtener QR";
        set.status = 500;
        return { success: false, error: message };
      }
    },
    {
      query: t.Object({
        deviceId: t.String(),
      }),
    }
  )
  .get(
    "/pair-code",
    async ({ query, set }) => {
      const started = await ensureGowaStarted();
      if (!started) {
        set.status = 503;
        return { success: false, error: "Servicio no oficial no iniciado." };
      }

      const { deviceId, phone } = query;
      const cleanPhone = phone.replace("+", "").trim();

      try {
        const response = await fetch(
          `${gowaConfig.baseUrl}/app/login-with-code?device_id=${encodeURIComponent(deviceId)}&phone=${encodeURIComponent(cleanPhone)}`,
          {
            headers: { Authorization: authHeader },
          }
        );

        const data = (await response.json()) as PairCodeResponse;
        if (!response.ok || data.code !== "SUCCESS" || !data.results?.pair_code) {
          set.status = response.status || 500;
          return { success: false, error: data.message || "Error al solicitar código de vinculación." };
        }

        return {
          success: true,
          pairCode: data.results.pair_code,
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Error de red";
        set.status = 500;
        return { success: false, error: message };
      }
    },
    {
      query: t.Object({
        deviceId: t.String(),
        phone: t.String(),
      }),
    }
  )
  .get(
    "/status",
    async ({ query, set }) => {
      const started = await ensureGowaStarted();
      if (!started) {
        return { success: true, connected: false, state: "stopped" };
      }

      const { deviceId } = query;
      try {
        const response = await fetch(
          `${gowaConfig.baseUrl}/app/status?device_id=${encodeURIComponent(deviceId)}`,
          {
            headers: { Authorization: authHeader },
          }
        );

        const data = (await response.json()) as StatusResponse;
        const isConnected = Boolean(
          data.results?.is_connected ||
          data.results?.is_logged_in ||
          data.results?.state === "connected" ||
          data.results?.state === "logged_in"
        );
        if (isConnected) {
          return {
            success: true,
            connected: true,
            state,
            jid: data.results?.jid,
            deviceId,
          };
        }

        try {
          const listRes = await fetch(`${gowaConfig.baseUrl}/devices`, {
            headers: { Authorization: authHeader },
            signal: AbortSignal.timeout(1500),
          });
          if (listRes.ok) {
            const listData = (await listRes.json()) as {
              results?: Array<{ id: string; state?: string; jid?: string }>;
            };
            const devices = listData.results || [];
            const existingChannels = await db.query.channels.findMany({
              where: eq(schema.channels.engine, "unofficial"),
            });
            const otherRegisteredIds = new Set(
              existingChannels
                .filter((c) => {
                  try {
                    const parsed = JSON.parse(c.credentials || "{}");
                    return parsed.deviceId && parsed.deviceId !== deviceId;
                  } catch {
                    return false;
                  }
                })
                .map((c) => {
                  try {
                    return JSON.parse(c.credentials || "{}").deviceId;
                  } catch {
                    return null;
                  }
                })
                .filter(Boolean)
            );

            const activeDev = devices.find(
              (d) =>
                (d.state === "logged_in" || d.state === "connected") &&
                Boolean(d.jid) &&
                !otherRegisteredIds.has(d.id)
            );

            if (activeDev) {
              return {
                success: true,
                connected: true,
                state: "connected",
                jid: activeDev.jid,
                deviceId: activeDev.id,
              };
            }
          }
        } catch {
          // ignore fallback lookup errors
        }

        return {
          success: true,
          connected: false,
          state,
          jid: data.results?.jid,
          deviceId,
        };
      } catch {
        return { success: true, connected: false, state: "error" };
      }
    },
    {
      query: t.Object({
        deviceId: t.String(),
      }),
    }
  )
  .post(
    "/logout",
    async ({ body }) => {
      const { deviceId } = body;
      try {
        await ensureGowaStarted();
        await fetch(`${gowaConfig.baseUrl}/app/logout?device_id=${encodeURIComponent(deviceId)}`, {
          method: "GET",
          headers: { Authorization: authHeader },
          signal: AbortSignal.timeout(3500),
        }).catch(() => null);

        await fetch(`${gowaConfig.baseUrl}/devices/${encodeURIComponent(deviceId)}`, {
          method: "DELETE",
          headers: { Authorization: authHeader },
          signal: AbortSignal.timeout(3500),
        }).catch(() => null);

        // Mark any matching channel in SQLite as disconnected
        const channels = await db.query.channels.findMany({
          where: eq(schema.channels.engine, "unofficial"),
        });
        for (const ch of channels) {
          try {
            const creds = JSON.parse(ch.credentials || "{}");
            if (creds.deviceId === deviceId) {
              await db
                .update(schema.channels)
                .set({ status: "disconnected", updatedAt: new Date() })
                .where(eq(schema.channels.id, ch.id));
            }
          } catch {
            // ignore JSON parse
          }
        }
      } catch {
        // ignore logout error
      }
      return { success: true };
    },
    {
      body: t.Object({
        deviceId: t.String(),
      }),
    }
  );
