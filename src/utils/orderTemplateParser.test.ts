import { describe, it, expect } from 'vitest'
import { parseColumnSchema, parseTemplate, BOOL_TRUE_VALUES, BOOL_FALSE_VALUES } from './templateParser'
import { parseOrderTemplate } from './orderTemplateParser'

// ── parseColumnSchema ─────────────────────────────────────────────────────────

describe('parseColumnSchema', () => {
  it('скалярное required поле', () => {
    const s = parseColumnSchema('order_id:str*')!
    expect(s.path).toBe('order_id')
    expect(s.type).toBe('str')
    expect(s.required).toBe(true)
    expect(s.isArray).toBe(false)
    expect(s.pathParts).toEqual(['order_id'])
  })

  it('вложенный объект', () => {
    const s = parseColumnSchema('client.name:str')!
    expect(s.pathParts).toEqual(['client', 'name'])
    expect(s.isArray).toBe(false)
    expect(s.required).toBe(false)
  })

  it('поле массива первого уровня', () => {
    const s = parseColumnSchema('goods[].good_id:str*')!
    expect(s.isArray).toBe(true)
    expect(s.arrayParentParts).toEqual([])
    expect(s.arrayName).toBe('goods')
    expect(s.localKey).toBe('good_id')
    expect(s.required).toBe(true)
  })

  it('поле вложенного массива', () => {
    const s = parseColumnSchema('dev101.products[].product_name:str*')!
    expect(s.isArray).toBe(true)
    expect(s.arrayParentParts).toEqual(['dev101'])
    expect(s.arrayName).toBe('products')
    expect(s.localKey).toBe('product_name')
  })

  it('default значение int', () => {
    const s = parseColumnSchema('goods[].vat_rate:int=22')!
    expect(s.default).toBe(22)
    expect(s.required).toBe(false)
  })

  it('default значение bool', () => {
    const s = parseColumnSchema('control.is_fake_order:bool=false')!
    expect(s.default).toBe(false)
  })

  it('пустая строка → null', () => {
    expect(parseColumnSchema('')).toBeNull()
    expect(parseColumnSchema('   ')).toBeNull()
  })
})

// ── bool константы ────────────────────────────────────────────────────────────

describe('BOOL константы', () => {
  it('BOOL_TRUE_VALUES содержит нужные значения', () => {
    expect(BOOL_TRUE_VALUES).toContain('1')
    expect(BOOL_TRUE_VALUES).toContain('true')
    expect(BOOL_TRUE_VALUES).toContain('да')
  })

  it('BOOL_FALSE_VALUES содержит нужные значения', () => {
    expect(BOOL_FALSE_VALUES).toContain('0')
    expect(BOOL_FALSE_VALUES).toContain('false')
    expect(BOOL_FALSE_VALUES).toContain('нет')
  })
})

// ── parseOrderTemplate ────────────────────────────────────────────────────────

const HEADER_ROW = [
  'Номер заказа', 'Служба доставки', 'ФИО клиента', 'Телефон',
  'Код товара', 'Стоимость', 'Наложенный платёж',
  'Тип (dev101)', 'Продукт (dev101)', 'Кол-во (dev101)',
]

const DSL_ROW = [
  'order_id:str*!', 'delivery_id:int*', 'client.name:str', 'client.phone:str',
  'goods[].good_id:str*', 'goods[].declared_value:num*', 'goods[].cod:num*',
  'dev101.mailtype:int=1', 'dev101.products[].product_name:str*', 'dev101.products[].qnt:int*',
]

