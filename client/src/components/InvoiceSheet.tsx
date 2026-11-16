import {
  amountInWordsUAH,
  formatAmount,
  formatDateDoc,
  formatMoney,
  formatQty,
  inferTaxIdLabel,
  type DocumentDetail,
} from '@rekvizyt/shared'

/** Рахунок на оплату - макет А4, друкується без інтерфейсу. */
export function InvoiceSheet({ doc }: { doc: DocumentDetail }) {
  const { profile, counterparty, contract } = doc
  const words = amountInWordsUAH(doc.totalMinor)
  const addressLabel = counterparty.type === 'tov' ? 'Юридична адреса' : 'Адреса'

  return (
    <article className="sheet invoice-sheet" aria-label={`Рахунок № ${doc.number}`}>
      <h1 className="doc-title">
        Рахунок на оплату № {doc.number} від {formatDateDoc(doc.issuedAt)}
      </h1>
      <div className="doc-rule" />

      <div className="party-grid">
        <div className="party-label">Постачальник:</div>
        <div className="party-lines">
          <div className="party-name">{profile.name}</div>
          <div>{profile.address}</div>
          {profile.taxId && (
            <div>
              {inferTaxIdLabel(profile.taxId)} {profile.taxId}
              {profile.iban ? `, ${profile.iban}` : ''}
            </div>
          )}
          {!profile.taxId && profile.iban && <div>IBAN {profile.iban}</div>}
          <div>
            {profile.bankName}
            {profile.mfo ? `, МФО ${profile.mfo}` : ''}
          </div>
          {profile.phone && <div>Тел.: {profile.phone}</div>}
        </div>

        <div className="party-label">Покупець:</div>
        <div className="party-lines">
          <div className="party-name">{counterparty.fullName}</div>
          <div>
            {addressLabel}: {counterparty.legalAddress}
          </div>
          {counterparty.postalAddress && (
            <div>Адреса для листування: {counterparty.postalAddress}</div>
          )}
          {counterparty.taxId && (
            <div>
              {counterparty.taxIdLabel || inferTaxIdLabel(counterparty.taxId)}: {counterparty.taxId}
              {counterparty.ipn ? `, ІПН ${counterparty.ipn}` : ''}
            </div>
          )}
          {!counterparty.taxId && counterparty.ipn && (
            <div>ІПН {counterparty.ipn}</div>
          )}
          {counterparty.iban && <div>IBAN {counterparty.iban}</div>}
          <div>
            {counterparty.bankName}
            {counterparty.mfo ? `, МФО ${counterparty.mfo}` : ''}
          </div>
          {(counterparty.phone || counterparty.email) && (
            <div>
              {counterparty.phone ? `Тел.: ${counterparty.phone}` : ''}
              {counterparty.phone && counterparty.email ? ', ' : ''}
              {counterparty.email ? `E-mail: ${counterparty.email}` : ''}
            </div>
          )}
        </div>
      </div>

      <p className="contract-line">
        Договір: № {contract.number} від {formatDateDoc(contract.date)}
      </p>

      <table className="doc-table">
        <colgroup>
          <col className="col-index" />
          <col />
          <col className="col-qty" />
          <col className="col-unit" />
          <col className="col-price" />
          <col className="col-sum" />
        </colgroup>
        <thead>
          <tr>
            <th>№</th>
            <th>Товари (роботи, послуги)</th>
            <th colSpan={2}>Кількість</th>
            <th>Ціна</th>
            <th>Сума</th>
          </tr>
        </thead>
        <tbody>
          {doc.items.map((item, index) => (
            <tr key={`${item.label}-${index}`}>
              <td className="cell-center">{index + 1}</td>
              <td>{item.label}</td>
              <td className="cell-center">{formatQty(item.qty)}</td>
              <td className="cell-center">{item.unit}</td>
              <td className="cell-right">{formatAmount(item.unitPriceMinor)}</td>
              <td className="cell-right">{formatAmount(item.amountMinor)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="invoice-total">
        <span className="invoice-total-label">Разом:</span>
        <span className="invoice-total-value">{formatMoney(doc.totalMinor)}</span>
      </div>

      <p className="invoice-summary">
        Всього найменувань {doc.items.length}, на суму {formatMoney(doc.totalMinor)} грн.
      </p>
      <p className="invoice-words">{words.full}</p>

      <footer className="invoice-footer">
        <div className="doc-rule" />
        <div className="issued-by">
          <span>Виписав(ла):</span>
          <span className="sign-underline" aria-hidden="true" />
        </div>
      </footer>
    </article>
  )
}
