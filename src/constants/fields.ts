interface FieldDef {
  label: string
  short: string
}

type FieldMap = Record<string, FieldDef>

// Базовые метки — используются по умолчанию
const common: FieldMap = {
  good_id:            { label: 'Артикул',        short: 'Артикул'        },
  good_name:          { label: 'Название товара',    short: 'Название'   },
  good_type:          { label: 'Тип товара',         short: 'Тип'        },
  gtr_name:           { label: 'Типоразмер товара',     short: 'Типоразмер'     },
  qnt:                { label: 'Количество',         short: 'Кол-во'     },
  price:              { label: 'Цена',               short: 'Цена'       },
  weight:             { label: 'Вес, г',             short: 'Вес'        },
  length:             { label: 'Длина, мм',          short: 'Длина'      },
  width:              { label: 'Ширина, мм',         short: 'Ширина'     },
  height:             { label: 'Высота, мм',         short: 'Высота'     },
  qual_type:          { label: 'Качество товара',       short: 'Качество'   },
  stock:              { label: 'Остаток',            short: 'Остаток'    },
  quarantine:         { label: 'Карантин',           short: 'Карантин'   },
  long_storage:       { label: 'Долгое хранение',    short: 'Долг. хр.'  },
  orders_inwork:      { label: 'Заказы в работе',    short: 'В работе'   },
  orders_wait:        { label: 'Заказы в ожидании',  short: 'Ожидание'   },
  created_at:         { label: 'Дата создания',      short: 'Создан'     },
  indoc_id:           { label: 'Номер входящего документа',    short: 'Номер документа'      },
  indoc_type_descrip: { label: 'Тип входящего документа',      short: 'Тип документа'        },
  indoc_txt:          { label: 'Примечание',         short: 'Примечание' },
  outdoc_id:          { label: 'Номер исходящего документа',    short: 'Номер документа'      },
  outdoc_type_descrip:{ label: 'Тип документа',      short: 'Тип'        },
  outdoc_date:        { label: 'Дата документа',     short: 'Дата'       },
  outdoc_txt:         { label: 'Примечание',         short: 'Примечание' },
  order_id:           { label: 'Номер заказа',       short: 'Номер'      },
  state:              { label: 'Статус',             short: 'Статус'     },
  origin:             { label: 'Маркетплейс',        short: 'Маркетпл.'  },
  delivery_id:        { label: 'Код службы доставки',        short: 'Код СД'   },
  delivery_name:      { label: 'Служба доставки',    short: 'Доставка'   },
  canceled:           { label: 'Отменён',            short: 'Отменён'    },
  plan_qnt:           { label: 'Плановое количество',short: 'План'       },
  sn_mandant:         { label: 'Серийный номер',     short: 'Серийный №' },
  good_sn:            { label: 'Серийный номер',     short: 'Серийный №' },
  inout:              { label: 'Направление',        short: 'Напр.'      },
  attribute_name:     { label: 'Атрибут',            short: 'Атрибут'    },
  attribute_type:     { label: 'Тип атрибута',       short: 'Тип'        },
  value:              { label: 'Значение',           short: 'Значение'   },
  event_type:         { label: 'Событие',            short: 'Событие'    },
  locked:             { label: 'Блокировка',         short: 'Блок.'      },
}

// Контекстные переопределения — только там где смысл реально отличается
const context: Record<string, Partial<FieldMap>> = {
  indoc: {
    qnt: { label: 'Количество по документу', short: 'Кол-во' },
  },
  order: {
    qnt: { label: 'Количество в заказе', short: 'Кол-во' },
  },
}

export function field(name: string, ctx?: string): FieldDef {
  const override = ctx ? context[ctx]?.[name] : undefined
  return override ?? common[name] ?? { label: name, short: name }
}

// Для удобного деструктурирования: field('good_id').label
export { common as FIELDS }
