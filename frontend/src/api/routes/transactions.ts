import { Router, Request, Response } from 'express';
import { TransactionService } from '../../services/transaction-service';
import { QRGenerator } from '../../utils/qr-generator';
import { Logger } from '../../utils/logger';
import { ApiResponse, CreateTransactionRequest, QRCodeRequest } from '../../types';

const router = Router();

// GET /api/v1/transactions
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      status,
      limit = 10,
      offset = 0,
      startDate,
      endDate
    } = req.query;

    const merchantId = (req as any).user.merchantId;

    const result = await TransactionService.getTransactions({
      merchantId,
      status: status as any,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined
    });

    const response: ApiResponse = {
      success: true,
      data: result.data,
      message: 'Transactions retrieved successfully',
      timestamp: new Date().toISOString()
    };

    res.json({
      ...response,
      pagination: result.pagination
    });

  } catch (error) {
    Logger.error('Failed to get transactions', error, {
      userId: (req as any).user?.id,
      merchantId: (req as any).user?.merchantId
    });

    const response: ApiResponse = {
      success: false,
      error: 'Failed to retrieve transactions',
      timestamp: new Date().toISOString()
    };

    res.status(500).json(response);
  }
});

// GET /api/v1/transactions/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const merchantId = (req as any).user.merchantId;

    const transaction = await TransactionService.getTransactionById(id);

    // Check if transaction belongs to merchant
    if (transaction.merchantId !== merchantId && (req as any).user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    const response: ApiResponse = {
      success: true,
      data: transaction,
      message: 'Transaction retrieved successfully',
      timestamp: new Date().toISOString()
    };

    res.json(response);

  } catch (error) {
    Logger.error('Failed to get transaction', error, {
      id: req.params.id,
      userId: (req as any).user?.id
    });

    const response: ApiResponse = {
      success: false,
      error: 'Transaction not found',
      timestamp: new Date().toISOString()
    };

    res.status(404).json(response);
  }
});

// POST /api/v1/transactions
router.post('/', async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).user.merchantId;
    const transactionData: CreateTransactionRequest = req.body;

    const transaction = await TransactionService.createTransaction(merchantId, transactionData);

    const response: ApiResponse = {
      success: true,
      data: transaction,
      message: 'Transaction created successfully',
      timestamp: new Date().toISOString()
    };

    res.status(201).json(response);

  } catch (error) {
    Logger.error('Failed to create transaction', error, {
      userId: (req as any).user?.id,
      merchantId: (req as any).user?.merchantId,
      data: req.body
    });

    const response: ApiResponse = {
      success: false,
      error: 'Failed to create transaction',
      timestamp: new Date().toISOString()
    };

    res.status(400).json(response);
  }
});

// PUT /api/v1/transactions/:id/cancel
router.put('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const merchantId = (req as any).user.merchantId;

    const transaction = await TransactionService.getTransactionById(id);

    // Check if transaction belongs to merchant
    if (transaction.merchantId !== merchantId && (req as any).user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    const cancelledTransaction = await TransactionService.cancelTransaction(id);

    const response: ApiResponse = {
      success: true,
      data: cancelledTransaction,
      message: 'Transaction cancelled successfully',
      timestamp: new Date().toISOString()
    };

    res.json(response);

  } catch (error) {
    Logger.error('Failed to cancel transaction', error, {
      id: req.params.id,
      userId: (req as any).user?.id
    });

    const response: ApiResponse = {
      success: false,
      error: 'Failed to cancel transaction',
      timestamp: new Date().toISOString()
    };

    res.status(400).json(response);
  }
});

// GET /api/v1/transactions/:id/status
router.get('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const merchantId = (req as any).user.merchantId;

    const transaction = await TransactionService.getTransactionById(id);

    // Check if transaction belongs to merchant
    if (transaction.merchantId !== merchantId && (req as any).user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    const status = await TransactionService.getTransactionStatus(transaction.hash);

    const response: ApiResponse = {
      success: true,
      data: {
        id: transaction.id,
        hash: transaction.hash,
        ...status
      },
      message: 'Transaction status retrieved successfully',
      timestamp: new Date().toISOString()
    };

    res.json(response);

  } catch (error) {
    Logger.error('Failed to get transaction status', error, {
      id: req.params.id,
      userId: (req as any).user?.id
    });

    const response: ApiResponse = {
      success: false,
      error: 'Failed to get transaction status',
      timestamp: new Date().toISOString()
    };

    res.status(500).json(response);
  }
});

// POST /api/v1/transactions/qr-code
router.post('/qr-code', async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).user.merchantId;
    const qrRequest: QRCodeRequest = req.body;

    // Get merchant wallet address
    const { MerchantService } = await import('../../services/merchant-service');
    const merchant = await MerchantService.getMerchantById(merchantId);

    const qrResult = await QRGenerator.createPaymentQR(
      merchantId,
      merchant.walletAddress,
      qrRequest
    );

    const response: ApiResponse = {
      success: true,
      data: {
        qrCode: qrResult.qrCode,
        paymentUrl: qrResult.paymentUrl,
        expiresAt: qrResult.expiresAt
      },
      message: 'QR code generated successfully',
      timestamp: new Date().toISOString()
    };

    res.json(response);

  } catch (error) {
    Logger.error('Failed to generate QR code', error, {
      userId: (req as any).user?.id,
      merchantId: (req as any).user?.merchantId,
      data: req.body
    });

    const response: ApiResponse = {
      success: false,
      error: 'Failed to generate QR code',
      timestamp: new Date().toISOString()
    };

    res.status(400).json(response);
  }
});

// GET /api/v1/transactions/export
router.get('/export', async (req: Request, res: Response) => {
  try {
    const {
      format = 'csv',
      startDate,
      endDate,
      status
    } = req.query;

    const merchantId = (req as any).user.merchantId;

    const exportData = await TransactionService.exportTransactions({
      merchantId,
      format: format as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      status: status as any
    });

    res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="transactions.${format}"`);
    res.send(exportData);

  } catch (error) {
    Logger.error('Failed to export transactions', error, {
      userId: (req as any).user?.id,
      merchantId: (req as any).user?.merchantId,
      query: req.query
    });

    const response: ApiResponse = {
      success: false,
      error: 'Failed to export transactions',
      timestamp: new Date().toISOString()
    };

    res.status(500).json(response);
  }
});

export default router;