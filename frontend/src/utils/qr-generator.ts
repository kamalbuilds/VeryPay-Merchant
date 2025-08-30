import QRCode from 'qrcode';
import { Logger } from './logger';
import { QRCodeRequest } from '../types';

export interface PaymentQRData {
  amount: string;
  token: string;
  recipient: string;
  orderId?: string;
  merchantId: string;
  expiresAt: Date;
  paymentUrl: string;
}

export class QRGenerator {
  /**
   * Generate QR code for payment
   */
  static async generatePaymentQR(
    data: PaymentQRData,
    options: QRCode.QRCodeToDataURLOptions = {}
  ): Promise<string> {
    try {
      const qrData = JSON.stringify(data);
      
      const qrOptions: QRCode.QRCodeToDataURLOptions = {
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 256,
        ...options
      };

      const qrCodeDataUrl = await QRCode.toDataURL(qrData, qrOptions);
      
      Logger.info('Payment QR code generated', {
        orderId: data.orderId,
        merchantId: data.merchantId,
        amount: data.amount,
        token: data.token
      });

      return qrCodeDataUrl;
    } catch (error) {
      Logger.error('Failed to generate payment QR code', error, { data });
      throw error;
    }
  }

  /**
   * Generate QR code for wallet address
   */
  static async generateAddressQR(
    address: string,
    options: QRCode.QRCodeToDataURLOptions = {}
  ): Promise<string> {
    try {
      const qrOptions: QRCode.QRCodeToDataURLOptions = {
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 256,
        ...options
      };

      const qrCodeDataUrl = await QRCode.toDataURL(address, qrOptions);
      
      Logger.info('Address QR code generated', { address });

      return qrCodeDataUrl;
    } catch (error) {
      Logger.error('Failed to generate address QR code', error, { address });
      throw error;
    }
  }

  /**
   * Parse payment QR code data
   */
  static parsePaymentQR(qrData: string): PaymentQRData {
    try {
      const data = JSON.parse(qrData) as PaymentQRData;
      
      // Validate required fields
      if (!data.amount || !data.token || !data.recipient || !data.merchantId) {
        throw new Error('Invalid QR code data: missing required fields');
      }

      // Check expiration
      if (new Date(data.expiresAt) < new Date()) {
        throw new Error('QR code has expired');
      }

      return data;
    } catch (error) {
      Logger.error('Failed to parse payment QR code', error, { qrData });
      throw error;
    }
  }

  /**
   * Validate QR code data format
   */
  static isValidPaymentQR(qrData: string): boolean {
    try {
      const data = JSON.parse(qrData);
      return !!(
        data.amount &&
        data.token &&
        data.recipient &&
        data.merchantId &&
        data.expiresAt &&
        new Date(data.expiresAt) > new Date()
      );
    } catch {
      return false;
    }
  }

  /**
   * Generate payment URL for QR code
   */
  static generatePaymentUrl(
    merchantId: string,
    orderId: string,
    amount: string,
    token: string
  ): string {
    const baseUrl = process.env.FRONTEND_URL || 'https://merchant.verypay.tech';
    const params = new URLSearchParams({
      merchantId,
      orderId,
      amount,
      token
    });

    return `${baseUrl}/pay?${params.toString()}`;
  }

  /**
   * Create comprehensive payment QR with all data
   */
  static async createPaymentQR(
    merchantId: string,
    recipient: string,
    request: QRCodeRequest
  ): Promise<{
    qrCode: string;
    paymentUrl: string;
    expiresAt: Date;
    data: PaymentQRData;
  }> {
    try {
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + (request.expiresIn || 30));

      const paymentUrl = this.generatePaymentUrl(
        merchantId,
        request.orderId || `order_${Date.now()}`,
        request.amount,
        request.token
      );

      const qrData: PaymentQRData = {
        amount: request.amount,
        token: request.token,
        recipient,
        orderId: request.orderId,
        merchantId,
        expiresAt,
        paymentUrl
      };

      const qrCode = await this.generatePaymentQR(qrData);

      return {
        qrCode,
        paymentUrl,
        expiresAt,
        data: qrData
      };
    } catch (error) {
      Logger.error('Failed to create payment QR', error, { merchantId, request });
      throw error;
    }
  }
}

export default QRGenerator;