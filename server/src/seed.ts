import { profileInputSchema, counterpartyInputSchema, contractInputSchema } from '@rekvizyt/shared'
import { getDb } from './db.js'
import { createContract, createCounterparty } from './repo/counterparties.js'
import { createProfile } from './repo/profiles.js'

const FOP = {
  name: 'ФОП Кучеренко Олексій Володимирович',
  fullName: 'Фізична особа-підприємець Кучеренко Олексій Володимирович',
  address: '61013, Харківська область, місто Харків, провулок Будівельний, будинок 1',
  taxId: '2963109131',
  phone: '+380 (50) 343-80-07',
  signerName: 'Олексій КУЧЕРЕНКО',
  registrationRecord: '2010350000000276533',
}

/**
 * Початкові довідники з ТЗ. Виконується лише на порожній базі -
 * якщо хоч один запис уже є, нічого не змінюється.
 */
export function seedInitialData(): boolean {
  const db = getDb()
  const profiles = db.prepare('SELECT COUNT(*) AS count FROM profiles').get() as { count: number }
  const counterparties = db
    .prepare('SELECT COUNT(*) AS count FROM counterparties')
    .get() as { count: number }

  if (profiles.count > 0 || counterparties.count > 0) return false

  createProfile(
    profileInputSchema.parse({
      ...FOP,
      label: 'ПриватБанк',
      iban: 'UA103052990000026005005909870',
      bankName: 'АТ КБ «ПриватБанк», м. Київ',
      mfo: '305299',
      taxNote: '',
      signerPosition: 'Фізична особа-підприємець',
      isDefault: true,
      isActive: true,
    }),
  )

  createProfile(
    profileInputSchema.parse({
      ...FOP,
      label: 'УНІВЕРСАЛ БАНК',
      iban: 'UA213220010000026004330079326',
      bankName: 'АТ «УНІВЕРСАЛ БАНК»',
      mfo: '322001',
      taxNote: 'Платник єдиного податку, 3-я група',
      signerPosition: 'Фізична особа-підприємець',
      isDefault: false,
      isActive: true,
    }),
  )

  const san = createCounterparty(
    counterpartyInputSchema.parse({
      type: 'tov',
      name: 'ТОВ «САН-ЕНЕРДЖИ УКРАЇНА»',
      fullName: 'Товариство з обмеженою відповідальністю «САН-ЕНЕРДЖИ УКРАЇНА»',
      legalAddress:
        '31252, Хмельницька обл., Волочиський район, с. Кривачинці, вул. Центральна, буд. 55',
      postalAddress: '04052, м. Київ, вул. Глибочицька, буд. 40-Х',
      taxId: '42142741',
      taxIdLabel: 'Код ЄДРПОУ',
      ipn: '',
      iban: 'UA853204780000026004924858983',
      bankName: 'АБ «УКРГАЗБАНК», м. Київ',
      mfo: '320478',
      phone: '+380 63 211 77 77',
      email: 'energy.ukr@ukr.net',
      signerPosition: 'Директор',
      signerPositionGenitive: 'директора',
      signerName: 'Федір КМІТА',
      signerNameGenitive: 'Кміта Федора Андрійовича',
      signerGender: 'm',
      basis: 'Статуту',
      registrationRecord: '',
      preamble: '',
      isActive: true,
    }),
  )

  const capitals = createCounterparty(
    counterpartyInputSchema.parse({
      type: 'tov',
      name: 'ТОВ «БУДІВЕЛЬНО-ІНВЕСТИЦІЙНА ГРУПА КЕПІТАЛС»',
      fullName:
        'Товариство з обмеженою відповідальністю «БУДІВЕЛЬНО-ІНВЕСТИЦІЙНА ГРУПА КЕПІТАЛС»',
      legalAddress: '03083, м. Київ, пр-т Науки, буд. 50, офіс 2',
      postalAddress: '',
      taxId: '41848965',
      taxIdLabel: 'Код ЄДРПОУ',
      ipn: '418489626505',
      iban: 'UA943052990000026009015010799',
      bankName: 'АТ КБ «ПриватБанк»',
      mfo: '305299',
      phone: '+38 (067) 235-20-55',
      email: 'capitalsbig@gmail.com',
      signerPosition: 'Директор',
      signerPositionGenitive: 'директора',
      signerName: 'Віктор ВОРОНЬКО',
      signerNameGenitive: 'Воронько Віктора Володимировича',
      signerGender: 'm',
      basis: 'Статуту',
      registrationRecord: '',
      preamble: '',
      isActive: true,
    }),
  )

  const kurbatov = createCounterparty(
    counterpartyInputSchema.parse({
      type: 'fop',
      name: 'ФОП Курбатов Євгеній Юрійович',
      fullName: 'Фізична особа-підприємець Курбатов Євгеній Юрійович',
      legalAddress: 'Харківська обл., м. Харків, вул. Дружби народів, буд. 269, кв. 107',
      postalAddress: '',
      taxId: '2923315272',
      taxIdLabel: 'РНОКПП',
      ipn: '',
      iban: 'UA493518230000026000500369390',
      bankName: 'Філія ХАРКІВСЬКЕ ОУ АТ «ОЩАДБАНК», м. Харків',
      mfo: '351823',
      phone: '+380 50 343 80 30',
      email: 'ugen.kurbatov@gmail.com',
      signerPosition: 'Фізична особа-підприємець',
      signerPositionGenitive: 'фізичної особи-підприємця',
      signerName: 'Євгеній КУРБАТОВ',
      signerNameGenitive: 'Курбатова Євгенія Юрійовича',
      signerGender: 'm',
      basis: '',
      registrationRecord: '24800000000091302',
      preamble: '',
      isActive: true,
    }),
  )

  const carbon = createCounterparty(
    counterpartyInputSchema.parse({
      type: 'tov',
      name: 'ТОВ «КАРБОН СІАЛ УКРАЇНА»',
      fullName: 'Товариство з обмеженою відповідальністю «КАРБОН СІАЛ УКРАЇНА»',
      legalAddress: '02094, м. Київ, вул. Віскозна, буд. 15',
      postalAddress: '',
      taxId: '39586393',
      taxIdLabel: 'Код ЄДРПОУ',
      ipn: '395863926522',
      iban: 'UA213052990000026002046208715',
      bankName: 'ПАТ КБ «ПриватБанк»',
      mfo: '305299',
      phone: '+380 50 444 89 61',
      email: 'olototskaya@ukr.net',
      signerPosition: 'Директор',
      signerPositionGenitive: 'директора',
      signerName: 'Оксана ЛОТОЦЬКА',
      signerNameGenitive: 'Лотоцької Оксани Ярославівни',
      signerGender: 'f',
      basis: 'Статуту',
      registrationRecord: '',
      preamble: '',
      isActive: true,
    }),
  )

  const contracts = [
    {
      counterpartyId: san.id,
      number: '011',
      date: '2024-04-30',
      serviceType: 'послуги з обслуговування комп’ютерної мережі',
      serviceLabel: 'Послуги з обслуговування комп’ютерної мережі',
      unit: 'посл.',
    },
    {
      counterpartyId: san.id,
      number: '17',
      date: '2026-10-02',
      serviceType:
        'сервісне обслуговування об’єктів комп’ютерної мережі з встановленим на них операційних систем та програмного забезпечення',
      serviceLabel: 'Сервісне обслуговування об’єктів комп’ютерної мережі',
      unit: 'посл.',
    },
    {
      counterpartyId: capitals.id,
      number: '14/07/25',
      date: '2025-07-14',
      serviceType: 'поліграфічні послуги',
      serviceLabel: 'Надання поліграфічних послуг',
      unit: 'шт',
    },
    {
      counterpartyId: kurbatov.id,
      number: '01-10/25/1',
      date: '2025-10-01',
      serviceType: 'послуги з обслуговування комп’ютерної мережі',
      serviceLabel: 'Послуги з обслуговування комп’ютерної мережі',
      unit: 'посл.',
    },
    {
      counterpartyId: carbon.id,
      number: '15',
      date: '2026-10-12',
      serviceType:
        'сервісне обслуговування об’єктів комп’ютерної мережі з встановленим на них операційних систем та програмного забезпечення',
      serviceLabel: 'Сервісне обслуговування об’єктів комп’ютерної мережі',
      unit: 'посл.',
    },
  ]

  for (const contract of contracts) {
    createContract(
      contract.counterpartyId,
      contractInputSchema.parse({
        ...contract,
        defaultPriceMinor: null,
        defaultQty: null,
        isActive: true,
      }),
    )
  }

  console.log('✅ Довідники заповнено: 2 банки, 4 замовники, 5 договорів')
  return true
}
