interface UiDef {
  label: string
  short?: string
  hint?: string
}

type UiMap = Record<string, UiDef>

const common = {
  attribute_name:       { label: 'Атрибут',                                              hint: 'Название дополнительного атрибута товара'                          },
  attribute_type:       { label: 'Тип атрибута',              short: 'Тип',              hint: 'Тип данных атрибута: строка, число и т.д.'                        },
  'btn.clipboard_load': { label: 'По списку из буфера',                                  hint: 'Скопируйте номер документа или список номеров из Excel в буфер обмена. Затем нажмите эту кнопку' },
  canceled:             { label: 'Отменён'                                               },
  clnt_name:            { label: 'ФИО клиента',                                          hint: 'ФИО клиента (получателя заказа)'                                   },
  created_at:           { label: 'Дата создания',             short: 'Создан',           hint: 'Дата и время создания документа'                                   },
  delivery_id:          { label: 'Код службы доставки',       short: 'Код СД',           hint: 'Код службы доставки, назначенной для заказа'                       },
  delivery_name:        { label: 'Служба доставки',           short: 'Доставка'          },
  event_type:           { label: 'Событие',                                              hint: 'Тип события в истории заказа'                                      },
  good_id:              { label: 'Артикул',                   short: 'Артикул',          hint: 'Артикул товара в вашей системе учёта'                              },
  good_state:           { label: 'Состояние товара',          short: 'Состояние',        hint: 'Зона хранения: основной склад, карантин или длительное хранение'    },
  good_name:            { label: 'Название товара',           short: 'Название',         hint: 'Наименование товара на складе'                                     },
  good_sn:              { label: 'Серийный номер',            short: 'Серийный №',       hint: 'Уникальный серийный номер единицы товара'                          },
  good_type:            { label: 'Тип товара',                short: 'Тип',              hint: 'Категория или тип товара'                                          },
  gtr_name:             { label: 'Типоразмер товара',         short: 'Типоразмер',       hint: 'Группа товаров с одинаковыми габаритами'                           },
  height:               { label: 'Высота, мм'                                            },
  indoc_id:             { label: 'Номер входящего документа', short: 'Номер документа',  hint: 'Уникальный номер документа в вашей системе учёта'                  },
  indoc_state:          { label: 'Статус документа',          short: 'Статус',           hint: 'Текущий статус обработки документа на складе: Ожидание (документ в работу не взяли), В работе, Выполнено' },
  indoc_txt:            { label: 'Примечание',                                           hint: 'Произвольный комментарий, указанный при создании документа'        },
  indoc_type_descrip:   { label: 'Тип входящего документа',  short: 'Тип документа',    hint: 'Вид операции: поставка товаров, отгрузка заказов и т.д.'           },
  inout:                { label: 'Направление',               short: 'Напр.',            hint: 'Направление движения товара: приход или расход'                    },
  length:               { label: 'Длина, мм'                                             },
  locked:               { label: 'Блокировка',               short: 'Блок.',            hint: 'Заблокированный документ не может быть изменён'                    },
  long_storage:         { label: 'Долгое хранение',          short: 'Долг. хр.',        hint: 'Товар перемещён на длительное хранение'                            },
  order_id:             { label: 'Номер заказа',              short: 'Номер',            hint: 'Номер заказа в вашей системе или на маркетплейсе'                  },
  orders_inwork:        { label: 'Заказы в работе',          short: 'В работе',         hint: 'Зарезервировано под заказы, находящиеся в работе'                  },
  orders_wait:          { label: 'Заказы в ожидании',        short: 'Ожидание',         hint: 'Зарезервировано под заказы в ожидании обработки'                   },
  origin:               { label: 'Маркетплейс',              short: 'Маркетпл.',        hint: 'Источник заказа: маркетплейс или канал продаж'                     },
  outdoc_date:          { label: 'Дата документа',           short: 'Дата',             hint: 'Дата проведения операции на складе'                                },
  outdoc_id:            { label: 'Номер исходящего документа',short: 'Номер документа', hint: 'Номер документа, сформированного складом по итогу операции'        },
  outdoc_txt:           { label: 'Примечание',                                           hint: 'Произвольный комментарий к исходящему документу'                   },
  outdoc_type_descrip:  { label: 'Тип документа',            short: 'Тип',              hint: 'Тип складской операции: оприходование, отгрузка, возврат и т.д.'   },
  plan_qnt:             { label: 'Количество',               short: 'Кол-во',           hint: 'Количество единиц товара ожидаемое в поставке'                     },
  price:                { label: 'Цена',                                                 hint: 'Цена единицы товара'                                               },
  qual_type:            { label: 'Качество товара',          short: 'Качество',         hint: 'Градация качества: норма/брак'                                     },
  quarantine:           { label: 'Карантин',                                             hint: 'Товар на карантине — временно недоступен для отгрузки'              },
  qnt:                  { label: 'Количество',               short: 'Кол-во',           hint: 'Количество единиц товара'                                          },
  shipment_picking:     { label: 'Кол-во в подборе'          },
  shipment_ready:       { label: 'Кол-во готово к отгрузке'  },
  sn_mandant:           { label: 'Серийный номер',           short: 'Серийный №',       hint: 'Требуется серийный номер при приёмке этого товара'                 },
  state:                { label: 'Статус',                                               hint: 'Текущий статус заказа'                                             },
  stock:                { label: 'Остаток',                                              hint: 'Доступный остаток на складе'                                       },
  value:                { label: 'Значение',                                             hint: 'Значение атрибута'                                                 },
  weight:               { label: 'Вес, г',                                               hint: 'Вес товара в граммах'                                              },
  width:                { label: 'Ширина, мм'                                            },
} satisfies UiMap

