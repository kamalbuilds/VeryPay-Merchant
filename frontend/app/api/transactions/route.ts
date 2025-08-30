import { NextRequest, NextResponse } from 'next/server'
import { Transaction } from '@/types'

// Mock transaction data
const mockTransactions: Transaction[] = [
  {
    id: '1',
    hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    from: '0x1234567890123456789012345678901234567890' as const,
    to: '0x0987654321098765432109876543210987654321' as const,
    amount: BigInt('1250000000000000000'), // 1.25 ETH
    veryAmount: 952.50,
    usdValue: 125.50,
    type: 'payment',
    status: 'confirmed',
    timestamp: new Date('2024-08-30T10:30:00Z'),
    blockNumber: BigInt(12345678),
    gasUsed: BigInt(21000),
    gasPrice: BigInt(20000000000),
  },
  {
    id: '2',
    hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    from: '0x8765432109876543210987654321098765432109' as const,
    to: '0x0987654321098765432109876543210987654321' as const,
    amount: BigInt('457500000000000000'), // 0.4575 ETH
    veryAmount: 348.50,
    usdValue: 45.75,
    type: 'payment',
    status: 'pending',
    timestamp: new Date('2024-08-30T10:25:00Z'),
  },
  {
    id: '3',
    hash: '0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba',
    from: '0x9876543210987654321098765432109876543210' as const,
    to: '0x0987654321098765432109876543210987654321' as const,
    amount: BigInt('892500000000000000'), // 0.8925 ETH
    veryAmount: 679.00,
    usdValue: 89.25,
    type: 'payment',
    status: 'confirmed',
    timestamp: new Date('2024-08-30T10:22:00Z'),
    blockNumber: BigInt(12345676),
    gasUsed: BigInt(21000),
    gasPrice: BigInt(19000000000),
  }
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status')
    const merchant = searchParams.get('merchant')

    let filteredTransactions = [...mockTransactions]

    // Filter by status if provided
    if (status) {
      filteredTransactions = filteredTransactions.filter(tx => tx.status === status)
    }

    // Filter by merchant if provided (in real app, this would filter by merchant address)
    if (merchant) {
      filteredTransactions = filteredTransactions.filter(tx => tx.to === merchant)
    }

    // Pagination
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex)

    return NextResponse.json({
      success: true,
      data: paginatedTransactions,
      pagination: {
        page,
        limit,
        total: filteredTransactions.length,
        totalPages: Math.ceil(filteredTransactions.length / limit),
        hasNext: endIndex < filteredTransactions.length,
        hasPrev: page > 1,
      }
    })
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch transactions' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // In a real app, this would create a new transaction
    const newTransaction: Transaction = {
      id: Date.now().toString(),
      hash: `0x${Math.random().toString(16).slice(2, 66).padStart(64, '0')}`,
      from: body.from,
      to: body.to,
      amount: BigInt(body.amount),
      veryAmount: body.veryAmount,
      usdValue: body.usdValue,
      type: body.type || 'payment',
      status: 'pending',
      timestamp: new Date(),
    }

    // Add to mock data (in real app, this would be saved to database)
    mockTransactions.unshift(newTransaction)

    return NextResponse.json({
      success: true,
      data: newTransaction,
      message: 'Transaction created successfully'
    })
  } catch (error) {
    console.error('Error creating transaction:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create transaction' },
      { status: 500 }
    )
  }
}