describe('Authentication Flow', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  describe('Login', () => {
    it('should redirect to login page when not authenticated', () => {
      cy.url().should('include', '/auth/login');
      cy.get('[data-testid="login-form"]').should('be.visible');
    });

    it('should login with valid credentials', () => {
      cy.visit('/auth/login');
      
      cy.get('[data-testid="email-input"]').type('admin@verypay.com');
      cy.get('[data-testid="password-input"]').type('admin123');
      cy.get('[data-testid="login-button"]').click();

      cy.wait('@login');
      cy.url().should('include', '/dashboard');
      cy.get('[data-testid="dashboard-page"]').should('be.visible');
    });

    it('should show error with invalid credentials', () => {
      cy.visit('/auth/login');
      
      cy.get('[data-testid="email-input"]').type('invalid@email.com');
      cy.get('[data-testid="password-input"]').type('wrongpassword');
      cy.get('[data-testid="login-button"]').click();

      cy.shouldShowError('Invalid email or password');
      cy.url().should('include', '/auth/login');
    });

    it('should validate email format', () => {
      cy.visit('/auth/login');
      
      cy.get('[data-testid="email-input"]').type('invalid-email');
      cy.get('[data-testid="password-input"]').type('password123');
      cy.get('[data-testid="login-button"]').click();

      cy.get('[data-testid="email-error"]').should('contain', 'Please enter a valid email');
    });

    it('should require password', () => {
      cy.visit('/auth/login');
      
      cy.get('[data-testid="email-input"]').type('test@verypay.com');
      cy.get('[data-testid="login-button"]').click();

      cy.get('[data-testid="password-error"]').should('contain', 'Password is required');
    });

    it('should toggle password visibility', () => {
      cy.visit('/auth/login');
      
      cy.get('[data-testid="password-input"]').should('have.attr', 'type', 'password');
      cy.get('[data-testid="toggle-password"]').click();
      cy.get('[data-testid="password-input"]').should('have.attr', 'type', 'text');
      cy.get('[data-testid="toggle-password"]').click();
      cy.get('[data-testid="password-input"]').should('have.attr', 'type', 'password');
    });

    it('should remember login state', () => {
      cy.login();
      cy.visit('/dashboard');
      
      // Refresh page - should stay logged in
      cy.reload();
      cy.get('[data-testid="dashboard-page"]').should('be.visible');
    });
  });

  describe('Registration', () => {
    it('should navigate to registration page', () => {
      cy.visit('/auth/login');
      cy.get('[data-testid="register-link"]').click();
      
      cy.url().should('include', '/auth/register');
      cy.get('[data-testid="register-form"]').should('be.visible');
    });

    it('should register new user with valid data', () => {
      cy.visit('/auth/register');
      
      cy.get('[data-testid="name-input"]').type('John Doe');
      cy.get('[data-testid="email-input"]').type('john@example.com');
      cy.get('[data-testid="password-input"]').type('password123');
      cy.get('[data-testid="confirm-password-input"]').type('password123');
      cy.get('[data-testid="terms-checkbox"]').check();
      cy.get('[data-testid="register-button"]').click();

      cy.shouldShowSuccess('Registration successful');
      cy.url().should('include', '/auth/verify-email');
    });

    it('should validate password confirmation', () => {
      cy.visit('/auth/register');
      
      cy.get('[data-testid="name-input"]').type('John Doe');
      cy.get('[data-testid="email-input"]').type('john@example.com');
      cy.get('[data-testid="password-input"]').type('password123');
      cy.get('[data-testid="confirm-password-input"]').type('differentpassword');
      cy.get('[data-testid="register-button"]').click();

      cy.get('[data-testid="password-confirm-error"]')
        .should('contain', 'Passwords do not match');
    });

    it('should require terms acceptance', () => {
      cy.visit('/auth/register');
      
      cy.get('[data-testid="name-input"]').type('John Doe');
      cy.get('[data-testid="email-input"]').type('john@example.com');
      cy.get('[data-testid="password-input"]').type('password123');
      cy.get('[data-testid="confirm-password-input"]').type('password123');
      cy.get('[data-testid="register-button"]').click();

      cy.get('[data-testid="terms-error"]')
        .should('contain', 'You must accept the terms and conditions');
    });
  });

  describe('Password Reset', () => {
    it('should navigate to forgot password page', () => {
      cy.visit('/auth/login');
      cy.get('[data-testid="forgot-password-link"]').click();
      
      cy.url().should('include', '/auth/forgot-password');
      cy.get('[data-testid="forgot-password-form"]').should('be.visible');
    });

    it('should send reset email', () => {
      cy.visit('/auth/forgot-password');
      
      cy.get('[data-testid="email-input"]').type('test@verypay.com');
      cy.get('[data-testid="send-reset-button"]').click();

      cy.shouldShowSuccess('Password reset email sent');
    });

    it('should validate email before sending reset', () => {
      cy.visit('/auth/forgot-password');
      
      cy.get('[data-testid="email-input"]').type('invalid-email');
      cy.get('[data-testid="send-reset-button"]').click();

      cy.get('[data-testid="email-error"]').should('contain', 'Please enter a valid email');
    });
  });

  describe('Logout', () => {
    beforeEach(() => {
      cy.login();
      cy.visit('/dashboard');
    });

    it('should logout user', () => {
      cy.logout();
      cy.url().should('include', '/auth/login');
    });

    it('should clear user data on logout', () => {
      cy.logout();
      
      // Try to access protected route
      cy.visit('/dashboard');
      cy.url().should('include', '/auth/login');
    });
  });

  describe('Session Management', () => {
    it('should handle expired session', () => {
      cy.login();
      cy.visit('/dashboard');
      
      // Mock expired token
      cy.intercept('GET', '/api/user/profile', { statusCode: 401 }).as('expiredToken');
      
      cy.reload();
      cy.wait('@expiredToken');
      
      cy.url().should('include', '/auth/login');
      cy.shouldShowError('Session expired. Please login again.');
    });

    it('should auto-refresh tokens', () => {
      cy.login();
      cy.visit('/dashboard');
      
      // Mock token refresh
      cy.intercept('POST', '/api/auth/refresh', { fixture: 'auth/token-refresh.json' })
        .as('tokenRefresh');
      
      // Wait for auto-refresh (mock timer)
      cy.tick(15 * 60 * 1000); // 15 minutes
      cy.wait('@tokenRefresh');
      
      // Should still be on dashboard
      cy.get('[data-testid="dashboard-page"]').should('be.visible');
    });
  });

  describe('Social Login', () => {
    it('should show social login options', () => {
      cy.visit('/auth/login');
      
      cy.get('[data-testid="google-login"]').should('be.visible');
      cy.get('[data-testid="github-login"]').should('be.visible');
      cy.get('[data-testid="twitter-login"]').should('be.visible');
    });

    it('should initiate Google OAuth', () => {
      cy.visit('/auth/login');
      
      // Mock OAuth window
      cy.window().then((win) => {
        cy.stub(win, 'open').as('openOAuth');
      });
      
      cy.get('[data-testid="google-login"]').click();
      cy.get('@openOAuth').should('have.been.calledWith', 
        Cypress.sinon.match(/accounts\.google\.com/));
    });
  });

  describe('Mobile Authentication', () => {
    beforeEach(() => {
      cy.mockMobileDevice('iphone-6');
    });

    it('should be responsive on mobile devices', () => {
      cy.visit('/auth/login');
      
      cy.get('[data-testid="login-form"]').should('be.visible');
      cy.get('[data-testid="email-input"]').should('have.css', 'width');
      cy.get('[data-testid="login-button"]').should('be.visible');
    });

    it('should handle mobile keyboard interactions', () => {
      cy.visit('/auth/login');
      
      cy.get('[data-testid="email-input"]').should('have.attr', 'inputmode', 'email');
      cy.get('[data-testid="password-input"]').should('have.attr', 'type', 'password');
    });
  });

  describe('Accessibility', () => {
    it('should be accessible', () => {
      cy.visit('/auth/login');
      cy.checkA11y();
    });

    it('should support keyboard navigation', () => {
      cy.visit('/auth/login');
      
      cy.get('[data-testid="email-input"]').focus();
      cy.realPress('Tab');
      cy.get('[data-testid="password-input"]').should('have.focus');
      
      cy.realPress('Tab');
      cy.get('[data-testid="login-button"]').should('have.focus');
      
      cy.realPress('Enter');
      // Should trigger login attempt
    });

    it('should have proper ARIA labels', () => {
      cy.visit('/auth/login');
      
      cy.get('[data-testid="email-input"]')
        .should('have.attr', 'aria-label', 'Email address');
      cy.get('[data-testid="password-input"]')
        .should('have.attr', 'aria-label', 'Password');
      cy.get('[data-testid="login-button"]')
        .should('have.attr', 'aria-label', 'Sign in to your account');
    });
  });
});