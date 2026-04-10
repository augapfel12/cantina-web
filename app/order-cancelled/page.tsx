import Link from 'next/link'

export default function OrderCancelledPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Cancelled</h1>
        <p className="text-gray-600 mb-6">
          Your payment was cancelled and no charge was made. Your order selections have been
          saved — you can go back and try again.
        </p>
        <p className="text-sm text-gray-500">
          Need help? Contact us on{' '}
          <a href="mailto:hello@cantina.id" className="text-orange-500 hover:underline">
            hello@cantina.id
          </a>
        </p>
      </div>
    </div>
  )
}