const context: Record<string, Partial<UiMap>> = {
  indoc: {
    qnt: { label: 'Количество по документу', short: 'Кол-во' },
  },
  order: {
    qnt: { label: 'Количество в заказе', short: 'Кол-во' },
  },
  goodsStock: {
    stock:            { label: 'Остаток на складе',              short: 'Остаток',      hint: 'Текущий физический остаток товара на складе'                                                                       },
    orders_inwork:    { label: 'Заказы в работе',                short: 'Заказы в работе',     hint: 'Кол-во товара, зарезервированного под заказы находящиеся в производстве'                                   },
    orders_wait:      { label: 'Заказы в ожидании',             short: 'Заказы в ожидании',   hint: 'Кол-во товара, зарезервированного под заказы не переданные в производство'                                         },
    shipment_picking: { label: 'Товар в подборе',                short: 'Товар в подборе',    hint: 'Кол-во товара по документам отгрузки, по которым начат, но не завершён подбор'                                    },
    shipment_ready:   { label: 'Товар подобран',                 short: 'Товар подобран',    hint: 'Кол-во товара, уже подобранного и готового к отгрузке по документам отгрузки товаров'                       },
    quarantine:       { label: 'Товар в карантине',              short: 'Карантин',     hint: 'Кол-во товара, временно недоступного для отгрузки — проходит проверку качества или карантинные процедуры'         },
    long_storage:     { label: 'Товар на длительном хранении',   short: 'Длительное хранение',   hint: 'Кол-во товара, перемещённого на склад длительного хранения'                                                          },
  },
}

const enums = {
  good_state: {
    stock:        'Складской остаток',
    quarantine:   'Карантин',
    long_storage: 'Долгое хранение',
  },
  qual_type: {
    useful:    'Норма',
    defective: 'Брак',
  },
  good_type: {
    good:        'Товар',
    flyer:       'Листовка',
    service:     'Услуга',
    advertising: 'Реклама',
    pack:        'Упаковка',
  },
} as const

export type UiKey = keyof typeof common

export function dict(key: UiKey, type: 'label' | 'short' | 'hint' = 'label', ctx?: string): string {
  const override = ctx ? context[ctx]?.[key] : undefined
  const def: UiDef = override ?? common[key]
  if (type === 'short') return def.short ?? def.label
  if (type === 'hint')  return def.hint ?? ''
  return def.label
}

export function dictEnum(enumName: keyof typeof enums, value: string): string {
  return (enums[enumName] as Record<string, string>)[value] ?? value
}

export function enumOptions(enumName: keyof typeof enums): { value: string; label: string }[] {
  return Object.entries(enums[enumName]).map(([value, label]) => ({ value, label }))
}
