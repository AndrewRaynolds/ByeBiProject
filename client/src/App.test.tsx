/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

describe('App smoke tests', () => {
  describe('React basics', () => {
    it('can render a basic React component', () => {
      const TestComponent = () => <div data-testid="test">Hello</div>;
      render(<TestComponent />);
      expect(screen.getByTestId('test')).toBeInTheDocument();
    });

    it('can render components with children', () => {
      const Parent = ({ children }: { children: React.ReactNode }) => (
        <div data-testid="parent">{children}</div>
      );
      const Child = () => <span data-testid="child">Child content</span>;

      render(
        <Parent>
          <Child />
        </Parent>
      );

      expect(screen.getByTestId('parent')).toBeInTheDocument();
      expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('can handle state updates', async () => {
      const Counter = () => {
        const [count, setCount] = React.useState(0);
        return (
          <div>
            <span data-testid="count">{count}</span>
            <button onClick={() => setCount(c => c + 1)} data-testid="increment">
              Increment
            </button>
          </div>
        );
      };

      render(<Counter />);

      expect(screen.getByTestId('count')).toHaveTextContent('0');

      fireEvent.click(screen.getByTestId('increment'));

      expect(screen.getByTestId('count')).toHaveTextContent('1');
    });
  });

  describe('context providers', () => {
    it('can use React Context', () => {
      const ThemeContext = React.createContext('light');

      const ThemedComponent = () => {
        const theme = React.useContext(ThemeContext);
        return <div data-testid="theme">{theme}</div>;
      };

      render(
        <ThemeContext.Provider value="dark">
          <ThemedComponent />
        </ThemeContext.Provider>
      );

      expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    });
  });

  describe('DOM environment', () => {
    it('has document available', () => {
      expect(document).toBeDefined();
      expect(document.body).toBeDefined();
    });

    it('has window available', () => {
      expect(window).toBeDefined();
    });

    it('has localStorage available', () => {
      expect(window.localStorage).toBeDefined();

      window.localStorage.setItem('test', 'value');
      expect(window.localStorage.getItem('test')).toBe('value');
      window.localStorage.removeItem('test');
    });
  });
});