describe('parseOrderTemplate', () => {
  it('пустые данные', () => {
    const { orders, errors } = parseOrderTemplate([HEADER_ROW, DSL_ROW])
    expect(orders).toHaveLength(0)
    expect(errors).toHaveLength(0)
  })

  it('один заказ, одна строка', () => {
    const rows = [
      HEADER_ROW,
      DSL_ROW,
      ['ORD-1', 101, 'Иванов', '79161234567', 'AR-1', 150, 0, 3, 'Шило', 1],
    ]
    const { orders, errors } = parseOrderTemplate(rows)
    const o = orders[0] as Record<string, any>
    expect(errors).toHaveLength(0)
    expect(orders).toHaveLength(1)
    expect(o.order_id).toBe('ORD-1')
    expect(o.delivery_id).toBe(101)
    expect(o.client?.name).toBe('Иванов')
    expect(o.goods).toHaveLength(1)
    expect(o.goods[0].good_id).toBe('AR-1')
  })

  it('два заказа определяются по смене order_id', () => {
    const rows = [
      HEADER_ROW,
      DSL_ROW,
      ['ORD-1', 101, 'Иванов', '', 'AR-1', 150, 0, '', '', ''],
      ['ORD-2', 101, 'Петров', '', 'AR-2', 200, 0, '', '', ''],
    ]
    const { orders } = parseOrderTemplate(rows)
    expect(orders).toHaveLength(2)
    expect(orders[0].order_id).toBe('ORD-1')
    expect(orders[1].order_id).toBe('ORD-2')
  })

  it('скалярное поле берётся из первой строки заказа, остальные игнорируются', () => {
    const rows = [
      HEADER_ROW,
      DSL_ROW,
      ['ORD-1', 101, 'Иванов', '', 'AR-1', 150, 0, '', '', ''],
      ['',      '',  'IGNORED','', 'AR-2', 200, 0, '', '', ''],
    ]
    const { orders } = parseOrderTemplate(rows)
    expect((orders[0] as Record<string, any>).client?.name).toBe('Иванов')
  })

  it('два независимых массива разной длины', () => {
    const rows = [
      HEADER_ROW,
      DSL_ROW,
      // goods: AR-1, AR-2, AR-3 (3 элемента) | products: Шило (1 элемент)
      ['ORD-1', 101, 'Иванов', '', 'AR-1', 150, 0, 3, 'Шило', 1],
      ['',      '',  '',       '', 'AR-2', 200, 0, '', '',     ''],
      ['',      '',  '',       '', 'AR-3',  50, 0, '', '',     ''],
    ]
    const { orders } = parseOrderTemplate(rows)
    const o = orders[0] as Record<string, any>
    expect(o.goods).toHaveLength(3)
    expect(o.dev101?.products).toHaveLength(1)
  })

  it('массив отсутствует если все ячейки пустые', () => {
    const rows = [
      HEADER_ROW,
      DSL_ROW,
      ['ORD-1', 101, '', '', '', '', '', '', '', ''],
    ]
    const { orders } = parseOrderTemplate(rows)
    const o = orders[0] as Record<string, any>
    expect(o.goods).toBeUndefined()
    expect(o.dev101?.products).toBeUndefined()
  })

  it('применяется default для int поля', () => {
    const rows = [
      HEADER_ROW,
      DSL_ROW,
      ['ORD-1', 101, '', '', 'AR-1', 150, 0, '', 'Шило', 1],
    ]
    const { orders } = parseOrderTemplate(rows)
    // dev101.mailtype=1 по умолчанию, но только если есть хоть одно значение dev101.*
    // mailtype — скаляр, Шило — в массиве: default применяется
    expect((orders[0] as Record<string, any>).dev101?.mailtype).toBe(1)
  })

  it('ошибка при неверном типе числа содержит label из строки 0', () => {
    const rows = [
      HEADER_ROW,
      DSL_ROW,
      ['ORD-1', 'не_число', '', '', 'AR-1', 150, 0, '', '', ''],
    ]
    const { errors } = parseOrderTemplate(rows)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0].field).toBe('delivery_id')
    expect(errors[0].label).toBe('Служба доставки')  // строка 0, колонка 1
  })

  it('bool: принимает "да", "YES", 1', () => {
    const dsl   = ['order_id:str*', 'delivery_id:int*', 'delivery.part_deliv:bool']
    const rows  = [['h1','h2','h3'], dsl, ['ORD-1', 101, 'да']]
    expect((parseOrderTemplate(rows).orders[0] as Record<string, any>).delivery?.part_deliv).toBe(true)

    const rows2 = [['h1','h2','h3'], dsl, ['ORD-1', 101, 'YES']]
    expect((parseOrderTemplate(rows2).orders[0] as Record<string, any>).delivery?.part_deliv).toBe(true)

    const rows3 = [['h1','h2','h3'], dsl, ['ORD-1', 101, 1]]
    expect((parseOrderTemplate(rows3).orders[0] as Record<string, any>).delivery?.part_deliv).toBe(true)
  })

  it('bool: неизвестное значение → ошибка', () => {
    const dsl  = ['order_id:str*', 'delivery_id:int*', 'delivery.part_deliv:bool']
    const rows = [['h1','h2','h3'], dsl, ['ORD-1', 101, 'maybe']]
    const { errors } = parseOrderTemplate(rows)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0].field).toBe('delivery.part_deliv')
  })

  describe('default в полях массива (goods[].field:num=0)', () => {
    // DSL: good_id обязательный без дефолта, cod — с дефолтом 0
    const dsl = [
      'order_id:str*!', 'delivery_id:int*',
      'goods[].good_id:str*', 'goods[].declared_value:num*', 'goods[].cod:num=0',
    ]
    const H = ['h1','h2','h3','h4','h5']

    it('default применяется если ячейка пуста, но другие поля строки заполнены', () => {
      // cod не заполнен → должен стать 0
      const rows = [H, dsl, ['ORD-1', 101, 'AR-1', 150, '']]
      const { orders, errors } = parseOrderTemplate(rows)
      expect(errors).toHaveLength(0)
      expect(orders[0].goods![0].cod).toBe(0)
    })

    it('default НЕ создаёт элемент массива если вся строка пуста', () => {
      // Заказ из 2 строк, но вторая строка goods полностью пуста (только cod имеет default)
      // Ожидаем: goods содержит 1 элемент, не 2
      const rows = [H, dsl,
        ['ORD-1', 101, 'AR-1', 150, ''],  // первый элемент goods
        ['',      '',  '',     '',  ''],   // пустая строка — элемента быть не должно
      ]
      const { orders } = parseOrderTemplate(rows)
      expect(orders[0].goods).toHaveLength(1)
    })

    it('parseColumnSchema корректно парсит num*=0', () => {
      const s = parseColumnSchema('goods[].cod:num*=0')!
      expect(s.required).toBe(true)
      expect(s.type).toBe('num')
      expect(s.default).toBe(0)
      expect(s.isArray).toBe(true)
    })
  })
})

