export function openReportsSidebar(): void {
  const html = HtmlService.createHtmlOutputFromFile('UiSidebar')
    .setTitle('FBox Отчёты')
    .setWidth(340)
  SpreadsheetApp.getUi().showSidebar(html)
}
