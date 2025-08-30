import { Router, Request, Response } from 'express';
import { WebhookService } from '../../services/webhook-service';
import { Logger } from '../../utils/logger';
import { EncryptionHelper } from '../../utils/encryption';
import { ApiResponse } from '../../types';

const router = Router();

// Webhook verification middleware
const verifyWebhookSignature = (req: Request, res: Response, next: any) => {
  try {
    const signature = req.headers['x-webhook-signature'] as string;
    const webhookSecret = process.env.WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
      return res.status(401).json({
        success: false,
        error: 'Missing webhook signature or secret',
        timestamp: new Date().toISOString()
      });
    }

    const body = JSON.stringify(req.body);
    const expectedSignature = EncryptionHelper.createHMAC(body, webhookSecret);

    if (!EncryptionHelper.verifyHMAC(body, signature, webhookSecret)) {
      Logger.warn('Invalid webhook signature', {
        signature: EncryptionHelper.maskSensitiveData(signature),
        expectedSignature: EncryptionHelper.maskSensitiveData(expectedSignature)
      });

      return res.status(401).json({
        success: false,
        error: 'Invalid webhook signature',
        timestamp: new Date().toISOString()
      });
    }

    next();
  } catch (error) {
    Logger.error('Webhook signature verification failed', error);
    
    return res.status(500).json({
      success: false,
      error: 'Webhook verification failed',
      timestamp: new Date().toISOString()
    });
  }
};

// POST /api/v1/webhooks/transaction-update
router.post('/transaction-update', verifyWebhookSignature, async (req: Request, res: Response) => {
  try {
    const {
      transactionHash,
      status,
      confirmations,
      blockNumber,
      merchantId
    } = req.body;

    Logger.info('Received transaction update webhook', {
      transactionHash,
      status,
      confirmations,
      blockNumber,
      merchantId
    });

    await WebhookService.handleTransactionUpdate({
      transactionHash,
      status,
      confirmations,
      blockNumber,
      merchantId
    });

    const response: ApiResponse = {
      success: true,
      message: 'Transaction update processed successfully',
      timestamp: new Date().toISOString()
    };

    res.json(response);

  } catch (error) {
    Logger.error('Failed to process transaction update webhook', error, {
      body: req.body
    });

    const response: ApiResponse = {
      success: false,
      error: 'Failed to process transaction update',
      timestamp: new Date().toISOString()
    };

    res.status(500).json(response);
  }
});

// POST /api/v1/webhooks/payment-received
router.post('/payment-received', verifyWebhookSignature, async (req: Request, res: Response) => {
  try {
    const {
      transactionHash,
      from,
      to,
      amount,
      token,
      merchantId,
      orderId,
      blockNumber
    } = req.body;

    Logger.info('Received payment webhook', {
      transactionHash,
      from,
      to,
      amount,
      token,
      merchantId,
      orderId
    });

    await WebhookService.handlePaymentReceived({
      transactionHash,
      from,
      to,
      amount,
      token,
      merchantId,
      orderId,
      blockNumber
    });

    const response: ApiResponse = {
      success: true,
      message: 'Payment notification processed successfully',
      timestamp: new Date().toISOString()
    };

    res.json(response);

  } catch (error) {
    Logger.error('Failed to process payment webhook', error, {
      body: req.body
    });

    const response: ApiResponse = {
      success: false,
      error: 'Failed to process payment notification',
      timestamp: new Date().toISOString()
    };

    res.status(500).json(response);
  }
});

// POST /api/v1/webhooks/block-mined
router.post('/block-mined', verifyWebhookSignature, async (req: Request, res: Response) => {
  try {
    const {
      blockNumber,
      blockHash,
      timestamp,
      transactionCount
    } = req.body;

    Logger.info('Received block mined webhook', {
      blockNumber,
      blockHash,
      transactionCount
    });

    await WebhookService.handleBlockMined({
      blockNumber,
      blockHash,
      timestamp: new Date(timestamp),
      transactionCount
    });

    const response: ApiResponse = {
      success: true,
      message: 'Block notification processed successfully',
      timestamp: new Date().toISOString()
    };

    res.json(response);

  } catch (error) {
    Logger.error('Failed to process block webhook', error, {
      body: req.body
    });

    const response: ApiResponse = {
      success: false,
      error: 'Failed to process block notification',
      timestamp: new Date().toISOString()
    };

    res.status(500).json(response);
  }
});

// POST /api/v1/webhooks/verychat
router.post('/verychat', async (req: Request, res: Response) => {
  try {
    const {
      sessionId,
      userId,
      message,
      intent,
      metadata
    } = req.body;

    Logger.info('Received Verychat webhook', {
      sessionId,
      userId,
      intent
    });

    await WebhookService.handleVerychatEvent({
      sessionId,
      userId,
      message,
      intent,
      metadata
    });

    const response: ApiResponse = {
      success: true,
      message: 'Verychat event processed successfully',
      timestamp: new Date().toISOString()
    };

    res.json(response);

  } catch (error) {
    Logger.error('Failed to process Verychat webhook', error, {
      body: req.body
    });

    const response: ApiResponse = {
      success: false,
      error: 'Failed to process Verychat event',
      timestamp: new Date().toISOString()
    };

    res.status(500).json(response);
  }
});

// GET /api/v1/webhooks/test/:merchantId
router.get('/test/:merchantId', async (req: Request, res: Response) => {
  try {
    const { merchantId } = req.params;

    const testResult = await WebhookService.testWebhook(merchantId);

    const response: ApiResponse = {
      success: true,
      data: testResult,
      message: 'Webhook test completed',
      timestamp: new Date().toISOString()
    };

    res.json(response);

  } catch (error) {
    Logger.error('Failed to test webhook', error, {
      merchantId: req.params.merchantId
    });

    const response: ApiResponse = {
      success: false,
      error: 'Failed to test webhook',
      timestamp: new Date().toISOString()
    };

    res.status(500).json(response);
  }
});

// GET /api/v1/webhooks/logs/:merchantId
router.get('/logs/:merchantId', async (req: Request, res: Response) => {
  try {
    const { merchantId } = req.params;
    const { 
      limit = 50, 
      offset = 0,
      startDate,
      endDate 
    } = req.query;

    const logs = await WebhookService.getWebhookLogs({
      merchantId,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined
    });

    const response: ApiResponse = {
      success: true,
      data: logs.data,
      message: 'Webhook logs retrieved successfully',
      timestamp: new Date().toISOString()
    };

    res.json({
      ...response,
      pagination: logs.pagination
    });

  } catch (error) {
    Logger.error('Failed to get webhook logs', error, {
      merchantId: req.params.merchantId,
      query: req.query
    });

    const response: ApiResponse = {
      success: false,
      error: 'Failed to retrieve webhook logs',
      timestamp: new Date().toISOString()
    };

    res.status(500).json(response);
  }
});

export default router;