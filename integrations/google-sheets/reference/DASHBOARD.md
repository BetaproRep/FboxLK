# GET /web/dashboard — блок Google Таблиц

Рекомендуется **отдельный объект** `google_sheets`, а не расширение `reports[]` (Excel и Sheets — разные сценарии: файл .xlsx vs копия шаблона + Apps Script).

## Пример фрагмента ответа

```json
{
  "success": true,
  "cards": { },
  "google_sheets": {
    "enabled": true,
    "google_sheet_url": "https://docs.google.com/spreadsheets/d/{MASTER_ID}/copy",
    "link_label": "Создать копию шаблона",
    "modal_title": "Отчёты в Google Таблицах",
    "summary": "Обновление данных с сервера без повторной загрузки файла",
    "description_paragraphs": [
      "Аналитические отчёты в Google Таблицах: выберите тип отчёта и период в панели FBox Отчёты, данные загрузятся на отдельный лист.",
      "Учётные данные API хранятся в настройках вашего Google-аккаунта, не в ячейках таблицы."
    ],
    "steps": [
      "Откройте ссылку ниже и нажмите «Создать копию».",
      "При открытии файла откройте панель FBox Отчёты (или меню FBox Отчёты → Открыть панель).",
      "Войдите: код партнёра и пароль API, как в личном кабинете.",
      "Выберите отчёт, параметры и нажмите «Обновить отчёт»."
    ],
    "requirements": [
      "Аккаунт Google с доступом к Google Таблицам.",
      "Код партнёра и пароль API (как для портала)."
    ]
  },
  "reports": [
    {
      "file_name": "Справочник товаров.xlsx",
      "is_custom": false,
      "url": "https://..."
    }
  ]
}
```

## Поля `google_sheets`

| Поле | Тип | Обяз. | Описание |
|------|-----|-------|----------|
| `enabled` | boolean | нет | `false` — скрыть пункт Google Таблиц (по умолчанию `true`, если объект передан) |
| `google_sheet_url` | string | да* | Ссылка `/copy` на мастер-таблицу с Apps Script |
| `link_label` | string | нет | Текст кнопки-ссылки в модалке (портал: «Создать копию шаблона») |
| `modal_title` | string | нет | Заголовок модалки |
| `summary` | string | нет | Краткая подпись в плитке (необязательно) |
| `description_paragraphs` | string[] | нет | Абзацы в модалке; если пусто — текст по умолчанию на портале |
| `steps` | string[] | нет | Нумерованные шаги |
| `requirements` | string[] | нет | Маркированный список требований |

\* Обязательно, если объект `google_sheets` присутствует и `enabled !== false`.

## Excel

Массив `reports` без изменений: `file_name`, `url`, `is_custom`.

## Устаревшее

`google_sheets_reports: [{ name, url }]` — портал поддерживает как fallback, предпочтителен `google_sheets`.
