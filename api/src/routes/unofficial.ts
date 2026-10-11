import { Elysia, t } from "elysia";
import { ensureGowaStarted, gowaConfig } from "../supervisor/gowa";

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
        const state = data.results?.state || "disconnected";
        const isConnected = state === "connected";

        return {
          success: true,
          connected: isConnected,
          state,
          jid: data.results?.jid,
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
        await fetch(`${gowaConfig.baseUrl}/app/logout?device_id=${encodeURIComponent(deviceId)}`, {
          headers: { Authorization: authHeader },
        });
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
