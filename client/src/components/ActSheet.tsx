import {
  amountInWordsUAH,
  formatAmount,
  formatDateDoc,
  formatDateQuoted,
  type DocumentDetail,
} from '@rekvizyt/shared'

/** Акт прийому-передачі наданих послуг - макет А4. */
export function ActSheet({ doc }: { doc: DocumentDetail }) {
  const { profile, counterparty, contract } = doc
  const words = amountInWordsUAH(doc.totalMinor)
  const addressLabel = counterparty.type === 'tov' ? 'Юридична адреса' : 'Адреса'

  return (
    <article className="sheet act-sheet" aria-label={`Акт № ${doc.number}`}>
      <header className="act-header">
        <div className="act-title">АКТ № {doc.number}</div>
        <div className="act-subtitle">прийому-передачі наданих послуг</div>
      </header>

      <div className="act-date">
        <span className="nowrap-date">{formatDateQuoted(doc.issuedAt)}</span>
      </div>

      <p className="act-paragraph">{doc.customerPreamble}</p>
      <p className="act-paragraph">{doc.executorPreamble}</p>

      <ol className="act-list">
        <li>
          Сторони погоджуються, що Виконавець виконав свої зобов’язання згідно Договору №{' '}
          {contract.number} від {formatDateDoc(contract.date)}, а саме: {contract.serviceType}.
          <p className="act-total">
            Загальна вартість наданих послуг (виконаних робіт) становить{' '}
            {formatAmount(doc.totalMinor)} ({words.words}) {words.hryvniaWord} {words.kopecks} коп.
          </p>
          <p className="act-vat">{doc.vatNote}</p>
        </li>
        <li>
          Сторони підтверджують, що послуги надані Виконавцем вчасно, якісно та в повному обсязі та
          прийняті Замовником. Сторони не мають претензій одна до одної.
        </li>
        <li>
          Цей Акт складений українською мовою у двох примірниках, що мають однакову юридичну силу, по
          одному для кожної із Сторін.
        </li>
      </ol>

      <div className="act-parties">
        <div className="act-party">
          <div className="act-party-title">ЗАМОВНИК:</div>
          <div className="act-party-name">{counterparty.fullName}</div>
          <div>
            {addressLabel}: {counterparty.legalAddress}
          </div>
          {counterparty.postalAddress && (
            <div>Адреса для листування: {counterparty.postalAddress}</div>
          )}
          <div>
            {counterparty.taxIdLabel}: {counterparty.taxId}
          </div>
          {counterparty.ipn && <div>ІПН {counterparty.ipn}</div>}
          <div>IBAN {counterparty.iban}</div>
          <div>
            {counterparty.bankName}
            {counterparty.mfo ? ` МФО ${counterparty.mfo}` : ''}
          </div>
          {counterparty.phone && <div>Тел. {counterparty.phone}</div>}
          {counterparty.email && <div>Е-mail: {counterparty.email}</div>}
        </div>

        <div className="act-party">
          <div className="act-party-title">ВИКОНАВЕЦЬ:</div>
          <div className="act-party-name">{profile.name}</div>
          <div>{profile.address}</div>
          <div>ЄДРПОУ {profile.taxId}</div>
          <div>IBAN {profile.iban}</div>
          <div>
            {profile.bankName}
            {profile.mfo ? `, МФО ${profile.mfo}` : ''}
          </div>
          {profile.taxNote && <div>{profile.taxNote}</div>}
          {profile.phone && <div>Тел.: {profile.phone}</div>}
        </div>
      </div>

      <div className="act-signatures">
        <div className="act-sign">
          <div className="act-sign-position">{counterparty.signerPosition}</div>
          <div className="act-sign-row">
            <span className="sign-line" aria-hidden="true" />
            <span className="act-sign-name">{counterparty.signerName}</span>
          </div>
        </div>
        <div className="act-sign">
          <div className="act-sign-position">{profile.signerPosition}</div>
          <div className="act-sign-row">
            <span className="sign-line" aria-hidden="true" />
            <span className="act-sign-name">{profile.signerName}</span>
          </div>
        </div>
      </div>
    </article>
  )
}
