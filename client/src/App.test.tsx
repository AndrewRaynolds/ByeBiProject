/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import App from './App';

vi.mock('@/components/BrandSelection', () => ({
  default: ({ onSelectBrand }: { onSelectBrand: (brand: 'byebro' | 'byebride') => void }) => (
    <div data-testid="brand-selection">
      <button onClick={() => onSelectBrand('byebro')}>Choose ByeBro</button>
      <button onClick={() => onSelectBrand('byebride')}>Choose ByeBride</button>
    </div>
  ),
}));

vi.mock('@/BrandedApp', () => ({
  default: ({ selectedBrand }: { selectedBrand: string }) => (
    <div data-testid="branded-app">{selectedBrand}</div>
  ),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  LanguageProvider: ({ children }: { children: React.ReactNode }) => children,
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('App brand loading', () => {
  beforeEach(() => {
    localStorage.clear();
    document.head.innerHTML = '<meta name="description" content="">';
  });

  it('defers the full application until a brand is selected', () => {
    render(<App />);

    expect(screen.getByTestId('brand-selection')).toBeInTheDocument();
    expect(screen.queryByTestId('branded-app')).not.toBeInTheDocument();
  });

  it('uses neutral metadata before a brand is selected', async () => {
    const description = document.querySelector('meta[name="description"]');
    render(<App />);

    await waitFor(() => {
      expect(document.title).toBe('meta.titleBase');
      expect(description).toHaveAttribute('content', 'meta.descriptionBase');
    });
  });

  it('loads the saved brand without showing the selection screen', async () => {
    localStorage.setItem('selectedBrand', 'byebride');
    render(<App />);

    expect(await screen.findByTestId('branded-app')).toHaveTextContent('byebride');
    expect(screen.queryByTestId('brand-selection')).not.toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe('meta.titleBride'));
  });

  it('persists a new selection and loads the application', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Choose ByeBro' }));

    expect(await screen.findByTestId('branded-app')).toHaveTextContent('byebro');
    expect(localStorage.getItem('selectedBrand')).toBe('byebro');
  });
});

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
