const STORAGE_KEY = 'flappy_anything_customization';

export const HATS = {
  none:         { id: 'none',         name: 'None' },
  santa:        { id: 'santa',        name: 'Santa' },
  ballcap:      { id: 'ballcap',      name: 'Cap' },
  mohawk:       { id: 'mohawk',       name: 'Mohawk' },
  top_hat:      { id: 'top_hat',      name: 'Top Hat' },
  cowboy:       { id: 'cowboy',       name: 'Cowboy' },
  viking:       { id: 'viking',       name: 'Viking' },
  wizard:       { id: 'wizard',       name: 'Wizard' },
  party_hat:    { id: 'party_hat',    name: 'Party' },
  headband:     { id: 'headband',     name: 'Headband' },
  beanie:       { id: 'beanie',       name: 'Beanie' },
  propeller:    { id: 'propeller',    name: 'Propeller' },
  pirate:       { id: 'pirate',       name: 'Pirate' },
  halo:         { id: 'halo',         name: 'Halo' },
  crown_gold:   { id: 'crown_gold',   name: 'Gold', color: '#FFD700' },
  crown_silver: { id: 'crown_silver', name: 'Silver', color: '#C0C0C0' },
  crown_bronze: { id: 'crown_bronze', name: 'Bronze', color: '#CD7F32' },
};

export const HAT_ORDER = [
  'none', 'santa', 'ballcap', 'mohawk', 'top_hat',
  'cowboy', 'viking', 'wizard', 'party_hat', 'headband',
  'beanie', 'propeller', 'pirate', 'halo',
];
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
  '#FF69B4', // Hot pink
  '#8B4513', // Saddle brown
  '#00CED1', // Dark turquoise
  '#FF6347', // Tomato
  '#7B68EE', // Medium slate blue
  '#32CD32', // Lime green
  '#FF8C00', // Dark orange
  '#4B0082', // Indigo
  '#DC143C', // Crimson
  '#708090', // Slate gray
];

const DEFAULT_CUSTOMIZATION = {
  classic: { hat: 'none', bodyColor: null },
  arctic:  { hat: 'none', bodyColor: null },
  space:   { hat: 'none', bodyColor: null },
  desert:  { hat: 'none', bodyColor: null },
  water:   { hat: 'none', bodyColor: null },
};

export function loadCustomization() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const result = {};
      for (const key of Object.keys(DEFAULT_CUSTOMIZATION)) {
        result[key] = { ...DEFAULT_CUSTOMIZATION[key], ...parsed[key] };
      }
      return result;
    }
  } catch (e) { /* ignore */ }
  const result = {};
  for (const key of Object.keys(DEFAULT_CUSTOMIZATION)) {
    result[key] = { ...DEFAULT_CUSTOMIZATION[key] };
  }
  return result;
}

export function saveCustomization(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) { /* ignore */ }
}