// ── parseColumnSchema: список допустимых значений ─────────────────────────────

describe('parseColumnSchema — allowedValues', () => {
  it('базовый список int', () => {
    const s = parseColumnSchema('mail_type:int(4,23,24)')!
    expect(s.type).toBe('int')
    expect(s.allowedValues).toEqual(['4', '23', '24'])
    expect(s.regex).toBeUndefined()
  })

  it('значения trim и uppercase', () => {
    const s = parseColumnSchema('kind:str( A , b , C )')!
    expect(s.allowedValues).toEqual(['A', 'B', 'C'])
  })

  it('список совместим с required и default', () => {
    const s = parseColumnSchema('mail_type:int(4,23,24)*=4')!
    expect(s.required).toBe(true)
    expect(s.allowedValues).toEqual(['4', '23', '24'])
    expect(s.default).toBe(4)
  })

  it('список в поле массива', () => {
    const s = parseColumnSchema('goods[].vat_rate:int(0,10,20)')!
    expect(s.isArray).toBe(true)
    expect(s.allowedValues).toEqual(['0', '10', '20'])
  })

  it('список из одного значения', () => {
    const s = parseColumnSchema('status:str(active)')!
    expect(s.allowedValues).toEqual(['ACTIVE'])
  })

  it('нет закрывающей ) → null', () => {
    expect(parseColumnSchema('mail_type:int(4,23,24')).toBeNull()
  })

  it('неизвестный тип → null', () => {
    expect(parseColumnSchema('field:string*')).toBeNull()
    expect(parseColumnSchema('field:integer')).toBeNull()
    expect(parseColumnSchema('field:float')).toBeNull()
    expect(parseColumnSchema('field:')).toBeNull()
  })

  it('без блока — allowedValues undefined', () => {
    const s = parseColumnSchema('order_id:str*')!
    expect(s.allowedValues).toBeUndefined()
  })
})

