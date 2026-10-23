import { Button } from '@/components/ui/Button'
import { PrintSheet } from '@/components/ui/PrintSheet'
import { formatINR } from '@/lib/money'

export type ReceiptPayload = {
  payment: {
    id: string
    receiptNo: string
    paidOn: string
    method: string
    reference: string | null
    totalPaise: number
    amountInWords: string
    receivedBy: string
  }
  school: { name: string; address: string | null; phone: string | null; email: string | null } | null
  student: {
    firstName: string
    lastName: string | null
    className: string
    rollNo: number | null
    admissionNo: string
    parentName: string
    yearLabel: string
  }
  items: Array<{ description: string; amountPaise: number }>
}

function childName(row: { firstName: string; lastName: string | null }) {
  return `${row.firstName} ${row.lastName ?? ''}`.trim()
}

function formatPaidOn(value: string) {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(`${value}T00:00:00`),
  )
}

type Props = {
  data: ReceiptPayload
  successTitle: string
  anotherLabel: string
  onAnother: () => void
  onPdf: () => void
  showSendToParent?: boolean
  onSendToParent?: () => void
}

export function ReceiptView({
  data,
  successTitle,
  anotherLabel,
  onAnother,
  onPdf,
  showSendToParent = false,
  onSendToParent,
}: Props) {
  const schoolContact = [data.school?.phone, data.school?.email].filter(Boolean).join(' · ')
  return (
    <div className="grid justify-items-center gap-2">
      <div className="grid justify-items-center gap-1" data-print-hide>
        <div className="text-4xl" aria-hidden>
          🎉
        </div>
        <h2>{successTitle}</h2>
        <p className="m-0 mb-2 text-muted">Receipt {data.payment.receiptNo} is ready to print or share.</p>
      </div>
      <PrintSheet
        title="Fee receipt"
        schoolName={data.school?.name ?? 'School'}
        schoolAddress={data.school?.address}
        schoolContact={schoolContact || null}
        issued={`Receipt no. ${data.payment.receiptNo}`}
      >
        <div className="-mt-2 text-right text-xs text-[#555]">Date: {formatPaidOn(data.payment.paidOn)}</div>
        <dl className="m-0 grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-2">
          <div>
            <dt className="text-[#555]">Student</dt>
            <dd className="m-0 font-bold">{childName(data.student)}</dd>
          </div>
          <div>
            <dt className="text-[#555]">Class</dt>
            <dd className="m-0 font-bold">{data.student.className}</dd>
          </div>
          <div>
            <dt className="text-[#555]">Roll no.</dt>
            <dd className="m-0 font-bold">{String(data.student.rollNo ?? 0).padStart(2, '0')}</dd>
          </div>
          <div>
            <dt className="text-[#555]">Admission no.</dt>
            <dd className="m-0 font-bold">{data.student.admissionNo}</dd>
          </div>
          <div>
            <dt className="text-[#555]">Parent</dt>
            <dd className="m-0 font-bold">{data.student.parentName}</dd>
          </div>
          <div>
            <dt className="text-[#555]">Academic year</dt>
            <dd className="m-0 font-bold">{data.student.yearLabel}</dd>
          </div>
        </dl>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="w-10 border-b-2 border-[#1b1b1b] px-2 py-2 text-left text-[#555]">No.</th>
                <th className="border-b-2 border-[#1b1b1b] px-2 py-2 text-left text-[#555]">Description</th>
                <th className="border-b-2 border-[#1b1b1b] px-2 py-2 text-right text-[#555]">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, index) => (
                <tr key={`${item.description}-${index}`}>
                  <td className="border-b border-[#e5e5e5] px-2 py-2">{index + 1}</td>
                  <td className="border-b border-[#e5e5e5] px-2 py-2">{item.description}</td>
                  <td className="border-b border-[#e5e5e5] px-2 py-2 text-right">{formatINR(item.amountPaise)}</td>
                </tr>
              ))}
              <tr>
                <td />
                <td className="px-2 py-2 font-bold">Total paid</td>
                <td className="px-2 py-2 text-right font-bold">{formatINR(data.payment.totalPaise)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div>
          Amount in words: <b>{data.payment.amountInWords}</b>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <div>
              Payment mode: <b>{data.payment.method}</b>
              {data.payment.reference ? ` · ${data.payment.reference}` : ''}
            </div>
            <div className="mt-2.5">
              <span className="inline-block rotate-[-8deg] rounded-lg border-[3px] border-success px-3 py-1 font-heading text-lg font-semibold uppercase tracking-wide text-success">
                Paid
              </span>
            </div>
          </div>
          <div className="min-w-[140px] border-t border-[#1b1b1b] pt-1 text-right text-xs text-[#555]">
            Authorised signatory
          </div>
        </div>
        <span className="text-xs text-[#555]">This is a computer-generated receipt. Fees once paid are not refundable.</span>
      </PrintSheet>
      <div className="mt-1.5 flex flex-wrap justify-center gap-2" data-print-hide>
        <Button onClick={() => window.print()}>Print receipt</Button>
        <Button variant="alt" onClick={onPdf}>
          Download PDF
        </Button>
        {showSendToParent ? (
          <Button variant="alt" onClick={onSendToParent}>
            Send to parent
          </Button>
        ) : null}
        <Button variant="alt" onClick={onAnother}>
          {anotherLabel}
        </Button>
      </div>
    </div>
  )
}
