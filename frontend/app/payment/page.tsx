'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  QrCode, 
  Smartphone, 
  CreditCard, 
  ArrowLeft, 
  Copy, 
  Check,
  Loader2
} from 'lucide-react'
import Link from 'next/link'
import QRCodeLib from 'qrcode'
import Image from 'next/image'
import { useEffect } from 'react'

export default function PaymentPage() {
  const [step, setStep] = useState<'form' | 'qr' | 'processing' | 'success'>('form')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [qrCode, setQrCode] = useState('')
  const [paymentId] = useState('pay_' + Math.random().toString(36).substr(2, 9))
  const [copied, setCopied] = useState(false)

  const veryAmount = amount ? (parseFloat(amount) * 0.76).toFixed(2) : '0.00' // Mock conversion rate

  const generateQRCode = async () => {
    const paymentData = {
      merchantId: 'merchant_123',
      amount: parseFloat(amount),
      veryAmount: parseFloat(veryAmount),
      description,
      paymentId,
      timestamp: Date.now()
    }

    const qrData = JSON.stringify(paymentData)
    try {
      const qrCodeDataURL = await QRCodeLib.toDataURL(qrData, {
        width: 256,
        margin: 2,
        color: {
          dark: '#0ea5e9',
          light: '#ffffff'
        }
      })
      setQrCode(qrCodeDataURL)
      setStep('qr')
    } catch (err) {
      console.error('Failed to generate QR code:', err)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (amount && parseFloat(amount) > 0) {
      generateQRCode()
    }
  }

  const copyPaymentLink = async () => {
    const paymentUrl = `${window.location.origin}/pay/${paymentId}`
    try {
      await navigator.clipboard.writeText(paymentUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Simulate payment processing
  useEffect(() => {
    if (step === 'qr') {
      const timer = setTimeout(() => {
        const shouldComplete = Math.random() > 0.3 // 70% success rate
        if (shouldComplete) {
          setStep('processing')
          setTimeout(() => setStep('success'), 2000)
        }
      }, 10000) // Auto-complete after 10 seconds for demo

      return () => clearTimeout(timer)
    }
  }, [step])

  return (
    <div className="min-h-screen bg-gradient-to-br from-very-50 via-white to-very-50">
      {/* Header */}
      <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container flex h-14 items-center">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Back to Home</span>
          </Link>
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-very-500 to-very-600" />
            <span className="font-bold">VeryPay Payment</span>
          </div>
        </div>
      </header>

      <div className="container py-12">
        <div className="mx-auto max-w-lg">
          {step === 'form' && (
            <Card className="border-very-100">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Create Payment Request</CardTitle>
                <CardDescription>
                  Enter the payment details to generate a QR code for your customer
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount (USD)</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                      className="text-lg"
                    />
                    {amount && (
                      <p className="text-sm text-very-600">
                        ≈ {veryAmount} $VERY tokens
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description (optional)</Label>
                    <Input
                      id="description"
                      placeholder="Payment for..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full very-gradient"
                    disabled={!amount || parseFloat(amount) <= 0}
                  >
                    <QrCode className="mr-2 h-4 w-4" />
                    Generate Payment QR Code
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {step === 'qr' && (
            <Card className="border-very-100">
              <CardHeader className="text-center">
                <CardTitle className="text-xl">Payment QR Code</CardTitle>
                <CardDescription>
                  Show this QR code to your customer to complete the payment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Payment Details */}
                <div className="rounded-lg bg-very-50 p-4 text-center">
                  <p className="text-2xl font-bold text-very-900">${amount}</p>
                  <p className="text-sm text-very-600">{veryAmount} $VERY</p>
                  {description && (
                    <p className="mt-2 text-sm text-gray-600">{description}</p>
                  )}
                </div>

                {/* QR Code */}
                <div className="flex justify-center">
                  <div className="rounded-xl border-4 border-very-200 p-4 bg-white">
                    {qrCode && (
                      <Image
                        src={qrCode}
                        alt="Payment QR Code"
                        width={256}
                        height={256}
                        className="rounded-lg"
                      />
                    )}
                  </div>
                </div>

                {/* Instructions */}
                <div className="space-y-3 text-center text-sm text-gray-600">
                  <p className="flex items-center justify-center space-x-2">
                    <Smartphone className="h-4 w-4" />
                    <span>Customer scans with VeryPay mobile app</span>
                  </p>
                  <p className="flex items-center justify-center space-x-2">
                    <CreditCard className="h-4 w-4" />
                    <span>Payment processed instantly on blockchain</span>
                  </p>
                </div>

                {/* Copy Link */}
                <Button 
                  onClick={copyPaymentLink}
                  variant="outline" 
                  className="w-full"
                >
                  {copied ? (
                    <>
                      <Check className="mr-2 h-4 w-4 text-green-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Payment Link
                    </>
                  )}
                </Button>

                {/* Actions */}
                <div className="flex space-x-3">
                  <Button 
                    onClick={() => setStep('form')}
                    variant="outline"
                    className="flex-1"
                  >
                    New Payment
                  </Button>
                  <Button asChild className="flex-1">
                    <Link href="/dashboard">View Dashboard</Link>
                  </Button>
                </div>

                {/* Status */}
                <div className="text-center">
                  <p className="text-sm text-gray-500">
                    Waiting for customer payment...
                  </p>
                  <div className="mt-2">
                    <div className="inline-flex items-center space-x-2 rounded-full bg-yellow-100 px-3 py-1 text-xs text-yellow-800">
                      <div className="h-2 w-2 animate-pulse rounded-full bg-yellow-500" />
                      <span>Pending</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 'processing' && (
            <Card className="border-very-100">
              <CardContent className="py-12">
                <div className="text-center space-y-4">
                  <div className="mx-auto h-16 w-16 rounded-full bg-very-100 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 text-very-600 animate-spin" />
                  </div>
                  <h3 className="text-xl font-semibold">Processing Payment</h3>
                  <p className="text-gray-600">
                    Confirming transaction on blockchain...
                  </p>
                  <div className="text-sm text-gray-500">
                    Payment ID: {paymentId}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 'success' && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="py-12">
                <div className="text-center space-y-4">
                  <div className="mx-auto h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                    <Check className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-green-900">Payment Successful!</h3>
                  <p className="text-green-700">
                    ${amount} received ({veryAmount} $VERY)
                  </p>
                  <div className="space-y-2 text-sm text-green-600">
                    <p>Transaction confirmed on blockchain</p>
                    <p>Rewards distributed to customer</p>
                  </div>
                  <div className="flex space-x-3 pt-4">
                    <Button 
                      onClick={() => {
                        setStep('form')
                        setAmount('')
                        setDescription('')
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      New Payment
                    </Button>
                    <Button asChild className="flex-1">
                      <Link href="/dashboard">View Dashboard</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}