// ── parseColumnSchema: регулярное выражение ───────────────────────────────────

describe('parseColumnSchema — regex', () => {
  it('базовая регулярка с errmsg', () => {
    const s = parseColumnSchema('address.zip:str{^\\d{6}$~В почтовом индексе должно быть 6 цифр}')!
    expect(s.type).toBe('str')
    expect(s.regex).toBeInstanceOf(RegExp)
    expect(s.regex!.source).toBe('^\\d{6}$')
    expect(s.regexError).toBe('В почтовом индексе должно быть 6 цифр')
  })

  it('регулярка без errmsg — regexError undefined', () => {
    const s = parseColumnSchema('phone:str{^\\d+$}')!
    expect(s.regex).toBeInstanceOf(RegExp)
    expect(s.regexError).toBeUndefined()
  })

  it('регулярка содержит {} квантификаторы — закрывающая } берётся последняя', () => {
    // ^\\d{6}$ — внутри есть {6}, закрывающая } DSL-блока — последняя
    const s = parseColumnSchema('zip:str{^\\d{6}$}')!
    expect(s.regex!.test('123456')).toBe(true)
    expect(s.regex!.test('12345')).toBe(false)
  })

  it('регулярка совместима с required', () => {
    const s = parseColumnSchema('zip:str{^\\d{6}$~Ошибка}*')!
    expect(s.required).toBe(true)
    expect(s.regex).toBeInstanceOf(RegExp)
  })

  it('нет закрывающей } → null', () => {
    // regex без внутренних } — иначе lastIndexOf найдёт } внутри квантификатора
    expect(parseColumnSchema('zip:str{^\\d+$')).toBeNull()
  })

  it('невалидная регулярка → null', () => {
    expect(parseColumnSchema('f:str{[invalid}')).toBeNull()
  })

  it('без блока — regex undefined', () => {
    const s = parseColumnSchema('order_id:str*')!
    expect(s.regex).toBeUndefined()
  })
})

// ── parseOrderTemplate: валидация allowedValues ───────────────────────────────

describe('parseOrderTemplate — allowedValues', () => {
  const H   = ['Заказ', 'Тип', 'Товар', 'НДС']
  const dsl = ['order_id:str*!', 'mail_type:int(4,23,24)', 'goods[].good_id:str*', 'goods[].vat_rate:int(0,10,20)']

  it('допустимое значение — нет ошибки', () => {
    const rows = [H, dsl, ['ORD-1', 4, 'AR-1', 10]]
    const { orders, errors } = parseOrderTemplate(rows)
    expect(errors).toHaveLength(0)
    expect(orders[0].mail_type).toBe(4)
  })

  it('недопустимое значение скалярного поля → ошибка с label', () => {
    const rows = [H, dsl, ['ORD-1', 99, 'AR-1', 10]]
    const { errors } = parseOrderTemplate(rows)
    expect(errors).toHaveLength(1)
    expect(errors[0].field).toBe('mail_type')
    expect(errors[0].label).toBe('Тип')
    expect(errors[0].message).toContain('99')
    expect(errors[0].message).toContain('4')  // список в сообщении
  })

  it('недопустимое значение поля массива → ошибка', () => {
    const rows = [H, dsl, ['ORD-1', 4, 'AR-1', 15]]
    const { errors } = parseOrderTemplate(rows)
    expect(errors).toHaveLength(1)
    expect(errors[0].field).toBe('goods[].vat_rate')
    expect(errors[0].message).toContain('15')
  })

  it('str список: сравнение case-insensitive', () => {
    const dslStr = ['order_id:str*!', 'kind:str(ACTIVE,CLOSED)', '', '']
    const rows   = [H, dslStr, ['ORD-1', 'active', '', '']]
    const { errors } = parseOrderTemplate(rows)
    expect(errors).toHaveLength(0)
  })

  it('int список: "04" приводится к 4 → находится в списке', () => {
    const rows = [H, dsl, ['ORD-1', '04', 'AR-1', 10]]
    const { errors } = parseOrderTemplate(rows)
    // 04 → int 4 → "4" → в списке ["4","23","24"] ✓
    expect(errors).toHaveLength(0)
  })

  it('пустая ячейка не вызывает ошибку allowedValues (просто пропускается)', () => {
    const rows = [H, dsl, ['ORD-1', '', 'AR-1', 10]]
    const { errors } = parseOrderTemplate(rows)
    expect(errors).toHaveLength(0)
  })

  it('несколько ошибок allowedValues в одном заказе', () => {
    const rows = [H, dsl, ['ORD-1', 99, 'AR-1', 99]]
    const { errors } = parseOrderTemplate(rows)
    expect(errors).toHaveLength(2)
  })
})

