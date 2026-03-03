import api from './axiosClient';

export type DiningMealWindow = {
  name: string;
  startTime: string;
  endTime: string;
  current: boolean;
};

export type DiningMenuItem = {
  name: string;
  dietaryTags: string[];
};

export type DiningMenuCategory = {
  name: string;
  items: DiningMenuItem[];
};

export type DiningStation = {
  name: string;
  categories: DiningMenuCategory[];
};

export type DiningMenuSection = {
  section: string;
  stations: DiningStation[];
};

export type DiningHall = {
  slug: string;
  title: string;
  facility: string;
  address: string;
  sourceUrl: string;
  openNow: boolean;
  todaysHours: DiningMealWindow[];
  menus: DiningMenuSection[];
  warningMessage: string | null;
};

export type DiningOverview = {
  serviceDate: string;
  refreshedAt: string;
  sourceName: string;
  sourceUrl: string;
  halls: DiningHall[];
};

export async function getDiningOverview(date?: string): Promise<DiningOverview> {
  const response = await api.get<DiningOverview>('/dining', {
    params: date ? { date } : undefined,
  });
  return response.data;
}
