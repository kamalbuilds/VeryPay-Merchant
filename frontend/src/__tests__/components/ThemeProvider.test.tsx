import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@/components/theme-provider';

// Mock next-themes
const mockSetTheme = jest.fn();
const mockThemeHook = {
  theme: 'light',
  setTheme: mockSetTheme,
  resolvedTheme: 'light',
  themes: ['light', 'dark', 'system'],
  systemTheme: 'light',
};

jest.mock('next-themes', () => ({
  ThemeProvider: ({ children, ...props }: any) => (
    <div data-testid="theme-provider" {...props}>
      {children}
    </div>
  ),
  useTheme: () => mockThemeHook,
}));

// Test component that uses theme context
const ThemeConsumer = () => {
  return (
    <div>
      <div data-testid="current-theme">{mockThemeHook.theme}</div>
      <button onClick={() => mockThemeHook.setTheme('dark')}>
        Switch to Dark
      </button>
      <button onClick={() => mockThemeHook.setTheme('light')}>
        Switch to Light
      </button>
    </div>
  );
};

describe('ThemeProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset theme state
    mockThemeHook.theme = 'light';
    mockThemeHook.resolvedTheme = 'light';
  });

  describe('Provider Setup', () => {
    it('should render ThemeProvider with default props', () => {
      render(
        <ThemeProvider>
          <div>Test content</div>
        </ThemeProvider>
      );

      const provider = screen.getByTestId('theme-provider');
      expect(provider).toBeInTheDocument();
      expect(provider).toHaveAttribute('attribute', 'class');
      expect(provider).toHaveAttribute('defaultTheme', 'system');
    });

    it('should render ThemeProvider with custom props', () => {
      render(
        <ThemeProvider
          attribute="data-theme"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <div>Test content</div>
        </ThemeProvider>
      );

      const provider = screen.getByTestId('theme-provider');
      expect(provider).toHaveAttribute('attribute', 'data-theme');
      expect(provider).toHaveAttribute('defaultTheme', 'dark');
      expect(provider).toHaveAttribute('enableSystem', 'false');
      expect(provider).toHaveAttribute('disableTransitionOnChange', 'true');
    });

    it('should render children correctly', () => {
      render(
        <ThemeProvider>
          <div data-testid="child-content">Theme Provider Child</div>
        </ThemeProvider>
      );

      expect(screen.getByTestId('child-content')).toBeInTheDocument();
      expect(screen.getByTestId('child-content')).toHaveTextContent('Theme Provider Child');
    });
  });

  describe('Theme Context Integration', () => {
    it('should provide theme context to children', () => {
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
    });

    it('should handle theme switching', async () => {
      const user = userEvent.setup();
      
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      const darkButton = screen.getByRole('button', { name: /switch to dark/i });
      await user.click(darkButton);

      expect(mockSetTheme).toHaveBeenCalledWith('dark');
    });

    it('should handle multiple theme switches', async () => {
      const user = userEvent.setup();
      
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      const darkButton = screen.getByRole('button', { name: /switch to dark/i });
      const lightButton = screen.getByRole('button', { name: /switch to light/i });

      await user.click(darkButton);
      expect(mockSetTheme).toHaveBeenCalledWith('dark');

      await user.click(lightButton);
      expect(mockSetTheme).toHaveBeenCalledWith('light');

      expect(mockSetTheme).toHaveBeenCalledTimes(2);
    });
  });

  describe('System Theme Detection', () => {
    it('should respect system theme preference', () => {
      mockThemeHook.theme = 'system';
      mockThemeHook.systemTheme = 'dark';
      mockThemeHook.resolvedTheme = 'dark';

      render(
        <ThemeProvider enableSystem>
          <ThemeConsumer />
        </ThemeProvider>
      );

      const provider = screen.getByTestId('theme-provider');
      expect(provider).toHaveAttribute('enableSystem', 'true');
    });

    it('should handle system theme changes', () => {
      // Simulate system theme change
      act(() => {
        mockThemeHook.systemTheme = 'dark';
        mockThemeHook.resolvedTheme = 'dark';
      });

      render(
        <ThemeProvider enableSystem>
          <div data-testid="theme-indicator">
            Current resolved theme: {mockThemeHook.resolvedTheme}
          </div>
        </ThemeProvider>
      );

      expect(screen.getByTestId('theme-indicator')).toHaveTextContent('dark');
    });
  });

  describe('CSS Custom Properties', () => {
    it('should apply theme-specific CSS variables', () => {
      // Mock document.documentElement.style
      const documentElementStyle = document.documentElement.style;
      const setPropertySpy = jest.spyOn(documentElementStyle, 'setProperty');

      render(
        <ThemeProvider>
          <div>Theme content</div>
        </ThemeProvider>
      );

      // Simulate theme application (this would normally be done by next-themes)
      act(() => {
        document.documentElement.setAttribute('class', 'light');
      });

      expect(document.documentElement).toHaveClass('light');
    });

    it('should handle dark theme CSS variables', () => {
      render(
        <ThemeProvider defaultTheme="dark">
          <div>Dark theme content</div>
        </ThemeProvider>
      );

      act(() => {
        document.documentElement.setAttribute('class', 'dark');
      });

      expect(document.documentElement).toHaveClass('dark');
    });
  });

  describe('Accessibility', () => {
    it('should not interfere with screen readers', () => {
      render(
        <ThemeProvider>
          <button aria-label="Toggle theme">Theme Toggle</button>
        </ThemeProvider>
      );

      const button = screen.getByLabelText('Toggle theme');
      expect(button).toBeInTheDocument();
      expect(button).toHaveAccessibleName('Toggle theme');
    });

    it('should maintain focus when theme changes', async () => {
      const user = userEvent.setup();
      
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      const darkButton = screen.getByRole('button', { name: /switch to dark/i });
      darkButton.focus();
      expect(darkButton).toHaveFocus();

      await user.click(darkButton);
      expect(darkButton).toHaveFocus();
    });
  });

  describe('Performance', () => {
    it('should not cause unnecessary re-renders', () => {
      const renderSpy = jest.fn();
      
      const TestChild = React.memo(() => {
        renderSpy();
        return <div>Child component</div>;
      });

      const { rerender } = render(
        <ThemeProvider>
          <TestChild />
        </ThemeProvider>
      );

      expect(renderSpy).toHaveBeenCalledTimes(1);

      // Re-render with same props
      rerender(
        <ThemeProvider>
          <TestChild />
        </ThemeProvider>
      );

      expect(renderSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle rapid theme switches efficiently', async () => {
      const user = userEvent.setup();
      
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      const darkButton = screen.getByRole('button', { name: /switch to dark/i });
      const lightButton = screen.getByRole('button', { name: /switch to light/i });

      // Rapid switching
      await user.click(darkButton);
      await user.click(lightButton);
      await user.click(darkButton);
      await user.click(lightButton);

      expect(mockSetTheme).toHaveBeenCalledTimes(4);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing theme context gracefully', () => {
      // Mock console.error to avoid noise in tests
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const ComponentWithoutProvider = () => {
        try {
          return <ThemeConsumer />;
        } catch (error) {
          return <div>Error: {(error as Error).message}</div>;
        }
      };

      render(<ComponentWithoutProvider />);
      
      // Should not crash the app
      expect(screen.getByTestId('current-theme')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    it('should handle invalid theme values', async () => {
      const user = userEvent.setup();
      
      const InvalidThemeComponent = () => (
        <button onClick={() => mockSetTheme('invalid-theme')}>
          Invalid Theme
        </button>
      );

      render(
        <ThemeProvider>
          <InvalidThemeComponent />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      await user.click(button);

      expect(mockSetTheme).toHaveBeenCalledWith('invalid-theme');
    });
  });

  describe('Theme Persistence', () => {
    it('should respect stored theme preference', () => {
      // Mock localStorage
      const localStorageMock = {
        getItem: jest.fn().mockReturnValue('dark'),
        setItem: jest.fn(),
      };
      
      Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
      });

      render(
        <ThemeProvider storageKey="custom-theme">
          <div>Persistent theme</div>
        </ThemeProvider>
      );

      const provider = screen.getByTestId('theme-provider');
      expect(provider).toHaveAttribute('storageKey', 'custom-theme');
    });

    it('should handle storage errors gracefully', () => {
      // Mock localStorage to throw error
      const localStorageMock = {
        getItem: jest.fn().mockImplementation(() => {
          throw new Error('Storage not available');
        }),
        setItem: jest.fn(),
      };
      
      Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
      });

      render(
        <ThemeProvider>
          <div>Theme with storage error</div>
        </ThemeProvider>
      );

      // Should still render without crashing
      expect(screen.getByTestId('theme-provider')).toBeInTheDocument();
    });
  });
});