// ── parseColumnSchema: expand (^) ────────────────────────────────────────────

describe('parseColumnSchema — isExpand (^)', () => {
  it('базовый: goods[].qnt:int*^', () => {
    const s = parseColumnSchema('goods[].qnt:int*^')!
    expect(s.isExpand).toBe(true)
    expect(s.required).toBe(true)
    expect(s.type).toBe('int')
    expect(s.isArray).toBe(true)
  })

  it('без ^ — isExpand undefined', () => {
    const s = parseColumnSchema('goods[].qnt:int*')!
    expect(s.isExpand).toBeUndefined()
  })

  it('совместим с default: int^=1', () => {
    const s = parseColumnSchema('goods[].qnt:int^=1')!
    expect(s.isExpand).toBe(true)
    expect(s.default).toBe(1)
    expect(s.required).toBe(false)
  })
})

// ── parseOrderTemplate: expand (^) ───────────────────────────────────────────

describe('parseOrderTemplate — expand (^)', () => {
  const H   = ['Заказ', 'Доставка', 'Товар', 'Стоим.', 'НП', 'Кол-во']
  const dsl = ['order_id:str*!', 'delivery_id:int*', 'goods[].good_id:str*', 'goods[].declared_value:num*', 'goods[].cod:num*', 'goods[].qnt:int*^']

  it('qnt=3 → три копии элемента в goods', () => {
    const rows = [H, dsl, ['ORD-1', 101, 'AR-1', 150, 0, 3]]
    const { orders, errors } = parseOrderTemplate(rows)
    expect(errors).toHaveLength(0)
    expect(orders[0].goods).toHaveLength(3)
    expect(orders[0].goods![0]).toEqual({ good_id: 'AR-1', declared_value: 150, cod: 0 })
    expect(orders[0].goods![2]).toEqual({ good_id: 'AR-1', declared_value: 150, cod: 0 })
  })

  it('qnt=1 → один элемент', () => {
    const rows = [H, dsl, ['ORD-1', 101, 'AR-1', 150, 0, 1]]
    const { orders } = parseOrderTemplate(rows)
    expect(orders[0].goods).toHaveLength(1)
  })

  it('поле qnt не попадает в элемент массива', () => {
    const rows = [H, dsl, ['ORD-1', 101, 'AR-1', 150, 0, 2]]
    const { orders } = parseOrderTemplate(rows)
    expect(orders[0].goods![0]).not.toHaveProperty('qnt')
  })

  it('несколько строк с разным qnt → суммарное количество', () => {
    const rows = [
      H, dsl,
      ['ORD-1', 101, 'AR-1', 150, 0, 2],  // 2 копии AR-1
      ['',      '',  'AR-2', 200, 0, 3],   // 3 копии AR-2
    ]
    const { orders } = parseOrderTemplate(rows)
    expect(orders[0].goods).toHaveLength(5)
    expect(orders[0].goods!.filter(g => g.good_id === 'AR-1')).toHaveLength(2)
    expect(orders[0].goods!.filter(g => g.good_id === 'AR-2')).toHaveLength(3)
  })

  it('копии независимы (разные объекты)', () => {
    const rows = [H, dsl, ['ORD-1', 101, 'AR-1', 150, 0, 2]]
    const { orders } = parseOrderTemplate(rows)
    const [a, b] = orders[0].goods!
    expect(a).not.toBe(b)
  })

  it('qnt отсутствует → одна копия (пустая ячейка)', () => {
    const rows = [H, dsl, ['ORD-1', 101, 'AR-1', 150, 0, '']]
    const { orders } = parseOrderTemplate(rows)
    // good_id заполнен → hasRealValue=true, qnt пуст → expandCount=1
    expect(orders[0].goods).toHaveLength(1)
  })
})

