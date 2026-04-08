interface UiDef {
  label: string
  short?: string
  hint?: string
}

type UiMap = Record<string, UiDef>

const common = {
  good_id:              { label: 'Артикул',                    short: 'Артикул',          hint: 'Артикул товара в вашей системе учёта'                              },
  good_name:            { label: 'Название товара',            short: 'Название',         hint: 'Наименование товара на складе'                                     },
  good_type:            { label: 'Тип товара',                 short: 'Тип',              hint: 'Категория или тип товара'                                          },
  gtr_name:             { label: 'Типоразмер товара',          short: 'Типоразмер',       hint: 'Группа товаров с одинаковыми габаритами'                           },
  qnt:                  { label: 'Количество',                 short: 'Кол-во',           hint: 'Количество единиц товара'                                          },
  price:                { label: 'Цена',                                                  hint: 'Цена единицы товара'                                               },
  weight:               { label: 'Вес, г',                                 hint: 'Вес товара в граммах'                                              },
  length:               { label: 'Длина, мм',                             },
  width:                { label: 'Ширина, мм',                           },
  height:               { label: 'Высота, мм',                          },
  qual_type:            { label: 'Качество товара',            short: 'Качество',         hint: 'Градация качества: норма/брак'                    },
  stock:                { label: 'Остаток',                                               hint: 'Доступный остаток на складе'                                       },
  quarantine:           { label: 'Карантин',                                             hint: 'Товар на карантине — временно недоступен для отгрузки'              },
  long_storage:         { label: 'Долгое хранение',           short: 'Долг. хр.',        hint: 'Товар перемещён на длительное хранение'                            },
  orders_inwork:        { label: 'Заказы в работе',           short: 'В работе',         hint: 'Зарезервировано под заказы, находящиеся в работе'                  },
  orders_wait:          { label: 'Заказы в ожидании',         short: 'Ожидание',         hint: 'Зарезервировано под заказы в ожидании обработки'                   },
  created_at:           { label: 'Дата создания',             short: 'Создан',           hint: 'Дата и время создания документа'                                   },
  indoc_id:             { label: 'Номер входящего документа', short: 'Номер документа',  hint: 'Уникальный номер документа в вашей системе учёта'                  },
  indoc_type_descrip:   { label: 'Тип входящего документа',   short: 'Тип документа',    hint: 'Вид операции: поставка товаров, отгрузка заказов и т.д.'           },
  indoc_txt:            { label: 'Примечание',                                           hint: 'Произвольный комментарий, указанный при создании документа'        },
  outdoc_id:            { label: 'Номер исходящего документа',short: 'Номер документа',  hint: 'Номер документа, сформированного складом по итогу операции'        },
  outdoc_type_descrip:  { label: 'Тип документа',             short: 'Тип',              hint: 'Тип складской операции: оприходование, отгрузка, возврат и т.д.'   },
  outdoc_date:          { label: 'Дата документа',            short: 'Дата',             hint: 'Дата проведения операции на складе'                                },
  outdoc_txt:           { label: 'Примечание',                                           hint: 'Произвольный комментарий к исходящему документу'                   },
  order_id:             { label: 'Номер заказа',              short: 'Номер',            hint: 'Номер заказа в вашей системе или на маркетплейсе'                  },
  state:                { label: 'Статус',                                               hint: 'Текущий статус заказа'                                             },
  origin:               { label: 'Маркетплейс',               short: 'Маркетпл.',        hint: 'Источник заказа: маркетплейс или канал продаж'                     },
  delivery_id:          { label: 'Код службы доставки',       short: 'Код СД',           hint: 'Код службы доставки, назначенной для заказа'                       },
  delivery_name:        { label: 'Служба доставки',           short: 'Доставка'          },
  canceled:             { label: 'Отменён'                                               },
  plan_qnt:             { label: 'Плановое количество',       short: 'План',             hint: 'Плановое количество товара по документу'                           },
  sn_mandant:           { label: 'Серийный номер',            short: 'Серийный №',       hint: 'Требуется серийный номер при приёмке этого товара'                 },
  good_sn:              { label: 'Серийный номер',            short: 'Серийный №',       hint: 'Уникальный серийный номер единицы товара'                          },
  inout:                { label: 'Направление',               short: 'Напр.',            hint: 'Направление движения товара: приход или расход'                    },
  attribute_name:       { label: 'Атрибут',                                              hint: 'Название дополнительного атрибута товара'                          },
  attribute_type:       { label: 'Тип атрибута',              short: 'Тип',              hint: 'Тип данных атрибута: строка, число и т.д.'                        },
  value:                { label: 'Значение',                                             hint: 'Значение атрибута'                                                 },
  event_type:           { label: 'Событие',                                              hint: 'Тип события в истории заказа'                                      },
  locked:               { label: 'Блокировка',                short: 'Блок.',            hint: 'Заблокированный документ не может быть изменён'                    },

  'btn.clipboard_load': { label: 'По списку из буфера',                                  hint: 'Скопируйте номер документа или список номеров из Excel в буфер обмена. Затем нажмите эту кнопку' },
} satisfies UiMap

const context: Record<string, Partial<UiMap>> = {
  indoc: {
    qnt: { label: 'Количество по документу', short: 'Кол-во' },
  },
  order: {
    qnt: { label: 'Количество в заказе', short: 'Кол-во' },
  },
}

type UiKey = keyof typeof common

export function dict(key: UiKey, type: 'label' | 'short' | 'hint' = 'label', ctx?: string): string {
  const override = ctx ? context[ctx]?.[key] : undefined
  const def: UiDef = override ?? common[key]
  if (type === 'short') return def.short ?? def.label
  if (type === 'hint')  return def.hint ?? ''
  return def.label
}
