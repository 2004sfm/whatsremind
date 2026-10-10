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

  getMetaTemplates: async (): Promise<TemplateItem[]> => {
    const res = await fetch(`${API_BASE}/templates`);
    if (!res.ok) return [];
    return await res.json();
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
    const res = await fetch(`${API_BASE}/templates`);
    if (!res.ok) return [];
    return await res.json();
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

  startSidecar: async (): Promise<number> => 0,
  stopSidecar: async (): Promise<void> => {},
  logoutSidecar: async (): Promise<void> => {},
  getSidecarStatus: async () => ({ is_running: false, connected: false, qr: null, phone: null }),
  checkLicenseStatus: async () => ({ is_valid: true, reason: null }),

  previewExcel: async (fileOrBuffer: any, sheet?: string): Promise<ExcelPreview> => {
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
      data: json.data.map((c: any) => ({
        id: c.id,
        phone_number: c.phoneNumber,
        phone_number_2: c.phoneNumber2,
        name: c.name,
        code: c.code,
        debt: c.debt,
        last_sent: c.lastSent,
        is_sendable: c.isSendable,
        is_active: c.isActive,
        sheet_name: c.sheetName,
        excel_row: c.excelRow,
      })),
      total: json.total,
      page: filter.page,
      page_size: filter.page_size,
    };
  },

  startBulkSend: async (clientIds: number[], template: string, language: string, _variablesCount: number): Promise<void> => {
    const res = await fetch(`${API_BASE}/messages/bulk-send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_ids: clientIds,
        template,
        language,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      if (data.inDevelopment) {
        alert("⚠️ Evolution API se encuentra actualmente en desarrollo.");
        return;
      }
      throw new Error(data.error || 'Error al iniciar envío masivo');
    }

    // Trigger synthetic progress events for the UI
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
            status: log.status,
            error_detail: log.error,
          },
        };
        progressListeners.forEach((listener) => listener(event));
      }
    }
  },

  cancelBulkSend: async (): Promise<void> => {
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
      data: logs.map((l: any) => ({
        id: l.id,
        client_id: l.clientId,
        client_name: `Cliente #${l.clientId}`,
        client_code: null,
        client_phone: '',
        wa_message_id: l.waMessageId,
        status: l.status,
        http_status: l.httpStatus,
        error_detail: l.errorDetail,
        template_used: l.templateUsed,
        sent_at: l.sentAt,
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
