/**
 * Bundled implementation (global FBoxCore). Entry points for GAS are in Triggers.gs.
 */
export {
  onOpen,
  onInstall,
  onSpreadsheetOpen,
  ensureSpreadsheetOpenTrigger,
  openReportsSidebar,
} from './Addon'

export {
  loginSidebar,
  logoutSidebar,
  refreshCatalogSidebar,
  getSidebarState,
  getSavedParams,
  loadReportFromSidebar,
  getLoadProgressMessage,
} from './Main'
