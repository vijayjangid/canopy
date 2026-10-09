import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '../src/App';

describe('App', () => {
  it('renders the app name and the map title', async () => {
    render(<App />);
    expect(screen.getByText('Canopy')).toBeInTheDocument();
    expect(await screen.findByRole('textbox', { name: 'Map title' })).toBeInTheDocument();
    expect(await screen.findByRole('tree', { name: 'Mind map' })).toBeInTheDocument();
  });
});
