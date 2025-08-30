describe('Payment Flow', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/dashboard/payments');
  });

  describe('Payment Creation', () => {
    it('should create a new payment', () => {
      cy.get('[data-testid="create-payment-button"]').click();
      
      cy.fillPaymentForm({
        amount: '250.00',
        merchant: 'Coffee Shop',
        reference: 'ORDER-2023-001',
      });
      
      cy.submitPayment();
      
      cy.shouldShowSuccess('Payment created successfully');
      cy.get('[data-testid="payment-details"]').should('be.visible');
      cy.get('[data-testid="payment-amount"]').should('contain', '$250.00');
    });

    it('should validate payment form', () => {
      cy.get('[data-testid="create-payment-button"]').click();
      
      // Try to submit empty form
      cy.get('[data-testid="submit-payment"]').click();
      
      cy.get('[data-testid="amount-error"]').should('contain', 'Amount is required');
      cy.get('[data-testid="merchant-error"]').should('contain', 'Merchant is required');
      cy.get('[data-testid="reference-error"]').should('contain', 'Reference is required');
    });

    it('should validate minimum payment amount', () => {
      cy.get('[data-testid="create-payment-button"]').click();
      
      cy.fillPaymentForm({ amount: '0.50' }); // Below minimum
      cy.get('[data-testid="submit-payment"]').click();
      
      cy.get('[data-testid="amount-error"]')
        .should('contain', 'Minimum amount is $1.00');
    });

    it('should validate maximum payment amount', () => {
      cy.get('[data-testid="create-payment-button"]').click();
      
      cy.fillPaymentForm({ amount: '50000.00' }); // Above maximum
      cy.get('[data-testid="submit-payment"]').click();
      
      cy.get('[data-testid="amount-error"]')
        .should('contain', 'Maximum amount is $10,000.00');
    });

    it('should calculate fees correctly', () => {
      cy.get('[data-testid="create-payment-button"]').click();
      
      cy.get('[data-testid="amount-input"]').type('1000.00');
      
      // Should show fee calculation
      cy.get('[data-testid="fee-amount"]').should('contain', '$25.00'); // 2.5%
      cy.get('[data-testid="total-amount"]').should('contain', '$1,025.00');
    });

    it('should support different currencies', () => {
      cy.get('[data-testid="create-payment-button"]').click();
      
      cy.get('[data-testid="currency-select"]').select('EUR');
      cy.fillPaymentForm({ amount: '100.00' });
      
      cy.get('[data-testid="amount-display"]').should('contain', '€100.00');
      cy.get('[data-testid="fee-display"]').should('contain', '€2.50');
    });
  });

  describe('Wallet Integration', () => {
    beforeEach(() => {
      cy.connectWallet('metamask');
    });

    it('should process payment with connected wallet', () => {
      cy.createTestTransaction({ amount: 100 }).then((transaction) => {
        cy.visit(`/dashboard/payments/${transaction.id}`);
        
        cy.get('[data-testid="pay-with-wallet"]').click();
        
        // Mock wallet transaction confirmation
        cy.window().then((win) => {
          win.ethereum.request = cy.stub().resolves('0xabc123...');
        });
        
        cy.get('[data-testid="confirm-payment"]').click();
        cy.get('[data-testid="payment-processing"]').should('be.visible');
        
        cy.waitForApiResponse('@paymentSuccess');
        cy.shouldShowSuccess('Payment completed successfully');
      });
    });

    it('should handle wallet connection errors', () => {
      cy.window().then((win) => {
        win.ethereum.request = cy.stub().rejects(new Error('User rejected request'));
      });
      
      cy.get('[data-testid="connect-wallet"]').click();
      cy.shouldShowError('Failed to connect wallet');
    });

    it('should handle insufficient funds', () => {
      cy.createTestTransaction({ amount: 10000 }).then((transaction) => {
        cy.visit(`/dashboard/payments/${transaction.id}`);
        
        cy.window().then((win) => {
          win.ethereum.request = cy.stub().rejects(new Error('Insufficient funds'));
        });
        
        cy.get('[data-testid="pay-with-wallet"]').click();
        cy.get('[data-testid="confirm-payment"]').click();
        
        cy.shouldShowError('Insufficient funds for transaction');
      });
    });

    it('should support multiple wallet providers', () => {
      // Test WalletConnect
      cy.connectWallet('walletconnect');
      cy.get('[data-testid="wallet-provider"]').should('contain', 'WalletConnect');
      
      // Test Coinbase Wallet
      cy.connectWallet('coinbase');
      cy.get('[data-testid="wallet-provider"]').should('contain', 'Coinbase Wallet');
    });
  });

  describe('Payment Status Tracking', () => {
    it('should show payment status progression', () => {
      cy.createTestTransaction({ status: 'pending' }).then((transaction) => {
        cy.visit(`/dashboard/payments/${transaction.id}`);
        
        // Initial status
        cy.get('[data-testid="payment-status"]').should('contain', 'Pending');
        
        // Mock status updates
        cy.intercept('GET', `/api/payments/${transaction.id}`, {
          ...transaction,
          status: 'processing',
        }).as('statusUpdate1');
        
        cy.reload();
        cy.wait('@statusUpdate1');
        cy.get('[data-testid="payment-status"]').should('contain', 'Processing');
        
        // Final status
        cy.intercept('GET', `/api/payments/${transaction.id}`, {
          ...transaction,
          status: 'completed',
        }).as('statusUpdate2');
        
        cy.reload();
        cy.wait('@statusUpdate2');
        cy.get('[data-testid="payment-status"]').should('contain', 'Completed');
      });
    });

    it('should handle payment failures', () => {
      cy.createTestTransaction({ status: 'failed' }).then((transaction) => {
        cy.visit(`/dashboard/payments/${transaction.id}`);
        
        cy.get('[data-testid="payment-status"]').should('contain', 'Failed');
        cy.get('[data-testid="failure-reason"]').should('be.visible');
        cy.get('[data-testid="retry-payment"]').should('be.visible');
      });
    });

    it('should allow payment retry', () => {
      cy.createTestTransaction({ status: 'failed' }).then((transaction) => {
        cy.visit(`/dashboard/payments/${transaction.id}`);
        
        cy.get('[data-testid="retry-payment"]').click();
        
        // Should redirect to payment form with pre-filled data
        cy.url().should('include', '/dashboard/payments/create');
        cy.get('[data-testid="amount-input"]').should('have.value', transaction.amount);
      });
    });

    it('should show transaction hash for completed payments', () => {
      cy.createTestTransaction({ 
        status: 'completed',
        txHash: '0x1234567890abcdef'
      }).then((transaction) => {
        cy.visit(`/dashboard/payments/${transaction.id}`);
        
        cy.get('[data-testid="transaction-hash"]').should('be.visible');
        cy.get('[data-testid="view-on-explorer"]').should('be.visible');
        
        cy.get('[data-testid="view-on-explorer"]').click();
        // Should open blockchain explorer in new tab
      });
    });
  });

  describe('Payment History', () => {
    beforeEach(() => {
      // Create test transactions
      cy.createTestTransaction({ amount: 100, status: 'completed' });
      cy.createTestTransaction({ amount: 250, status: 'pending' });
      cy.createTestTransaction({ amount: 75, status: 'failed' });
    });

    it('should display payment history', () => {
      cy.visit('/dashboard/payments/history');
      
      cy.get('[data-testid="payment-table"]').should('be.visible');
      cy.get('[data-testid="payment-row"]').should('have.length.at.least', 3);
    });

    it('should filter payments by status', () => {
      cy.visit('/dashboard/payments/history');
      
      cy.filterTable('status', 'completed');
      cy.get('[data-testid="payment-row"]').each(($row) => {
        cy.wrap($row).find('[data-testid="status-badge"]')
          .should('contain', 'Completed');
      });
    });

    it('should filter payments by date range', () => {
      cy.visit('/dashboard/payments/history');
      
      cy.get('[data-testid="date-from"]').type('2023-10-01');
      cy.get('[data-testid="date-to"]').type('2023-10-31');
      cy.get('[data-testid="apply-date-filter"]').click();
      
      cy.get('[data-testid="payment-row"]').should('have.length.at.least', 1);
    });

    it('should sort payments by amount', () => {
      cy.visit('/dashboard/payments/history');
      
      cy.sortTable('amount', 'desc');
      
      // Check that first payment has highest amount
      cy.get('[data-testid="payment-row"]').first()
        .find('[data-testid="amount"]')
        .should('contain', '$250.00');
    });

    it('should search payments', () => {
      cy.visit('/dashboard/payments/history');
      
      cy.searchTable('ORDER-001');
      cy.get('[data-testid="payment-row"]').should('have.length', 1);
      cy.get('[data-testid="reference"]').should('contain', 'ORDER-001');
    });

    it('should export payment history', () => {
      cy.visit('/dashboard/payments/history');
      
      cy.get('[data-testid="export-payments"]').click();
      cy.get('[data-testid="export-csv"]').click();
      
      // Check that file download was triggered
      cy.readFile('cypress/downloads/payments-export.csv').should('exist');
    });
  });

  describe('Mobile Payment Experience', () => {
    beforeEach(() => {
      cy.mockMobileDevice('iphone-6');
    });

    it('should be mobile responsive', () => {
      cy.visit('/dashboard/payments');
      
      cy.get('[data-testid="payment-form"]').should('be.visible');
      cy.get('[data-testid="amount-input"]').should('be.visible');
      cy.get('[data-testid="submit-payment"]').should('be.visible');
    });

    it('should handle mobile wallet connections', () => {
      // Mock mobile wallet (e.g., MetaMask mobile)
      cy.window().then((win) => {
        win.ethereum = {
          isMetaMask: true,
          isMobile: true,
          request: cy.stub().resolves(['0x742d35Cc...'])
        };
      });
      
      cy.get('[data-testid="connect-mobile-wallet"]').click();
      cy.get('[data-testid="wallet-connected"]').should('be.visible');
    });

    it('should support touch interactions', () => {
      cy.createTestTransaction().then((transaction) => {
        cy.visit(`/dashboard/payments/${transaction.id}`);
        
        // Test swipe gestures for status updates
        cy.get('[data-testid="payment-card"]')
          .trigger('touchstart', { touches: [{ clientX: 100, clientY: 100 }] })
          .trigger('touchmove', { touches: [{ clientX: 200, clientY: 100 }] })
          .trigger('touchend');
        
        cy.get('[data-testid="refresh-status"]').should('be.visible');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', () => {
      cy.mockNetworkError();
      
      cy.get('[data-testid="create-payment-button"]').click();
      cy.fillPaymentForm();
      cy.get('[data-testid="submit-payment"]').click();
      
      cy.shouldShowError('Network error. Please check your connection.');
    });

    it('should handle API timeouts', () => {
      cy.mockSlowNetwork(30000); // 30 second delay
      
      cy.get('[data-testid="create-payment-button"]').click();
      cy.fillPaymentForm();
      cy.get('[data-testid="submit-payment"]').click();
      
      cy.get('[data-testid="loading-spinner"]').should('be.visible');
      cy.shouldShowError('Request timeout. Please try again.', { timeout: 35000 });
    });

    it('should handle invalid payment data', () => {
      cy.intercept('POST', '/api/payments', {
        statusCode: 400,
        body: { error: 'Invalid payment amount' }
      }).as('invalidPayment');
      
      cy.get('[data-testid="create-payment-button"]').click();
      cy.fillPaymentForm({ amount: 'invalid' });
      cy.get('[data-testid="submit-payment"]').click();
      
      cy.wait('@invalidPayment');
      cy.shouldShowError('Invalid payment amount');
    });
  });

  describe('Performance', () => {
    it('should load payment page within performance budget', () => {
      cy.visit('/dashboard/payments', {
        onBeforeLoad: (win) => {
          win.performance.mark('start');
        },
        onLoad: (win) => {
          win.performance.mark('end');
          win.performance.measure('pageLoad', 'start', 'end');
          const measure = win.performance.getEntriesByName('pageLoad')[0];
          expect(measure.duration).to.be.lessThan(3000); // 3 second budget
        }
      });
    });

    it('should handle large payment lists efficiently', () => {
      // Mock large dataset
      const largePaymentList = Array.from({ length: 1000 }, (_, i) => ({
        id: `payment-${i}`,
        amount: Math.random() * 1000,
        status: ['pending', 'completed', 'failed'][i % 3],
        created: new Date().toISOString(),
      }));
      
      cy.intercept('GET', '/api/payments', largePaymentList).as('largeList');
      
      cy.visit('/dashboard/payments/history');
      cy.wait('@largeList');
      
      // Should use virtualization or pagination
      cy.get('[data-testid="payment-row"]').should('have.length.lessThan', 100);
      cy.get('[data-testid="pagination"]').should('be.visible');
    });
  });

  describe('Security', () => {
    it('should not expose sensitive payment data', () => {
      cy.createTestTransaction().then((transaction) => {
        cy.visit(`/dashboard/payments/${transaction.id}`);
        
        // Check that private keys or sensitive data are not in DOM
        cy.get('body').should('not.contain', 'private_key');
        cy.get('body').should('not.contain', 'secret');
        cy.get('body').should('not.contain', 'api_key');
      });
    });

    it('should validate CSRF tokens', () => {
      cy.get('[data-testid="create-payment-button"]').click();
      
      // Remove CSRF token
      cy.window().then((win) => {
        const form = win.document.querySelector('[data-testid="payment-form"]');
        const csrfInput = form?.querySelector('input[name="_token"]');
        if (csrfInput) csrfInput.remove();
      });
      
      cy.fillPaymentForm();
      cy.get('[data-testid="submit-payment"]').click();
      
      cy.shouldShowError('Security validation failed');
    });

    it('should handle XSS attempts', () => {
      const xssPayload = '<script>alert("XSS")</script>';
      
      cy.get('[data-testid="create-payment-button"]').click();
      cy.fillPaymentForm({ reference: xssPayload });
      cy.get('[data-testid="submit-payment"]').click();
      
      // Should be escaped and not execute
      cy.get('[data-testid="payment-reference"]')
        .should('contain', '&lt;script&gt;')
        .should('not.contain', '<script>');
    });
  });
});