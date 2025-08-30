import { NextRequest, NextResponse } from 'next/server'
import { PaymentRequest } from '@/types'

// Mock payment requests data
const mockPayments: PaymentRequest[] = [
  {
    id: 'pay_1',
    merchantId: 'merchant_123',
    amount: 125.50,
    veryAmount: 95.25,
    description: 'Coffee and pastry',
    status: 'completed',
    expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
    createdAt: new Date('2024-08-30T10:30:00Z'),
  },
  {
    id: 'pay_2',
    merchantId: 'merchant_123',
    amount: 45.75,
    veryAmount: 34.85,
    description: 'Book purchase',
    status: 'pending',
    expiresAt: new Date(Date.now() + 2400000), // 40 minutes from now
    createdAt: new Date('2024-08-30T10:25:00Z'),
  }
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const merchantId = searchParams.get('merchantId')
    const status = searchParams.get('status')

    let filteredPayments = [...mockPayments]

    // Filter by merchant ID if provided
    if (merchantId) {
      filteredPayments = filteredPayments.filter(payment => payment.merchantId === merchantId)
    }

    // Filter by status if provided
    if (status) {
      filteredPayments = filteredPayments.filter(payment => payment.status === status)
    }

    return NextResponse.json({
      success: true,
      data: filteredPayments
    })
  } catch (error) {
    console.error('Error fetching payments:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payments' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const newPayment: PaymentRequest = {
      id: `pay_${Date.now()}`,
      merchantId: body.merchantId || 'merchant_123',
      amount: body.amount,
      veryAmount: body.veryAmount || body.amount * 0.76, // Mock conversion rate
      description: body.description,
      metadata: body.metadata,
      status: 'pending',
      expiresAt: new Date(Date.now() + (body.expiresIn || 3600000)), // Default 1 hour
      createdAt: new Date(),
    }

    // Add to mock data
    mockPayments.unshift(newPayment)

    return NextResponse.json({
      success: true,
      data: newPayment,
      message: 'Payment request created successfully'
    })
  } catch (error) {
    console.error('Error creating payment:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create payment request' },
      { status: 500 }
    )
  }
}