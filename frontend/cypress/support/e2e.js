// ***********************************************************
// This example support/e2e.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
// ***********************************************************

import './commands';
import '@percy/cypress';
import '@cypress/code-coverage/support';

// Hide fetch/XHR requests from command log
const app = window.top;
if (!app.document.head.querySelector('[data-hide-command-log-request]')) {
  const style = app.document.createElement('style');
  style.innerHTML = '.command-name-request, .command-name-xhr { display: none }';
  style.setAttribute('data-hide-command-log-request', '');
  app.document.head.appendChild(style);
}

// Configure viewport for consistent testing
Cypress.config('viewportWidth', 1280);
Cypress.config('viewportHeight', 720);

// Handle uncaught exceptions
Cypress.on('uncaught:exception', (err, runnable) => {
  // returning false here prevents Cypress from failing the test
  // We can customize this based on the error type
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false;
  }
  if (err.message.includes('Non-Error promise rejection captured')) {
    return false;
  }
  return true;
});

// Before each test
beforeEach(() => {
  // Clear application state
  cy.clearLocalStorage();
  cy.clearCookies();
  
  // Set up intercepts for API calls
  cy.intercept('GET', '/api/health', { fixture: 'health.json' }).as('healthCheck');
  cy.intercept('POST', '/api/auth/login', { fixture: 'auth/login-success.json' }).as('login');
  cy.intercept('GET', '/api/user/profile', { fixture: 'user/profile.json' }).as('userProfile');
  cy.intercept('GET', '/api/transactions', { fixture: 'transactions/list.json' }).as('transactions');
  
  // Set default viewport
  cy.viewport(1280, 720);
  
  // Mock date for consistent testing
  const now = new Date('2023-10-01T10:00:00.000Z');
  cy.clock(now);
});

// After each test
afterEach(() => {
  // Clean up any test data
  cy.task('clearTestData', null, { failOnStatusCode: false });
  
  // Restore clock
  cy.clock().then((clock) => {
    clock.restore();
  });
});