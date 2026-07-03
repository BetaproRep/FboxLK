# Backend: реализация /reports для Google Sheets и Excel

Контракт описан в [docs/openapi.yaml](../../../docs/openapi.yaml).

## GET /reports/catalog

- Возвращает все доступные клиенту `report_id` с `params` и `columns`.
- `columns[].key` должен совпадать с ключами объектов в `items[]`.
- Опционально `columns[].description` — подсказка при наведении на заголовок в Google Таблицах.
- Пример тела: [catalog.example.json](./catalog.example.json).

## POST /reports

- Обязательно: `report_id` + параметры из каталога.
- Пагинация: `page_size` (рекомендуется по умолчанию 5000), `page_token` / `page_next_token` (как в `/goods/list`).
- Ответ: `items`, опционально `total_count`, `page_next_token`.
- При `success: false` — `error_code`, `error_message` (HTTP 200).

## Совместимость

- Поле `types[]` можно оставить для старых клиентов Excel.
- Новые клиенты используют только каталог.
