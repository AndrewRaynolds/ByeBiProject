/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LanguageProvider, useTranslation } from './LanguageContext';

function LanguageControls() {
  const { locale, setLocale } = useTranslation();

  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <button onClick={() => setLocale('en')}>English</button>
    </div>
  );
}

describe('LanguageProvider document language', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = 'it';
  });

  it('uses the saved locale for the document language', async () => {
    localStorage.setItem('byebi_locale', 'es');
    render(
      <LanguageProvider>
        <LanguageControls />
      </LanguageProvider>,
    );

    expect(screen.getByTestId('locale')).toHaveTextContent('es');
    await waitFor(() => expect(document.documentElement.lang).toBe('es'));
  });

  it('keeps the document language and preference in sync', async () => {
    render(
      <LanguageProvider>
        <LanguageControls />
      </LanguageProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'English' }));

    await waitFor(() => expect(document.documentElement.lang).toBe('en'));
    expect(localStorage.getItem('byebi_locale')).toBe('en');
  });
});