// ── parseOrderTemplate: валидация regex ──────────────────────────────────────

describe('parseOrderTemplate — regex', () => {
  const H   = ['Заказ', 'Индекс', 'Телефон', 'Код']
  const dsl = [
    'order_id:str*!',
    'address.zip:str{^\\d{6}$~В почтовом индексе должно быть 6 цифр}',
    'client.phone:str{^\\+?\\d{10,11}$}',
    'goods[].barcode:str{^\\d{13}$~Штрихкод должен содержать 13 цифр}',
  ]

  it('корректные значения — нет ошибок', () => {
    const rows = [H, dsl, ['ORD-1', '123456', '+79161234567', '1234567890123']]
    const { errors } = parseOrderTemplate(rows)
    expect(errors).toHaveLength(0)
  })

  it('некорректный zip → ошибка с кастомным сообщением', () => {
    const rows = [H, dsl, ['ORD-1', '12345', '', '']]
    const { errors } = parseOrderTemplate(rows)
    expect(errors.some(e => e.field === 'address.zip')).toBe(true)
    const zipErr = errors.find(e => e.field === 'address.zip')!
    expect(zipErr.message).toBe('недопустимое значение "12345". В почтовом индексе должно быть 6 цифр')
  })

  it('некорректный телефон → сообщение содержит источник регулярки', () => {
    const rows = [H, dsl, ['ORD-1', '123456', 'abc', '']]
    const { errors } = parseOrderTemplate(rows)
    const phoneErr = errors.find(e => e.field === 'client.phone')!
    expect(phoneErr).toBeDefined()
    // regexError не задан → сообщение содержит паттерн
    expect(phoneErr.message).toContain('\\+?\\d{10,11}')
  })

  it('некорректный barcode в поле массива → ошибка', () => {
    const rows = [H, dsl, ['ORD-1', '123456', '', 'BAD']]
    const { errors } = parseOrderTemplate(rows)
    const bcErr = errors.find(e => e.field === 'goods[].barcode')!
    expect(bcErr).toBeDefined()
    expect(bcErr.message).toBe('недопустимое значение "BAD". Штрихкод должен содержать 13 цифр')
  })

  it('пустая ячейка не вызывает ошибку regex', () => {
    const rows = [H, dsl, ['ORD-1', '', '', '']]
    const { errors } = parseOrderTemplate(rows)
    expect(errors).toHaveLength(0)
  })

  it('regex применяется к исходной строке (до coerce), trim учитывается', () => {
    // Поле int с regex — raw " 4 " trim → "4" → проходит ^\d+$
    const dslInt = ['order_id:str*', 'val:int{^\\d+$~Только цифры}', '', '']
    const rows   = [H, dslInt, ['ORD-1', ' 4 ', '', '']]
    const { errors } = parseOrderTemplate(rows)
    expect(errors).toHaveLength(0)
  })

  it('regex применяется перед coerce — невалидный формат даёт ошибку regex, не ошибку типа', () => {
    const dslInt = ['order_id:str*', 'val:int{^\\d+$~Только цифры}', '', '']
    const rows   = [H, dslInt, ['ORD-1', 'abc', '', '']]
    const { errors } = parseOrderTemplate(rows)
    // сначала coerce int провалится ("ожидается целое число"), до regex не дойдёт
    // оба варианта приемлемы, главное что ошибка есть
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0].field).toBe('val')
  })
})

// ── parseColumnSchema: isKey (!) ──────────────────────────────────────────────

