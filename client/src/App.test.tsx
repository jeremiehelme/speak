import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('should render the Speak nav title', () => {
    render(<App />);
    expect(screen.getByText('Speak')).toBeDefined();
  });

  it('should render the dashboard page by default', () => {
    render(<App />);
    expect(screen.getByText('Dashboard')).toBeDefined();
  });
});
