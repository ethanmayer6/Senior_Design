import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as diningApi from '../api/diningApi';
import Dining from './Dining';

vi.mock('../components/header', () => ({
  default: () => <div data-testid="mock-header">Header</div>,
}));

vi.mock('../api/diningApi', () => ({
  getDiningOverview: vi.fn(),
}));

describe('Dining page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dining hall overview and current menu sections', async () => {
    vi.mocked(diningApi.getDiningOverview).mockResolvedValue({
      serviceDate: '2026-03-26',
      refreshedAt: '2026-03-26T12:00:00Z',
      sourceName: 'Iowa State Dining',
      sourceUrl: 'https://example.edu/dining',
      halls: [
        {
          slug: 'udcc',
          title: 'UDCC',
          facility: 'Union Drive',
          address: '123 Union Drive',
          sourceUrl: 'https://example.edu/udcc',
          openNow: true,
          todaysHours: [{ name: 'Lunch', startTime: '11:00', endTime: '14:00', current: true }],
          warningMessage: null,
          menus: [
            {
              section: 'Lunch',
              stations: [
                {
                  name: 'Main Line',
                  categories: [{ name: 'Entrees', items: [{ name: 'Pasta Primavera', dietaryTags: ['Vegetarian'] }] }],
                },
              ],
            },
          ],
        },
        {
          slug: 'windows',
          title: 'Windows',
          facility: 'Windows Hall',
          address: '456 Campus Ave',
          sourceUrl: 'https://example.edu/windows',
          openNow: false,
          todaysHours: [],
          warningMessage: 'Temporarily unavailable',
          menus: [],
        },
      ],
    });

    render(
      <MemoryRouter>
        <Dining />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(diningApi.getDiningOverview).toHaveBeenCalled();
    });

    expect(screen.getByText("Compare today's dining halls before you pick where to eat.")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Pasta Primavera')).toBeInTheDocument();
    });
    expect(screen.getByText('Vegetarian')).toBeInTheDocument();
    expect(screen.getByText('Temporarily unavailable')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('shows an error banner when the dining feed fails to load', async () => {
    vi.mocked(diningApi.getDiningOverview).mockRejectedValue(new Error('offline'));

    render(
      <MemoryRouter>
        <Dining />
      </MemoryRouter>,
    );

    expect(await screen.findByText('The live Iowa State dining feed could not be loaded right now.'))
      .toBeInTheDocument();
  });
});
