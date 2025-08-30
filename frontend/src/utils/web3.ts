import { ethers } from 'ethers';
import { config } from './config';
import { TokenInfo, GasEstimate } from '../types';
import { Logger } from './logger';

export class Web3Helper {
  private provider: ethers.JsonRpcProvider;
  private wallet?: ethers.Wallet;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(config.blockchain.rpcUrl);
    
    if (process.env.PRIVATE_KEY) {
      this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
    }
  }

  /**
   * Get current block number
   */
  async getCurrentBlock(): Promise<number> {
    try {
      return await this.provider.getBlockNumber();
    } catch (error) {
      Logger.error('Failed to get current block number', error);
      throw error;
    }
  }

  /**
   * Get transaction by hash
   */
  async getTransaction(txHash: string): Promise<ethers.TransactionResponse | null> {
    try {
      return await this.provider.getTransaction(txHash);
    } catch (error) {
      Logger.error('Failed to get transaction', error, { txHash });
      throw error;
    }
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(txHash: string): Promise<ethers.TransactionReceipt | null> {
    try {
      return await this.provider.getTransactionReceipt(txHash);
    } catch (error) {
      Logger.error('Failed to get transaction receipt', error, { txHash });
      throw error;
    }
  }

  /**
   * Get balance for an address
   */
  async getBalance(address: string): Promise<string> {
    try {
      const balance = await this.provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      Logger.error('Failed to get balance', error, { address });
      throw error;
    }
  }

  /**
   * Get token balance
   */
  async getTokenBalance(tokenAddress: string, walletAddress: string): Promise<string> {
    try {
      const tokenContract = new ethers.Contract(
        tokenAddress,
        [
          'function balanceOf(address owner) view returns (uint256)',
          'function decimals() view returns (uint8)'
        ],
        this.provider
      );

      const balance = await tokenContract.balanceOf(walletAddress);
      const decimals = await tokenContract.decimals();
      
      return ethers.formatUnits(balance, decimals);
    } catch (error) {
      Logger.error('Failed to get token balance', error, { tokenAddress, walletAddress });
      throw error;
    }
  }

  /**
   * Get token information
   */
  async getTokenInfo(tokenAddress: string): Promise<TokenInfo> {
    try {
      const tokenContract = new ethers.Contract(
        tokenAddress,
        [
          'function symbol() view returns (string)',
          'function name() view returns (string)',
          'function decimals() view returns (uint8)'
        ],
        this.provider
      );

      const [symbol, name, decimals] = await Promise.all([
        tokenContract.symbol(),
        tokenContract.name(),
        tokenContract.decimals()
      ]);

      return {
        address: tokenAddress,
        symbol,
        name,
        decimals,
        isStablecoin: this.isStablecoin(symbol)
      };
    } catch (error) {
      Logger.error('Failed to get token info', error, { tokenAddress });
      throw error;
    }
  }

  /**
   * Estimate gas for a transaction
   */
  async estimateGas(
    to: string,
    value: string,
    data?: string
  ): Promise<GasEstimate> {
    try {
      const gasLimit = await this.provider.estimateGas({
        to,
        value: ethers.parseEther(value),
        data: data || '0x'
      });

      const feeData = await this.provider.getFeeData();
      const gasPrice = feeData.gasPrice || ethers.parseUnits('20', 'gwei');

      const estimatedFee = gasLimit * gasPrice;

      return {
        gasPrice: gasPrice.toString(),
        gasLimit: gasLimit.toString(),
        estimatedFee: ethers.formatEther(estimatedFee)
      };
    } catch (error) {
      Logger.error('Failed to estimate gas', error, { to, value });
      throw error;
    }
  }

  /**
   * Send transaction (if wallet is configured)
   */
  async sendTransaction(
    to: string,
    value: string,
    data?: string
  ): Promise<ethers.TransactionResponse> {
    if (!this.wallet) {
      throw new Error('Wallet not configured');
    }

    try {
      const tx = await this.wallet.sendTransaction({
        to,
        value: ethers.parseEther(value),
        data: data || '0x'
      });

      Logger.info('Transaction sent', { hash: tx.hash, to, value });
      return tx;
    } catch (error) {
      Logger.error('Failed to send transaction', error, { to, value });
      throw error;
    }
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForTransaction(
    txHash: string,
    confirmations: number = config.blockchain.confirmationsRequired
  ): Promise<ethers.TransactionReceipt | null> {
    try {
      return await this.provider.waitForTransaction(txHash, confirmations);
    } catch (error) {
      Logger.error('Failed to wait for transaction', error, { txHash, confirmations });
      throw error;
    }
  }

  /**
   * Validate Ethereum address
   */
  isValidAddress(address: string): boolean {
    return ethers.isAddress(address);
  }

  /**
   * Check if token is a stablecoin (simple heuristic)
   */
  private isStablecoin(symbol: string): boolean {
    const stablecoins = ['USDT', 'USDC', 'DAI', 'BUSD', 'TUSD', 'USDD', 'FRAX'];
    return stablecoins.includes(symbol.toUpperCase());
  }

  /**
   * Convert Wei to Ether
   */
  weiToEther(wei: string): string {
    return ethers.formatEther(wei);
  }

  /**
   * Convert Ether to Wei
   */
  etherToWei(ether: string): string {
    return ethers.parseEther(ether).toString();
  }

  /**
   * Format token amount with proper decimals
   */
  formatTokenAmount(amount: string, decimals: number): string {
    return ethers.formatUnits(amount, decimals);
  }

  /**
   * Parse token amount to smallest unit
   */
  parseTokenAmount(amount: string, decimals: number): string {
    return ethers.parseUnits(amount, decimals).toString();
  }

  /**
   * Get current gas price
   */
  async getCurrentGasPrice(): Promise<string> {
    try {
      const feeData = await this.provider.getFeeData();
      return (feeData.gasPrice || ethers.parseUnits('20', 'gwei')).toString();
    } catch (error) {
      Logger.error('Failed to get current gas price', error);
      throw error;
    }
  }

  /**
   * Check if transaction is confirmed
   */
  async isTransactionConfirmed(
    txHash: string,
    requiredConfirmations: number = config.blockchain.confirmationsRequired
  ): Promise<boolean> {
    try {
      const receipt = await this.getTransactionReceipt(txHash);
      if (!receipt) return false;

      const currentBlock = await this.getCurrentBlock();
      const confirmations = currentBlock - receipt.blockNumber + 1;
      
      return confirmations >= requiredConfirmations;
    } catch (error) {
      Logger.error('Failed to check transaction confirmation', error, { txHash });
      return false;
    }
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(txHash: string): Promise<{
    status: 'pending' | 'confirmed' | 'failed';
    confirmations: number;
    blockNumber?: number;
  }> {
    try {
      const receipt = await this.getTransactionReceipt(txHash);
      
      if (!receipt) {
        return { status: 'pending', confirmations: 0 };
      }

      if (receipt.status === 0) {
        return { status: 'failed', confirmations: 0, blockNumber: receipt.blockNumber };
      }

      const currentBlock = await this.getCurrentBlock();
      const confirmations = currentBlock - receipt.blockNumber + 1;

      return {
        status: confirmations >= config.blockchain.confirmationsRequired ? 'confirmed' : 'pending',
        confirmations,
        blockNumber: receipt.blockNumber
      };
    } catch (error) {
      Logger.error('Failed to get transaction status', error, { txHash });
      throw error;
    }
  }
}

export const web3Helper = new Web3Helper();