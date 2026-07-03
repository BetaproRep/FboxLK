/**
 * Public URL of the master Google Sheets template ("/copy" link).
 * Override via VITE_GOOGLE_SHEETS_TEMPLATE_URL in .env
 */
export const GOOGLE_SHEETS_TEMPLATE_URL =
  import.meta.env.VITE_GOOGLE_SHEETS_TEMPLATE_URL?.trim() ||
  'https://docs.google.com/spreadsheets/d/REPLACE_WITH_MASTER_SHEET_ID/copy'
