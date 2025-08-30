import CryptoJS from 'crypto-js';
import { Logger } from './logger';

export class EncryptionHelper {
  private static readonly secretKey = process.env.ENCRYPTION_KEY || 'default-32-character-secret-key';

  /**
   * Encrypt sensitive data
   */
  static encrypt(data: string): string {
    try {
      const encrypted = CryptoJS.AES.encrypt(data, this.secretKey).toString();
      return encrypted;
    } catch (error) {
      Logger.error('Failed to encrypt data', error);
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt sensitive data
   */
  static decrypt(encryptedData: string): string {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, this.secretKey);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      
      if (!decrypted) {
        throw new Error('Invalid encrypted data');
      }
      
      return decrypted;
    } catch (error) {
      Logger.error('Failed to decrypt data', error);
      throw new Error('Decryption failed');
    }
  }

  /**
   * Hash sensitive data (one-way)
   */
  static hash(data: string): string {
    try {
      return CryptoJS.SHA256(data).toString();
    } catch (error) {
      Logger.error('Failed to hash data', error);
      throw new Error('Hashing failed');
    }
  }

  /**
   * Generate random key
   */
  static generateRandomKey(length: number = 32): string {
    return CryptoJS.lib.WordArray.random(length).toString();
  }

  /**
   * Create HMAC signature
   */
  static createHMAC(data: string, secret?: string): string {
    try {
      const key = secret || this.secretKey;
      return CryptoJS.HmacSHA256(data, key).toString();
    } catch (error) {
      Logger.error('Failed to create HMAC', error);
      throw new Error('HMAC creation failed');
    }
  }

  /**
   * Verify HMAC signature
   */
  static verifyHMAC(data: string, signature: string, secret?: string): boolean {
    try {
      const expectedSignature = this.createHMAC(data, secret);
      return expectedSignature === signature;
    } catch (error) {
      Logger.error('Failed to verify HMAC', error);
      return false;
    }
  }

  /**
   * Encrypt object to JSON string
   */
  static encryptObject<T>(obj: T): string {
    try {
      const jsonString = JSON.stringify(obj);
      return this.encrypt(jsonString);
    } catch (error) {
      Logger.error('Failed to encrypt object', error);
      throw new Error('Object encryption failed');
    }
  }

  /**
   * Decrypt JSON string to object
   */
  static decryptObject<T>(encryptedData: string): T {
    try {
      const decryptedString = this.decrypt(encryptedData);
      return JSON.parse(decryptedString) as T;
    } catch (error) {
      Logger.error('Failed to decrypt object', error);
      throw new Error('Object decryption failed');
    }
  }

  /**
   * Generate secure API key
   */
  static generateAPIKey(): string {
    const prefix = 'vp_';
    const randomPart = this.generateRandomKey(40);
    return prefix + randomPart;
  }

  /**
   * Mask sensitive data for logging
   */
  static maskSensitiveData(data: string, visibleChars: number = 4): string {
    if (data.length <= visibleChars * 2) {
      return '*'.repeat(data.length);
    }
    
    const start = data.substring(0, visibleChars);
    const end = data.substring(data.length - visibleChars);
    const middle = '*'.repeat(data.length - (visibleChars * 2));
    
    return start + middle + end;
  }
}

export default EncryptionHelper;