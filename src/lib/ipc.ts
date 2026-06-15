/**
 * WhatsRemind - Desktop Notification Application
 * Copyright (c) 2026 famtiago. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { invoke } from '@tauri-apps/api/core';
import { listen, Event } from '@tauri-apps/api/event';

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

// Wrapper for Tauri's invoke to catch and throw string errors
async function invokeWrapper<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(cmd, args);
  } catch (error: any) {
    const errorMsg = typeof error === 'object' ? JSON.stringify(error) : String(error);
    throw new Error(errorMsg);
  }
}

export const ipc = {
  setupWizardValidateAndSave: (token: string, phoneId: string, wabaId: string) =>
    invokeWrapper<void>('setup_wizard_validate_and_save', { token, phoneId, wabaId }),

  getCredentials: () => invokeWrapper<{ token: string, phone_id: string, waba_id: string } | null>('get_credentials'),

  getAppConfig: () => invokeWrapper<boolean>('get_app_config'),

  saveTemplateName: (templateName: string) =>
    invokeWrapper<void>('save_template_name', { templateName }),

  getTemplateName: () => invokeWrapper<string | null>('get_template_name'),

  getWhatsAppProfile: () => invokeWrapper<WhatsAppProfile | null>('get_whatsapp_profile'),

  getMetaTemplates: () => invokeWrapper<TemplateItem[]>('get_meta_templates'),

  createMetaTemplate: (name: string, header: string | null, body: string, footer: string | null, category: string, language: string) =>
    invokeWrapper<void>('create_meta_template', { name, header, body, footer, category, language }),
  
  getLocalTemplates: () => invokeWrapper<TemplateItem[]>('get_local_templates'),

  createLocalTemplate: (name: string, header: string | null, body: string, footer: string | null, category: string, language: string) =>
    invokeWrapper<void>('create_local_template', { name, header, body, footer, category, language }),

  verifyMetaToken: () => invokeWrapper<boolean>('verify_meta_token'),
  getEngine: () => invokeWrapper<string>('get_engine'),
  setEngine: (engine: string) => invokeWrapper<void>('set_engine', { engine }),
  startSidecar: () => invokeWrapper<number>('start_sidecar'),
  stopSidecar: () => invokeWrapper<void>('stop_sidecar'),
  logoutSidecar: () => invokeWrapper<void>('logout_sidecar'),
  getSidecarStatus: () => invokeWrapper<{ is_running: boolean; connected: boolean; qr: string | null; phone: string | null }>('get_sidecar_status'),

  previewExcel: (filePath: string, sheet?: string) =>
    invokeWrapper<ExcelPreview>('preview_excel', { filePath, sheet }),

  getAvailableSheets: () => invokeWrapper<string[]>('get_available_sheets'),
  
  deleteSheet: (sheetName: string) => invokeWrapper<void>('delete_sheet', { sheetName }),

  importExcel: (filePath: string, mapping: ColumnMapping, overwriteAll: boolean, sheet?: string) =>
    invokeWrapper<ImportStats>('import_excel', { filePath, mapping, overwriteAll, sheet }),

  getClients: (filter: ClientFilter) => invokeWrapper<PaginatedClients>('get_clients', { 
    filter: {
      status: filter.status === 'all' ? undefined : filter.status,
      search: filter.search,
      sheet_name: filter.sheet_name,
      exclude_recent_24h: filter.exclude_recent_24h,
      limit: filter.page_size,
      offset: (filter.page - 1) * filter.page_size
    }
  }),

  startBulkSend: (clientIds: number[], template: string, language: string) =>
    invokeWrapper<void>('start_bulk_send', { clientIds, template, language }),

  cancelBulkSend: () => invokeWrapper<void>('cancel_bulk_send'),

  getSendHistory: (filter: HistoryFilter) =>
    invokeWrapper<PaginatedLogs>('get_send_history', { 
      filter: {
        date_from: filter.date_from,
        date_to: filter.date_to,
        status: (filter.status as any) === 'all' ? undefined : filter.status,
        search: filter.search,
        limit: filter.page_size,
        offset: (filter.page - 1) * filter.page_size
      }
    }),

  listenBulkSendProgress: (callback: (event: BulkSendProgressEvent) => void) =>
    listen<BulkSendProgressEvent>('bulk-send-progress', (event: Event<BulkSendProgressEvent>) => {
      callback(event.payload);
    }),

  listenBulkSendHalted: (callback: () => void) =>
    listen<void>('bulk-send-halted', () => {
      callback();
    }),
};
