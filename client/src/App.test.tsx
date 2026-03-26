import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('should render the Speak nav title', () => {
    render(<App />);
    expect(screen.getByText('Speak')).toBeDefined();
  });

  it('should render navigation links', () => {
    render(<App />);
    expect(screen.getByText('Settings')).toBeDefined();
    expect(screen.getByText('Profile')).toBeDefined();
  });

  it('should show loading state initially', () => {
    render(<App />);
    expect(screen.getByText('Loading...')).toBeDefined();
  });
});
