// ***********************************************
// Custom commands for VeryPay testing
// ***********************************************

// Authentication commands
Cypress.Commands.add('login', (email = 'test@verypay.com', password = 'testpass123') => {
  cy.session([email, password], () => {
    cy.visit('/auth/login');
    cy.get('[data-testid="email-input"]').type(email);
    cy.get('[data-testid="password-input"]').type(password);
    cy.get('[data-testid="login-button"]').click();
    cy.wait('@login');
    cy.url().should('not.include', '/auth/login');
  });
});

Cypress.Commands.add('logout', () => {
  cy.get('[data-testid="user-menu"]').click();
  cy.get('[data-testid="logout-button"]').click();
  cy.url().should('include', '/auth/login');
});

// Navigation commands
Cypress.Commands.add('navigateTo', (page) => {
  const routes = {
    dashboard: '/dashboard',
    transactions: '/dashboard/transactions',
    merchants: '/dashboard/merchants',
    settings: '/dashboard/settings',
    profile: '/dashboard/profile',
  };
  
  if (routes[page]) {
    cy.visit(routes[page]);
  } else {
    throw new Error(`Unknown page: ${page}`);
  }
});

// Form commands
Cypress.Commands.add('fillPaymentForm', (paymentData) => {
  const defaults = {
    amount: '100.00',
    merchant: 'Test Merchant',
    reference: 'TEST-REF-001',
  };
  
  const data = { ...defaults, ...paymentData };
  
  cy.get('[data-testid="amount-input"]').clear().type(data.amount);
  cy.get('[data-testid="merchant-select"]').select(data.merchant);
  cy.get('[data-testid="reference-input"]').type(data.reference);
});

Cypress.Commands.add('submitPayment', () => {
  cy.get('[data-testid="submit-payment"]').click();
  cy.get('[data-testid="payment-success"]').should('be.visible');
});

// Wallet commands
Cypress.Commands.add('connectWallet', (walletType = 'metamask') => {
  cy.window().then((win) => {
    // Mock wallet provider
    win.ethereum = {
      isMetaMask: walletType === 'metamask',
      request: cy.stub().resolves(['0x742d35Cc6634C0532925a3b8D0D35996A1b9e3e']),
      on: cy.stub(),
      removeListener: cy.stub(),
    };
  });
  
  cy.get('[data-testid="connect-wallet"]').click();
  cy.get('[data-testid="wallet-connected"]').should('be.visible');
});

// Data manipulation commands
Cypress.Commands.add('createTestTransaction', (transactionData = {}) => {
  const defaults = {
    amount: 100,
    currency: 'USD',
    merchant: 'Test Merchant',
    status: 'pending',
  };
  
  const data = { ...defaults, ...transactionData };
  
  return cy.task('createTransaction', data).then((transaction) => {
    return cy.wrap(transaction);
  });
});

Cypress.Commands.add('createTestMerchant', (merchantData = {}) => {
  const defaults = {
    name: 'Test Merchant',
    email: 'merchant@test.com',
    category: 'retail',
    status: 'active',
  };
  
  const data = { ...defaults, ...merchantData };
  
  return cy.task('createMerchant', data).then((merchant) => {
    return cy.wrap(merchant);
  });
});

// Wait commands
Cypress.Commands.add('waitForApiResponse', (alias, timeout = 10000) => {
  cy.wait(alias, { timeout });
});

Cypress.Commands.add('waitForPageLoad', () => {
  cy.get('[data-testid="loading"]').should('not.exist');
  cy.get('[data-testid="page-content"]').should('be.visible');
});

// Assertion commands
Cypress.Commands.add('shouldBeOnPage', (pageName) => {
  const pageSelectors = {
    dashboard: '[data-testid="dashboard-page"]',
    transactions: '[data-testid="transactions-page"]',
    merchants: '[data-testid="merchants-page"]',
    settings: '[data-testid="settings-page"]',
    profile: '[data-testid="profile-page"]',
  };
  
  if (pageSelectors[pageName]) {
    cy.get(pageSelectors[pageName]).should('be.visible');
  } else {
    throw new Error(`Unknown page selector: ${pageName}`);
  }
});

Cypress.Commands.add('shouldShowError', (message) => {
  cy.get('[data-testid="error-message"]').should('be.visible').and('contain.text', message);
});

Cypress.Commands.add('shouldShowSuccess', (message) => {
  cy.get('[data-testid="success-message"]').should('be.visible').and('contain.text', message);
});

// Table commands
Cypress.Commands.add('sortTable', (column, direction = 'asc') => {
  cy.get(`[data-testid="sort-${column}"]`).click();
  if (direction === 'desc') {
    cy.get(`[data-testid="sort-${column}"]`).click();
  }
});

Cypress.Commands.add('filterTable', (filterType, value) => {
  cy.get(`[data-testid="filter-${filterType}"]`).select(value);
  cy.get('[data-testid="apply-filters"]').click();
});

Cypress.Commands.add('searchTable', (searchTerm) => {
  cy.get('[data-testid="table-search"]').clear().type(searchTerm);
  cy.get('[data-testid="search-button"]').click();
});

// Modal commands
Cypress.Commands.add('openModal', (modalType) => {
  cy.get(`[data-testid="open-${modalType}-modal"]`).click();
  cy.get(`[data-testid="${modalType}-modal"]`).should('be.visible');
});

Cypress.Commands.add('closeModal', () => {
  cy.get('[data-testid="close-modal"]').click();
  cy.get('[data-testid*="modal"]').should('not.exist');
});

// Theme commands
Cypress.Commands.add('switchTheme', (theme = 'dark') => {
  cy.get('[data-testid="theme-toggle"]').click();
  if (theme === 'dark') {
    cy.get('[data-testid="dark-theme"]').click();
  } else {
    cy.get('[data-testid="light-theme"]').click();
  }
  cy.get('html').should('have.class', theme);
});

// Accessibility commands
Cypress.Commands.add('checkA11y', (context = null, options = {}) => {
  cy.injectAxe();
  cy.checkA11y(context, {
    ...options,
    includeTags: ['wcag2a', 'wcag2aa'],
  });
});

// Screenshot commands for visual testing
Cypress.Commands.add('compareScreenshot', (name, options = {}) => {
  cy.percySnapshot(name, options);
});

// Mobile commands
Cypress.Commands.add('mockMobileDevice', (device = 'iphone-6') => {
  const devices = {
    'iphone-6': [375, 667],
    'ipad': [768, 1024],
    'android': [360, 640],
  };
  
  if (devices[device]) {
    cy.viewport(...devices[device]);
  }
});

// Network commands
Cypress.Commands.add('mockNetworkError', () => {
  cy.intercept('**/api/**', { forceNetworkError: true }).as('networkError');
});

Cypress.Commands.add('mockSlowNetwork', (delay = 2000) => {
  cy.intercept('**/api/**', (req) => {
    req.reply((res) => {
      res.delay(delay);
    });
  }).as('slowNetwork');
});

// Local storage commands
Cypress.Commands.add('setLocalStorage', (key, value) => {
  cy.window().then((win) => {
    win.localStorage.setItem(key, JSON.stringify(value));
  });
});

Cypress.Commands.add('getLocalStorage', (key) => {
  return cy.window().then((win) => {
    const value = win.localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  });
});