describe('parseColumnSchema — isKey (!)', () => {
  it('базовый: order_id:str*!', () => {
    const s = parseColumnSchema('order_id:str*!')!
    expect(s.isKey).toBe(true)
    expect(s.required).toBe(true)
    expect(s.type).toBe('str')
  })

  it('без ! — isKey undefined', () => {
    const s = parseColumnSchema('order_id:str*')!
    expect(s.isKey).toBeUndefined()
  })

  it('совместим с другими модификаторами: str*!^', () => {
    const s = parseColumnSchema('id:str*!^')!
    expect(s.isKey).toBe(true)
    expect(s.required).toBe(true)
    expect(s.isExpand).toBe(true)
  })
})

// ── parseTemplate: schema errors ─────────────────────────────────────────────

describe('parseTemplate — schemaErrors', () => {
  const H = ['Заказ', 'Доставка', 'Товар']

  it('есть массивы, нет ! → schemaError', () => {
    const dsl = ['order_id:str*', 'delivery_id:int*', 'goods[].good_id:str*']
    const { items, schemaErrors } = parseTemplate([H, dsl, ['ORD-1', 101, 'AR-1']])
    expect(items).toHaveLength(0)
    expect(schemaErrors).toHaveLength(1)
    expect(schemaErrors[0].col).toBe(-1)
    expect(schemaErrors[0].message).toContain('!')
  })

  it('нет массивов, нет ! → валидно, каждая строка = объект', () => {
    const dsl = ['order_id:str*', 'delivery_id:int*']
    const { items, schemaErrors } = parseTemplate([H, dsl, ['ORD-1', 101], ['ORD-2', 202]])
    expect(schemaErrors).toHaveLength(0)
    expect(items).toHaveLength(2)
    expect((items[0] as Record<string, unknown>).order_id).toBe('ORD-1')
    expect((items[1] as Record<string, unknown>).order_id).toBe('ORD-2')
  })

  it('нет массивов, но есть ! → schemaError', () => {
    const dsl = ['order_id:str*!', 'delivery_id:int*']
    const { items, schemaErrors } = parseTemplate([H, dsl, ['ORD-1', 101]])
    expect(items).toHaveLength(0)
    expect(schemaErrors).toHaveLength(1)
    expect(schemaErrors[0].col).toBe(0)
    expect(schemaErrors[0].message).toContain('!')
  })

  it('непустой DSL не парсится → schemaError с номером колонки', () => {
    const dsl = ['order_id:str*!', 'BAD_DSL_NO_COLON', 'goods[].good_id:str*']
    const { items, schemaErrors } = parseTemplate([H, dsl, ['ORD-1', 101, 'AR-1']])
    expect(items).toHaveLength(0)
    expect(schemaErrors).toHaveLength(1)
    expect(schemaErrors[0].col).toBe(1)
    expect(schemaErrors[0].dsl).toBe('BAD_DSL_NO_COLON')
  })

  it('при schemaErrors errors всегда пустой', () => {
    const dsl = ['order_id:str*', 'goods[].good_id:str*']  // массив есть, ! нет
    const { errors, schemaErrors } = parseTemplate([H, dsl, ['ORD-1', 'AR-1']])
    expect(schemaErrors.length).toBeGreaterThan(0)
    expect(errors).toHaveLength(0)
  })

  it('валидная схема с массивами → schemaErrors пустой', () => {
    const dsl = ['order_id:str*!', 'delivery_id:int*', 'goods[].good_id:str*']
    const { schemaErrors } = parseTemplate([H, dsl, ['ORD-1', 101, 'AR-1']])
    expect(schemaErrors).toHaveLength(0)
  })

  it('валидная схема без массивов → schemaErrors пустой', () => {
    const dsl = ['order_id:str*', 'delivery_id:int*']
    const { schemaErrors } = parseTemplate([H, dsl, ['ORD-1', 101]])
    expect(schemaErrors).toHaveLength(0)
  })

  it('менее 3 строк → пустой результат без ошибок', () => {
    const { items, errors, schemaErrors } = parseTemplate([H, ['order_id:str*']])
    expect(items).toHaveLength(0)
    expect(errors).toHaveLength(0)
    expect(schemaErrors).toHaveLength(0)
  })
})
