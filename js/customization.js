const STORAGE_KEY = 'flappy_anything_customization';

export const HATS = {
  none:         { id: 'none',         name: 'None' },
  santa:        { id: 'santa',        name: 'Santa' },
  ballcap:      { id: 'ballcap',      name: 'Cap' },
  mohawk:       { id: 'mohawk',       name: 'Mohawk' },
  crown_gold:   { id: 'crown_gold',   name: 'Gold', color: '#FFD700' },
  crown_silver: { id: 'crown_silver', name: 'Silver', color: '#C0C0C0' },
  crown_bronze: { id: 'crown_bronze', name: 'Bronze', color: '#CD7F32' },
};

export const HAT_ORDER = ['none', 'santa', 'ballcap', 'mohawk'];
export const CROWN_ORDER = ['crown_gold', 'crown_silver', 'crown_bronze'];

export const COLOR_PALETTE = [
  '#F7DC6F', // Yellow (bird default)
  '#E74C3C', // Red (rocket default)
  '#2C3E50', // Dark blue-gray (penguin default)
  '#3498DB', // Blue
  '#2ECC71', // Green
  '#9B59B6', // Purple
  '#F39C12', // Orange
  '#1ABC9C', // Teal
];

const DEFAULT_CUSTOMIZATION = {
  classic: { hat: 'none', bodyColor: null },
  arctic:  { hat: 'none', bodyColor: null },
  space:   { hat: 'none', bodyColor: null },
};

export function loadCustomization() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        classic: { ...DEFAULT_CUSTOMIZATION.classic, ...parsed.classic },
        arctic:  { ...DEFAULT_CUSTOMIZATION.arctic,  ...parsed.arctic },
        space:   { ...DEFAULT_CUSTOMIZATION.space,    ...parsed.space },
      };
    }
  } catch (e) { /* ignore */ }
  return {
    classic: { ...DEFAULT_CUSTOMIZATION.classic },
    arctic:  { ...DEFAULT_CUSTOMIZATION.arctic },
    space:   { ...DEFAULT_CUSTOMIZATION.space },
  };
}

export function saveCustomization(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) { /* ignore */ }
}
