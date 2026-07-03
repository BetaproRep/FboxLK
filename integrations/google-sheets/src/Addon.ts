import { openReportsSidebar } from './Sidebar'

const MENU_NAME = 'FBox Отчёты'

/** Simple trigger: только меню (без showSidebar — нет script.container.ui до авторизации). */
export function onOpen(): void {
  buildMenu()
}

export function onInstall(): void {
  buildMenu()
  ensureSpreadsheetOpenTrigger()
  tryOpenSidebar()
}

/** Installable onOpen — открывает сайдбар после авторизации скрипта. */
export function onSpreadsheetOpen(): void {
  buildMenu()
  tryOpenSidebar()
}

function tryOpenSidebar(): void {
  try {
    openReportsSidebar()
  } catch (e) {
    Logger.log(`openReportsSidebar skipped: ${e}`)
  }
}

export function ensureSpreadsheetOpenTrigger(): void {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  if (!ss) {
    return
  }

  const triggers = ScriptApp.getProjectTriggers()
  for (let i = 0; i < triggers.length; i += 1) {
    const trigger = triggers[i]
    if (
      trigger.getEventType() === ScriptApp.EventType.ON_OPEN &&
      trigger.getHandlerFunction() === 'onSpreadsheetOpen'
    ) {
      return
    }
  }

  ScriptApp.newTrigger('onSpreadsheetOpen').forSpreadsheet(ss).onOpen().create()
}

function buildMenu(): void {
  SpreadsheetApp.getUi()
    .createMenu(MENU_NAME)
    .addItem('Открыть панель', 'openReportsSidebar')
    .addToUi()
}

export { openReportsSidebar } from './Sidebar'
