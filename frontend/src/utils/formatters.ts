import { ethers } from 'ethers';
import { TokenInfo } from '../types';

export class DataFormatter {
  /**
   * Format currency amount with proper decimals and symbol
   */
  static formatCurrency(
    amount: string | number,
    currency: string = 'USD',
    decimals: number = 2
  ): string {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    if (isNaN(numAmount)) {
      return '0.00';
    }

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(numAmount);
  }

  /**
   * Format token amount with proper decimals
   */
  static formatTokenAmount(
    amount: string | number,
    token: TokenInfo,
    maxDecimals: number = 6
  ): string {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    if (isNaN(numAmount)) {
      return '0';
    }

    const decimals = Math.min(token.decimals, maxDecimals);
    const formatted = numAmount.toFixed(decimals);
    
    // Remove trailing zeros
    const trimmed = formatted.replace(/\.?0+$/, '');
    
    return `${trimmed} ${token.symbol}`;
  }

  /**
   * Format large numbers with appropriate suffixes (K, M, B)
   */
  static formatLargeNumber(num: number, decimals: number = 1): string {
    if (num < 1000) {
      return num.toString();
    }

    const units = ['', 'K', 'M', 'B', 'T'];
    const order = Math.floor(Math.log(num) / Math.log(1000));
    const unitIndex = Math.min(order, units.length - 1);
    
    const scaledNum = num / Math.pow(1000, unitIndex);
    
    return scaledNum.toFixed(decimals) + units[unitIndex];
  }

  /**
   * Format percentage with proper precision
   */
  static formatPercentage(value: number, decimals: number = 2): string {
    return `${value.toFixed(decimals)}%`;
  }

  /**
   * Format date to human-readable string
   */
  static formatDate(date: Date | string, format: 'short' | 'medium' | 'long' = 'medium'): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    const options: Intl.DateTimeFormatOptions = {
      short: { month: 'short', day: 'numeric', year: 'numeric' },
      medium: { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' },
      long: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }
    };

    return new Intl.DateTimeFormat('en-US', options[format]).format(dateObj);
  }

  /**
   * Format relative time (e.g., "2 hours ago")
   */
  static formatRelativeTime(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    } else if (diffDays < 30) {
      return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    } else {
      return this.formatDate(dateObj, 'short');
    }
  }

  /**
   * Format transaction hash for display
   */
  static formatTxHash(hash: string, length: number = 8): string {
    if (hash.length <= length * 2) {
      return hash;
    }
    return `${hash.slice(0, length)}...${hash.slice(-length)}`;
  }

  /**
   * Format wallet address for display
   */
  static formatAddress(address: string, length: number = 6): string {
    if (!ethers.isAddress(address)) {
      return address;
    }
    
    if (address.length <= length * 2) {
      return address;
    }
    
    return `${address.slice(0, length + 2)}...${address.slice(-length)}`;
  }

  /**
   * Format file size in human readable format
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Format duration in human readable format
   */
  static formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Sanitize string for display
   */
  static sanitizeString(str: string, maxLength?: number): string {
    let sanitized = str.replace(/[<>]/g, '');
    
    if (maxLength && sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength) + '...';
    }
    
    return sanitized;
  }

  /**
   * Format phone number
   */
  static formatPhoneNumber(phoneNumber: string): string {
    const cleaned = phoneNumber.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    
    if (match) {
      return '(' + match[1] + ') ' + match[2] + '-' + match[3];
    }
    
    return phoneNumber;
  }

  /**
   * Truncate text with ellipsis
   */
  static truncateText(text: string, maxLength: number, suffix: string = '...'): string {
    if (text.length <= maxLength) {
      return text;
    }
    
    return text.substring(0, maxLength - suffix.length) + suffix;
  }

  /**
   * Format JSON for display
   */
  static formatJSON(obj: any, indent: number = 2): string {
    try {
      return JSON.stringify(obj, null, indent);
    } catch (error) {
      return String(obj);
    }
  }

  /**
   * Format gas price in Gwei
   */
  static formatGasPrice(gasPrice: string): string {
    const gwei = ethers.formatUnits(gasPrice, 'gwei');
    return `${parseFloat(gwei).toFixed(2)} Gwei`;
  }

  /**
   * Parse and validate number input
   */
  static parseNumber(value: string, decimals?: number): number {
    const num = parseFloat(value);
    
    if (isNaN(num)) {
      throw new Error('Invalid number format');
    }
    
    if (decimals !== undefined) {
      return parseFloat(num.toFixed(decimals));
    }
    
    return num;
  }

  /**
   * Format API response time
   */
  static formatResponseTime(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    } else {
      return `${(ms / 1000).toFixed(2)}s`;
    }
  }
}

export default DataFormatter;