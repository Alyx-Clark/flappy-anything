export const THEMES = {
  classic: {
    id: 'classic',
    name: 'Classic',
    description: 'The original experience',

    background: {
      skyGradient: ['#4EC0CA', '#2B8CBE'],
      hasClouds: true,
      cloudColor: '#FFFFFF',
      hasSnowfall: false,
      hasStarfield: false,
      groundColor: '#DED895',
      groundAccent: '#54A832',
      groundHeight: 60,
    },

    player: {
      type: 'bird',
      bodyColor: '#F7DC6F',
      wingColor: '#F0B429',
      eyeColor: '#FFFFFF',
      beakColor: '#E74C3C',
      size: 17,
    },

    pipe: {
      color: '#54A832',
      highlightColor: '#6ECB3C',
      capColor: '#3E8B2E',
      width: 52,
      capHeight: 20,
      capOverhang: 4,
      hasRockTexture: false,
    },

    ui: {
      scoreColor: '#FFFFFF',
      scoreStroke: '#000000',
      menuHighlight: '#F39C12',
    },

    particles: {
      enabled: false,
    },

    sounds: {
      flap:  { wave: 'sine', freq: 400, freqEnd: 600, duration: 0.1, volume: 0.3 },
      score: { wave: 'sine', freqs: [880, 1320], spacing: 0.08, duration: 0.15, volume: 0.25 },
      crash: { duration: 0.3, noiseVolume: 0.3, thudFreq: 80, volume: 0.35 },
      click: { wave: 'sine', freq: 600, duration: 0.05, volume: 0.2 },
    },
  },

  arctic: {
    id: 'arctic',
    name: 'Arctic',
    description: 'Brave the frozen tundra',

    background: {
      skyGradient: ['#A8D8EA', '#D4E9F7'],
      hasClouds: false,
      hasSnowfall: true,
      snowColor: '#FFFFFF',
      hasStarfield: false,
      groundColor: '#F0F4F8',
      groundAccent: '#B0C4DE',
      groundHeight: 60,
    },

    player: {
      type: 'penguin',
      bodyColor: '#2C3E50',
      bellyColor: '#ECF0F1',
      eyeColor: '#FFFFFF',
      beakColor: '#F39C12',
      size: 17,
    },

    pipe: {
      color: '#A8D8EA',
      highlightColor: '#D6EAF8',
      capColor: '#85C1E9',
      width: 52,
      capHeight: 20,
      capOverhang: 4,
      hasRockTexture: false,
    },

    ui: {
      scoreColor: '#FFFFFF',
      scoreStroke: '#2C3E50',
      menuHighlight: '#1A6DAD',
    },

    particles: {
      enabled: true,
      type: 'snow',
      color: '#FFFFFF',
      count: 40,
    },

    sounds: {
      flap:  { wave: 'triangle', freq: 250, freqEnd: 350, duration: 0.12, volume: 0.3 },
      score: { wave: 'sine', freqs: [660, 990], spacing: 0.09, duration: 0.15, volume: 0.25 },
      crash: { duration: 0.25, noiseVolume: 0.25, thudFreq: 60, volume: 0.3 },
      click: { wave: 'sine', freq: 500, duration: 0.05, volume: 0.2 },
    },
  },

  space: {
    id: 'space',
    name: 'Space',
    description: 'Navigate the cosmos',

    background: {
      skyGradient: ['#0B0C1E', '#1A1A2E'],
      hasClouds: false,
      hasSnowfall: false,
      hasStarfield: true,
      starColor: '#FFFFFF',
      groundColor: '#2C2C54',
      groundAccent: '#474787',
      groundHeight: 60,
    },

    player: {
      type: 'rocket',
      bodyColor: '#E74C3C',
      noseColor: '#F5F5F5',
      windowColor: '#3498DB',
      flameColor: '#F39C12',
      size: 17,
    },

    pipe: {
      color: '#7F8C8D',
      highlightColor: '#95A5A6',
      capColor: '#616A6B',
      width: 52,
      capHeight: 20,
      capOverhang: 4,
      hasRockTexture: true,
    },

    ui: {
      scoreColor: '#00FF88',
      scoreStroke: '#000000',
      menuHighlight: '#E74C3C',
    },

    particles: {
      enabled: true,
      type: 'stars',
      color: '#FFFFFF',
      count: 60,
    },

    sounds: {
      flap:  { wave: 'sawtooth', freq: 100, freqEnd: 200, duration: 0.15, volume: 0.2 },
      score: { wave: 'square', freqs: [1000, 1500], spacing: 0.06, duration: 0.1, volume: 0.15 },
      crash: { duration: 0.35, noiseVolume: 0.35, thudFreq: 50, volume: 0.3 },
      click: { wave: 'square', freq: 700, duration: 0.04, volume: 0.15 },
    },
  },
};

export const THEME_ORDER = ['classic', 'arctic', 'space'];
