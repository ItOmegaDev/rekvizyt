import assert from 'node:assert/strict'
import test from 'node:test'
import {
  amountInWordsUAH,
  buildCustomerPreamble,
  buildExecutorPreamble,
  calcItemAmount,
  formatAmount,
  formatDateDoc,
  formatDateQuoted,
  formatDateShort,
  formatMoney,
  formatQty,
  intToWords,
  isValidIban,
  isValidISODate,
  monthKey,
  monthNumber,
  parseAmountToMinor,
  suggestedNumber,
  todayISO,
} from '@rekvizyt/shared'

test('сума словами: гривні та копійки', () => {
  const words = amountInWordsUAH(690_000)
  assert.equal(words.words, 'Шість тисяч дев’ятсот')
  assert.equal(words.hryvniaWord, 'гривень')
  assert.equal(words.kopecks, '00')
  assert.equal(words.kopecksWord, 'копійок')
  assert.equal(words.full, 'Шість тисяч дев’ятсот гривень 00 копійок')
})

test('сума словами: узгодження роду й числа', () => {
  assert.equal(amountInWordsUAH(100).words, 'Одна')
  assert.equal(amountInWordsUAH(100).hryvniaWord, 'гривня')
  assert.equal(amountInWordsUAH(200).hryvniaWord, 'гривні')
  assert.equal(amountInWordsUAH(500).hryvniaWord, 'гривень')
  assert.equal(amountInWordsUAH(2_100).words, 'Двадцять одна')
  assert.equal(amountInWordsUAH(1_000_00).words, 'Одна тисяча')
  assert.equal(amountInWordsUAH(11_000_00).words, 'Одинадцять тисяч')
  assert.equal(amountInWordsUAH(690_050).kopecks, '50')
  assert.equal(amountInWordsUAH(690_050).kopecksWord, 'копійок')
  assert.equal(amountInWordsUAH(690_041).kopecksWord, 'копійка')
  assert.equal(amountInWordsUAH(690_042).kopecksWord, 'копійки')
})

test('intToWords: нуль і великі розряди', () => {
  assert.equal(intToWords(0), 'нуль')
  assert.equal(intToWords(1_000_000), 'один мільйон')
  assert.equal(intToWords(2_000_000), 'два мільйони')
  assert.equal(intToWords(5_000_000), 'п’ять мільйонів')
})

test('formatMoney: розряди через нерозривний пробіл', () => {
  assert.equal(formatMoney(690_000), '6\u00A0900,00')
  assert.equal(formatMoney(123_456_789), '1\u00A0234\u00A0567,89')
  assert.equal(formatMoney(0), '0,00')
  assert.equal(formatAmount(690_000), '6\u00A0900')
  assert.equal(formatAmount(690_050), '6\u00A0900,50')
})

test('parseAmountToMinor: людський ввід → копійки', () => {
  assert.equal(parseAmountToMinor('6900'), 690_000)
  assert.equal(parseAmountToMinor('6 900,50'), 690_050)
  assert.equal(parseAmountToMinor('1234.5'), 123_450)
  assert.equal(parseAmountToMinor('0,05'), 5)
  assert.equal(parseAmountToMinor(''), null)
  assert.equal(parseAmountToMinor('12,345'), null)
  assert.equal(parseAmountToMinor('abc'), null)
  assert.equal(parseAmountToMinor('-10'), null)
})

test('formatQty: без зайвих нулів', () => {
  assert.equal(formatQty(23), '23')
  assert.equal(formatQty(1.5), '1,5')
  assert.equal(formatQty(0.25), '0,25')
})

test('calcItemAmount: округлення до копійки', () => {
  assert.equal(calcItemAmount(1, 690_000), 690_000)
  assert.equal(calcItemAmount(3, 3333), 9999)
  assert.equal(calcItemAmount(1.5, 10_000), 15_000)
})

test('дати: українські формати', () => {
  assert.equal(formatDateDoc('2026-10-30'), '30 жовтня 2026 р.')
  assert.equal(formatDateQuoted('2026-10-30'), '«30» жовтня 2026 року')
  assert.equal(formatDateShort('2026-01-05'), '05.01.2026')
  assert.equal(monthKey('2026-10-30'), '2026-10')
  assert.equal(monthNumber('2026-10-30'), '10')
  assert.equal(isValidISODate('2026-02-30'), false)
  assert.equal(isValidISODate('2024-02-29'), true)
  assert.equal(isValidISODate('2026-13-01'), false)
  assert.match(todayISO(), /^\d{4}-\d{2}-\d{2}$/)
})

test('нумерація: NN-MM', () => {
  assert.equal(suggestedNumber(11, '10'), '11-10')
  assert.equal(suggestedNumber(1, '01'), '1-01')
})

test('IBAN: контрольна сума mod-97', () => {
  assert.equal(isValidIban('UA103052990000026005005909870'), true)
  assert.equal(isValidIban('UA213220010000026004330079326'), true)
  assert.equal(isValidIban('UA213052990000026002046208715'), true)
  // Одна цифра змінена — сума не сходиться.
  assert.equal(isValidIban('UA103052990000026005005909871'), false)
  assert.equal(isValidIban('UA123'), false)
})

test('вступні фрази акта', () => {
  const tov = buildCustomerPreamble({
    type: 'tov',
    fullName: 'ТОВ «ПРИКЛАД»',
    signerPositionGenitive: 'директора',
    signerNameGenitive: 'Івана Івановича',
    signerGender: 'm',
    basis: 'Статуту',
    registrationRecord: '',
  })
  assert.match(tov, /надалі «Замовник», в особі директора/)
  assert.match(tov, /який діє на підставі Статуту/)

  const fop = buildCustomerPreamble({
    type: 'fop',
    fullName: 'ФОП Петренко Петро Петрович',
    signerPositionGenitive: '',
    signerNameGenitive: '',
    signerGender: 'f',
    basis: '',
    registrationRecord: '24800000000091302',
  })
  assert.match(fop, /іменоване надалі «Замовник»/)
  assert.match(fop, /24800000000091302/)

  const executor = buildExecutorPreamble({
    fullName: 'ФОП Кучеренко Олексій Володимирович',
    registrationRecord: '',
  })
  assert.match(executor, /«Виконавець»/)
})
