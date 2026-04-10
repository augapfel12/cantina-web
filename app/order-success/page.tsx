import Link from 'next/link'

export default function OrderSuccessPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
        <p className="text-gray-600 mb-6">
          Thank you! Your lunch order has been paid and confirmed. You will receive a
          confirmation email shortly. See you at lunchtime!
        </p>
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mb-6 text-left">
          <p className="text-sm font-semibold text-orange-700 mb-1">What happens next?</p>
          <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
            <li>Our kitchen receives your order</li>
            <li>A sticker label is printed for each lunch day</li>
            <li>Lunch is delivered to your child's classroom</li>
          </ul>
        </div>
        <p className="text-sm text-gray-500">
          Questions? Contact us on WhatsApp or{' '}
          <a href="mailto:hello@cantina.id" className="text-orange-500 hover:underline">
            hello@cantina.id
          </a>
        </p>
      </div>
    </div>
  )
}
