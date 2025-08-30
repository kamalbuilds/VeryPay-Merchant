import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/ui/button';

describe('Button Component', () => {
  describe('Rendering', () => {
    it('should render with default props', () => {
      render(<Button>Click me</Button>);
      const button = screen.getByRole('button', { name: /click me/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('bg-primary');
    });

    it('should render with custom className', () => {
      render(<Button className="custom-class">Test</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });

    it('should render different variants', () => {
      const { rerender } = render(<Button variant="default">Default</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-primary');

      rerender(<Button variant="destructive">Destructive</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-destructive');

      rerender(<Button variant="outline">Outline</Button>);
      expect(screen.getByRole('button')).toHaveClass('border-input');

      rerender(<Button variant="secondary">Secondary</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-secondary');

      rerender(<Button variant="ghost">Ghost</Button>);
      expect(screen.getByRole('button')).toHaveClass('hover:bg-accent');

      rerender(<Button variant="link">Link</Button>);
      expect(screen.getByRole('button')).toHaveClass('text-primary');
    });

    it('should render different sizes', () => {
      const { rerender } = render(<Button size="default">Default</Button>);
      expect(screen.getByRole('button')).toHaveClass('h-10');

      rerender(<Button size="sm">Small</Button>);
      expect(screen.getByRole('button')).toHaveClass('h-9');

      rerender(<Button size="lg">Large</Button>);
      expect(screen.getByRole('button')).toHaveClass('h-11');

      rerender(<Button size="icon">Icon</Button>);
      expect(screen.getByRole('button')).toHaveClass('h-10 w-10');
    });
  });

  describe('Interactions', () => {
    it('should handle click events', async () => {
      const handleClick = jest.fn();
      const user = userEvent.setup();

      render(<Button onClick={handleClick}>Click me</Button>);
      
      await user.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not trigger click when disabled', async () => {
      const handleClick = jest.fn();
      const user = userEvent.setup();

      render(
        <Button onClick={handleClick} disabled>
          Disabled
        </Button>
      );
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      
      await user.click(button);
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should handle keyboard events', async () => {
      const handleClick = jest.fn();
      const user = userEvent.setup();

      render(<Button onClick={handleClick}>Press me</Button>);
      
      const button = screen.getByRole('button');
      button.focus();
      
      await user.keyboard('{Enter}');
      expect(handleClick).toHaveBeenCalledTimes(1);
      
      await user.keyboard(' ');
      expect(handleClick).toHaveBeenCalledTimes(2);
    });

    it('should handle focus and blur events', async () => {
      const handleFocus = jest.fn();
      const handleBlur = jest.fn();
      const user = userEvent.setup();

      render(
        <Button onFocus={handleFocus} onBlur={handleBlur}>
          Focus me
        </Button>
      );
      
      const button = screen.getByRole('button');
      
      await user.click(button);
      expect(handleFocus).toHaveBeenCalledTimes(1);
      
      await user.tab();
      expect(handleBlur).toHaveBeenCalledTimes(1);
    });
  });

  describe('States', () => {
    it('should show disabled state', () => {
      render(<Button disabled>Disabled Button</Button>);
      const button = screen.getByRole('button');
      
      expect(button).toBeDisabled();
      expect(button).toHaveClass('disabled:pointer-events-none');
    });

    it('should show loading state with asChild prop', () => {
      render(
        <Button asChild>
          <a href="/test">Link Button</a>
        </Button>
      );
      
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/test');
      expect(link).toHaveClass('inline-flex');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <Button aria-label="Custom label" aria-describedby="help-text">
          Button
        </Button>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Custom label');
      expect(button).toHaveAttribute('aria-describedby', 'help-text');
    });

    it('should be focusable by default', () => {
      render(<Button>Focusable</Button>);
      const button = screen.getByRole('button');
      
      button.focus();
      expect(button).toHaveFocus();
    });

    it('should not be focusable when disabled', () => {
      render(<Button disabled>Not focusable</Button>);
      const button = screen.getByRole('button');
      
      button.focus();
      expect(button).not.toHaveFocus();
    });

    it('should support aria-pressed for toggle buttons', () => {
      const { rerender } = render(
        <Button aria-pressed={false}>Toggle</Button>
      );
      
      expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
      
      rerender(<Button aria-pressed={true}>Toggle</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('Custom Props', () => {
    it('should forward ref correctly', () => {
      const ref = React.createRef<HTMLButtonElement>();
      
      render(<Button ref={ref}>Ref Button</Button>);
      
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
      expect(ref.current).toHaveTextContent('Ref Button');
    });

    it('should spread additional props', () => {
      render(
        <Button
          data-testid="custom-button"
          title="Custom title"
          tabIndex={0}
        >
          Custom Props
        </Button>
      );
      
      const button = screen.getByTestId('custom-button');
      expect(button).toHaveAttribute('title', 'Custom title');
      expect(button).toHaveAttribute('tabIndex', '0');
    });

    it('should handle form submission', async () => {
      const handleSubmit = jest.fn((e) => e.preventDefault());
      const user = userEvent.setup();

      render(
        <form onSubmit={handleSubmit}>
          <Button type="submit">Submit</Button>
        </form>
      );
      
      await user.click(screen.getByRole('button'));
      expect(handleSubmit).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid clicks', async () => {
      const handleClick = jest.fn();
      const user = userEvent.setup();

      render(<Button onClick={handleClick}>Rapid Click</Button>);
      const button = screen.getByRole('button');
      
      // Simulate rapid clicking
      await user.dblClick(button);
      expect(handleClick).toHaveBeenCalledTimes(2);
    });

    it('should handle null children gracefully', () => {
      render(<Button>{null}</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toBeEmptyDOMElement();
    });

    it('should handle undefined onClick gracefully', () => {
      render(<Button>No Handler</Button>);
      const button = screen.getByRole('button');
      
      // Should not throw error
      expect(() => fireEvent.click(button)).not.toThrow();
    });

    it('should maintain focus when re-rendered', async () => {
      const { rerender } = render(<Button>Initial</Button>);
      const button = screen.getByRole('button');
      
      button.focus();
      expect(button).toHaveFocus();
      
      rerender(<Button>Updated</Button>);
      // Focus should be maintained after re-render
      await waitFor(() => {
        expect(screen.getByRole('button')).toHaveFocus();
      });
    });
  });

  describe('Performance', () => {
    it('should not cause unnecessary re-renders', () => {
      const renderSpy = jest.fn();
      
      const TestComponent = React.memo(() => {
        renderSpy();
        return <Button>Memo Button</Button>;
      });

      const { rerender } = render(<TestComponent />);
      expect(renderSpy).toHaveBeenCalledTimes(1);
      
      // Re-render with same props should not trigger render
      rerender(<TestComponent />);
      expect(renderSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle large amounts of text efficiently', () => {
      const longText = 'A'.repeat(1000);
      const startTime = performance.now();
      
      render(<Button>{longText}</Button>);
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render quickly even with long text
      expect(renderTime).toBeLessThan(100); // 100ms threshold
      expect(screen.getByRole('button')).toHaveTextContent(longText);
    });
  });
});