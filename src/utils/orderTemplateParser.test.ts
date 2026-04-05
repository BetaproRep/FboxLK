import { describe, it, expect } from 'vitest'
import { parseColumnSchema, parseOrderTemplate, BOOL_TRUE_VALUES, BOOL_FALSE_VALUES } from './orderTemplateParser'

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
  'order_id:str*', 'delivery_id:int*', 'client.name:str', 'client.phone:str',
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
    expect(errors).toHaveLength(0)
    expect(orders).toHaveLength(1)
    expect(orders[0].order_id).toBe('ORD-1')
    expect(orders[0].delivery_id).toBe(101)
    expect(orders[0].client?.name).toBe('Иванов')
    expect(orders[0].goods).toHaveLength(1)
    expect(orders[0].goods![0].good_id).toBe('AR-1')
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
    expect(orders[0].client?.name).toBe('Иванов')
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
    expect(orders[0].goods).toHaveLength(3)
    expect(orders[0].dev101?.products).toHaveLength(1)
  })

  it('массив отсутствует если все ячейки пустые', () => {
    const rows = [
      HEADER_ROW,
      DSL_ROW,
      ['ORD-1', 101, '', '', '', '', '', '', '', ''],
    ]
    const { orders } = parseOrderTemplate(rows)
    expect(orders[0].goods).toBeUndefined()
    expect(orders[0].dev101?.products).toBeUndefined()
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
    expect(orders[0].dev101?.mailtype).toBe(1)
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
    expect(parseOrderTemplate(rows).orders[0].delivery?.part_deliv).toBe(true)

    const rows2 = [['h1','h2','h3'], dsl, ['ORD-1', 101, 'YES']]
    expect(parseOrderTemplate(rows2).orders[0].delivery?.part_deliv).toBe(true)

    const rows3 = [['h1','h2','h3'], dsl, ['ORD-1', 101, 1]]
    expect(parseOrderTemplate(rows3).orders[0].delivery?.part_deliv).toBe(true)
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
      'order_id:str*', 'delivery_id:int*',
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
