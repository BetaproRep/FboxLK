/**
 * Точки входа для Google Apps Script (верхний уровень).
 * Логика — в Code.gs (бандл FBoxCore).
 */

function onOpen() {
  FBoxCore.onOpen();
}

function onInstall() {
  FBoxCore.onInstall();
}

function onSpreadsheetOpen() {
  FBoxCore.onSpreadsheetOpen();
}

function openReportsSidebar() {
  FBoxCore.openReportsSidebar();
}

function loginSidebar(partnerId, password) {
  return FBoxCore.loginSidebar(partnerId, password);
}

function logoutSidebar() {
  return FBoxCore.logoutSidebar();
}

function refreshCatalogSidebar() {
  return FBoxCore.refreshCatalogSidebar();
}

function getSidebarState() {
  return FBoxCore.getSidebarState();
}

function getSavedParams(reportId) {
  return FBoxCore.getSavedParams(reportId);
}

function loadReportFromSidebar(form) {
  return FBoxCore.loadReportFromSidebar(form);
}

function getLoadProgressMessage() {
  return FBoxCore.getLoadProgressMessage();
}
