import type {
  ClientFilter,
  PaginatedClients,
  ExcelPreview,
  ColumnMapping,
  ImportStats,
  HistoryFilter,
  PaginatedLogs,
  BulkSendProgressEvent,
  WhatsAppProfile,
  TemplateItem,
  Channel,
} from './types';

const API_BASE = '/api';

const progressListeners = new Set<(event: BulkSendProgressEvent) => void>();
const haltListeners = new Set<() => void>();

export const ipc = {
  setupWizardValidateAndSave: async (token: string, phoneId: string, _wabaId: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metaToken: token, metaPhoneId: phoneId, engine: 'meta' }),
    });
    if (!res.ok) throw new Error('Error al guardar credenciales en el servidor');
  },

  getYCloudConfig: async () => {
    const res = await fetch(`${API_BASE}/config`);
    if (!res.ok) return null;
    return await res.json();
  },

  saveYCloudConfig: async (apiKey: string, phone: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ycloudApiKey: apiKey, ycloudPhone: phone, engine: 'ycloud' }),
    });
    if (!res.ok) throw new Error('Error al guardar credenciales de YCloud');
  },

  getCredentials: async (): Promise<{ token: string; phone_id: string; waba_id: string } | null> => {
    const res = await fetch(`${API_BASE}/config`);
    if (!res.ok) return null;
    const config = await res.json();
    if (!config.metaToken && !config.ycloudApiKey) return null;
    return {
      token: config.metaToken || '',
      phone_id: config.metaPhoneId || '',
      waba_id: '',
    };
  },

  getAppConfig: async (): Promise<boolean> => {
    const res = await fetch(`${API_BASE}/config`);
    if (!res.ok) return false;
    const config = await res.json();
    return !!(config.metaToken || config.ycloudApiKey);
  },

  saveTemplateName: async (templateName: string): Promise<void> => {
    await fetch(`${API_BASE}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateName }),
    });
  },

  getTemplateName: async (): Promise<string | null> => {
    const res = await fetch(`${API_BASE}/config`);
    if (!res.ok) return null;
    const config = await res.json();
    return config.templateName || null;
  },

  getWhatsAppProfile: async (): Promise<WhatsAppProfile | null> => {
    const res = await fetch(`${API_BASE}/config`);
    if (!res.ok) return null;
    const config = await res.json();
    return {
      display_phone_number: config.metaPhoneId || config.ycloudPhone || 'No configurado',
      verified_name: config.engine ? `Motor: ${config.engine.toUpperCase()}` : 'WhatsRemind',
    };
  },

  getTemplates: async (engine?: string, channelId?: number): Promise<TemplateItem[]> => {
    const params = new URLSearchParams();
    if (engine) params.set('engine', engine);
    if (channelId) params.set('channel_id', String(channelId));
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE}/templates${query}`);
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error || 'Error al obtener plantillas');
    }
    return await res.json();
  },

  importTemplateToLocal: async (template: {
    name: string;
    language?: string;
    category?: string;
    components: unknown[];
  }): Promise<void> => {
    const res = await fetch(`${API_BASE}/templates/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(template),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error || 'Error al importar plantilla a local');
    }
  },

  deleteLocalTemplate: async (name: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/templates/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error || 'Error al eliminar plantilla local');
    }
  },

  updateLocalTemplate: async (
    name: string,
    data: {
      components: Array<{ type: string; text?: string; format?: string }>;
      category?: string;
      language?: string;
    }
  ): Promise<void> => {
    const res = await fetch(`${API_BASE}/templates/${encodeURIComponent(name)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error || 'Error al actualizar plantilla local');
    }
  },

  getMetaTemplates: async (): Promise<TemplateItem[]> => {
    return await ipc.getTemplates('meta');
  },

  createMetaTemplate: async (name: string, header: string | null, body: string, footer: string | null, category: string, language: string): Promise<void> => {
    await fetch(`${API_BASE}/templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: name.toLowerCase(),
        name,
        language,
        status: 'APPROVED',
        category,
        componentsJson: JSON.stringify([
          header ? { type: 'HEADER', text: header } : null,
          { type: 'BODY', text: body },
          footer ? { type: 'FOOTER', text: footer } : null,
        ].filter(Boolean)),
      }),
    });
  },

  getLocalTemplates: async (): Promise<TemplateItem[]> => {
    return await ipc.getTemplates('unofficial');
  },

  createLocalTemplate: async (name: string, header: string | null, body: string, footer: string | null, category: string, language: string): Promise<void> => {
    await fetch(`${API_BASE}/templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: name.toLowerCase(),
        name,
        language,
        status: 'LOCAL',
        category,
        componentsJson: JSON.stringify([
          header ? { type: 'HEADER', text: header } : null,
          { type: 'BODY', text: body },
          footer ? { type: 'FOOTER', text: footer } : null,
        ].filter(Boolean)),
      }),
    });
  },

  verifyMetaToken: async (): Promise<boolean> => {
    const res = await fetch(`${API_BASE}/config`);
    if (!res.ok) return false;
    const config = await res.json();
    return !!config.metaToken;
  },

  getEngine: async (): Promise<string> => {
    const res = await fetch(`${API_BASE}/config`);
    if (!res.ok) return 'meta';
    const config = await res.json();
    return config.engine || 'meta';
  },

  setEngine: async (engine: string): Promise<void> => {
    await fetch(`${API_BASE}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ engine }),
    });
  },

  getChannels: async (engine?: string): Promise<Channel[]> => {
    const query = engine ? `?engine=${encodeURIComponent(engine)}` : '';
    const res = await fetch(`${API_BASE}/channels${query}`);
    if (!res.ok) throw new Error('Error al obtener canales');
    return await res.json();
  },

  createChannel: async (data: {
    engine: string;
    phoneNumber: string;
    displayName?: string;
    credentials: Record<string, unknown> | string;
    status?: string;
  }): Promise<Channel> => {
    const res = await fetch(`${API_BASE}/channels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      let message = 'Error al crear canal';
      try {
        const errorData = (await res.json()) as { error?: string; message?: string };
        message = errorData.error || errorData.message || message;
      } catch {
        const errText = await res.text().catch(() => '');
        if (errText) message = errText;
      }
      throw new Error(message);
    }
    const result = (await res.json()) as { channel?: Channel } & Channel;
    window.dispatchEvent(new Event('credentials-updated'));
    return result.channel || result;
  },

  activateChannel: async (id: number): Promise<void> => {
    const res = await fetch(`${API_BASE}/channels/${id}/activate`, {
      method: 'POST',
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || 'Error al activar canal');
    }
    window.dispatchEvent(new Event('credentials-updated'));
  },

  deleteChannel: async (id: number): Promise<void> => {
    const res = await fetch(`${API_BASE}/channels/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || 'Error al eliminar canal');
    }
    window.dispatchEvent(new Event('credentials-updated'));
  },

  updateChannel: async (
    id: number,
    data: {
      displayName?: string | null;
      credentials?: Record<string, unknown> | string;
      phoneNumber?: string;
      status?: string;
    }
  ): Promise<Channel> => {
    const res = await fetch(`${API_BASE}/channels/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      let message = 'Error al actualizar canal';
      try {
        const errorData = (await res.json()) as { error?: string; message?: string };
        message = errorData.error || errorData.message || message;
      } catch {
        const errText = await res.text().catch(() => '');
        if (errText) message = errText;
      }
      throw new Error(message);
    }
    const result = (await res.json()) as { channel?: Channel } & Channel;
    window.dispatchEvent(new Event('credentials-updated'));
    return result.channel || result;
  },

  createUnofficialDevice: async (name?: string): Promise<{ deviceId: string }> => {
    const res = await fetch(`${API_BASE}/unofficial/device`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name || 'Principal' }),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error || 'Error al crear dispositivo');
    }
    const data = (await res.json()) as { deviceId: string };
    return { deviceId: data.deviceId };
  },

  getUnofficialQr: async (
    deviceId: string
  ): Promise<{ qr?: string; qrLink?: string; qrDuration: number; newDeviceId?: string }> => {
    const res = await fetch(`${API_BASE}/unofficial/qr?deviceId=${encodeURIComponent(deviceId)}`);
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error || 'Error al obtener código QR');
    }
    return (await res.json()) as { qr?: string; qrLink?: string; qrDuration: number; newDeviceId?: string };
  },

  getUnofficialPairCode: async (deviceId: string, phone: string): Promise<{ pairCode: string }> => {
    const res = await fetch(
      `${API_BASE}/unofficial/pair-code?deviceId=${encodeURIComponent(deviceId)}&phone=${encodeURIComponent(phone)}`
    );
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error || 'Error al generar código de vinculación');
    }
    const data = (await res.json()) as { pairCode: string };
    return { pairCode: data.pairCode };
  },

  getUnofficialStatus: async (
    deviceId: string
  ): Promise<{ connected: boolean; state: string; jid?: string; deviceId?: string }> => {
    const res = await fetch(`${API_BASE}/unofficial/status?deviceId=${encodeURIComponent(deviceId)}`);
    if (!res.ok) return { connected: false, state: 'error' };
    return (await res.json()) as { connected: boolean; state: string; jid?: string; deviceId?: string };
  },

  logoutUnofficial: async (deviceId: string): Promise<void> => {
    await fetch(`${API_BASE}/unofficial/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId }),
    });
  },

  checkLicenseStatus: async () => ({ is_valid: true, reason: null }),
  getSidecarStatus: async () => ({ is_running: false, connected: false, qr: null, phone: null }),
  startSidecar: async (): Promise<number> => 0,
  stopSidecar: async (): Promise<void> => {},

  previewExcel: async (fileOrBuffer: unknown, sheet?: string): Promise<ExcelPreview> => {
    const formData = new FormData();
    if (fileOrBuffer instanceof File) {
      formData.append('file', fileOrBuffer);
    } else {
      throw new Error('Archivo inválido para preview');
    }
    if (sheet) formData.append('sheet', sheet);

    const res = await fetch(`${API_BASE}/excel/preview`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
  },

  getAvailableSheets: async (): Promise<string[]> => {
    const res = await fetch(`${API_BASE}/clients?limit=1000`);
    if (!res.ok) return [];
    const data = await res.json();
    const sheets = new Set<string>();
    for (const c of data.data) {
      if (c.sheetName) sheets.add(c.sheetName);
    }
    return Array.from(sheets);
  },

  deleteSheet: async (_sheetName: string): Promise<void> => {},

  importExcel: async (file: File, mapping: ColumnMapping, overwriteAll: boolean, _sheet?: string): Promise<ImportStats> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mapping', JSON.stringify(mapping));
    formData.append('overwrite_all', String(overwriteAll));

    const res = await fetch(`${API_BASE}/excel/import`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
  },

  getClients: async (filter: ClientFilter): Promise<PaginatedClients> => {
    const params = new URLSearchParams();
    if (filter.status && filter.status !== 'all') {
      params.set('status', filter.status === 'paid' ? 'Paid' : 'Pending');
    }
    if (filter.search) params.set('search', filter.search);
    if (filter.sheet_name) params.set('sheet_name', filter.sheet_name);
    if (filter.exclude_recent_24h) params.set('exclude_recent_24h', 'true');
    params.set('limit', String(filter.page_size || 50));
    params.set('offset', String(((filter.page || 1) - 1) * (filter.page_size || 50)));

    const res = await fetch(`${API_BASE}/clients?${params.toString()}`);
    if (!res.ok) throw new Error('Error al obtener clientes');
    const json = await res.json();

    return {
      data: (json.data as Record<string, unknown>[]).map((c) => ({
        id: Number(c.id),
        phone_number: String(c.phoneNumber || ''),
        phone_number_2: c.phoneNumber2 ? String(c.phoneNumber2) : null,
        name: String(c.name || ''),
        code: String(c.code || ''),
        debt: Number(c.debt || 0),
        last_sent: c.lastSent ? String(c.lastSent) : null,
        is_sendable: Boolean(c.isSendable),
        is_active: Boolean(c.isActive),
        sheet_name: c.sheetName ? String(c.sheetName) : undefined,
        excel_row: typeof c.excelRow === 'number' ? c.excelRow : undefined,
      })),
      total: json.total,
      page: filter.page,
      page_size: filter.page_size,
    };
  },

  startBulkSend: async (
    clientIds: number[],
    template: string,
    language: string,
    variablesCount: number,
    variableMap?: Array<"code" | "debt" | "name">
  ): Promise<void> => {
    const res = await fetch(`${API_BASE}/messages/bulk-send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_ids: clientIds,
        template,
        language,
        variables_count: variablesCount,
        variable_map: variableMap,
      }),
    });

    const data = (await res.json()) as {
      success?: boolean;
      error?: string;
      inDevelopment?: boolean;
      total?: number;
      jobId?: string;
      summary?: {
        total: number;
        sent: number;
        failed: number;
        logs?: Array<{ phone: string; status: string; error?: string }>;
      };
    };

    if (!res.ok || !data.success) {
      if (data.inDevelopment) {
        alert("⚠️ Evolution API se encuentra actualmente en desarrollo.");
        return;
      }
      throw new Error(data.error || 'Error al iniciar envío masivo');
    }

    if (data.summary?.logs) {
      let sentCount = 0;
      let failedCount = 0;
      for (const log of data.summary.logs) {
        if (log.status === 'sent') sentCount++;
        else failedCount++;

        const event: BulkSendProgressEvent = {
          sent: sentCount,
          failed: failedCount,
          total: data.summary.total,
          latest_log: {
            phone_number: log.phone,
            status: log.status === 'sent' ? 'sent' : 'failed',
            error_detail: log.error,
          },
        };
        progressListeners.forEach((listener) => listener(event));
      }
      return;
    }

    const total = data.total ?? clientIds.length;
    let isFinished = false;

    while (!isFinished) {
      await new Promise((resolve) => setTimeout(resolve, 800));

      try {
        const pollRes = await fetch(`${API_BASE}/messages/bulk-send/status`);
        if (!pollRes.ok) continue;

        const pollData = (await pollRes.json()) as {
          success?: boolean;
          job?: {
            id?: string;
            status: string;
            total: number;
            sent: number;
            failed: number;
            currentPhone?: string;
            latestLog?: {
              id?: string;
              phone: string;
              status: string;
              error?: string;
            };
            logs?: Array<{
              id?: string;
              phone: string;
              status: string;
              error?: string;
            }>;
          } | null;
        };

        const job = pollData.job;
        if (!job) break;

        const event: BulkSendProgressEvent = {
          sent: job.sent,
          failed: job.failed,
          total: job.total || total,
          status: job.status,
          latest_log: job.latestLog
            ? {
                id: job.latestLog.id,
                phone_number: job.latestLog.phone,
                status: job.latestLog.status === 'sent' ? 'sent' : 'failed',
                error_detail: job.latestLog.error,
              }
            : undefined,
          logs: job.logs
            ? job.logs.map((l) => ({
                id: l.id,
                phone_number: l.phone,
                status: l.status === 'sent' ? 'sent' : 'failed',
                error_detail: l.error,
              }))
            : undefined,
        };

        progressListeners.forEach((listener) => listener(event));

        if (job.status === 'completed' || job.status === 'cancelled' || job.status === 'failed') {
          isFinished = true;
        }
      } catch {
        // network hiccup, retry next tick
      }
    }
  },

  cancelBulkSend: async (): Promise<void> => {
    try {
      await fetch(`${API_BASE}/messages/bulk-send/cancel`, { method: 'POST' });
    } catch {
      // ignore network errors
    }
    haltListeners.forEach((listener) => listener());
  },

  getSendHistory: async (filter: HistoryFilter): Promise<PaginatedLogs> => {
    const params = new URLSearchParams();
    params.set('limit', String(filter.page_size || 50));
    params.set('offset', String(((filter.page || 1) - 1) * (filter.page_size || 50)));

    const res = await fetch(`${API_BASE}/messages/history?${params.toString()}`);
    if (!res.ok) throw new Error('Error al cargar historial');
    const logs = await res.json();

    return {
      data: (logs as Record<string, unknown>[]).map((l) => ({
        id: Number(l.id),
        client_id: Number(l.clientId),
        client_name: `Cliente #${l.clientId}`,
        client_code: null,
        client_phone: '',
        wa_message_id: l.waMessageId ? String(l.waMessageId) : undefined,
        status: l.status === 'sent' ? 'sent' : 'failed',
        http_status: typeof l.httpStatus === 'number' ? l.httpStatus : undefined,
        error_detail: l.errorDetail ? String(l.errorDetail) : undefined,
        template_used: String(l.templateUsed || ''),
        sent_at: String(l.sentAt || ''),
      })),
      total: logs.length,
      page: filter.page,
    };
  },

  listenBulkSendProgress: async (callback: (event: BulkSendProgressEvent) => void): Promise<() => void> => {
    progressListeners.add(callback);
    return () => {
      progressListeners.delete(callback);
    };
  },

  listenBulkSendHalted: async (callback: () => void): Promise<() => void> => {
    haltListeners.add(callback);
    return () => {
      haltListeners.delete(callback);
    };
  },
};
