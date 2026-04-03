// Degen Blackjack — Pure game rules and numeric constants

export const MONEY_SCALE = 1_000_000; // 1_000_000 = $1.00
export const STARTING_BALANCE = 1_000_000_000; // $1000.00
export const SIDE_BET_COST = 100_000; // $0.10

export const SUITS = ["diamonds", "hearts", "clubs", "spades"];
export const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
export const RED_SUITS = new Set(["diamonds", "hearts"]);

export const RANK_VALUES = {
  A: 11, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9,
  10: 10, J: 10, Q: 10, K: 10,
};

export const NUM_DECKS = 6;
export const RESHUFFLE_THRESHOLD = 52;
export const BJ_MULTIPLIER = 1.5; // 3:2

export const PHASE = {
  INTRO:  "INTRO",
  BET:    "BET",
  DEAL:   "DEAL",
  PLAY:   "PLAY",
  DEALER: "DEALER",
  RESULT: "RESULT",
  INS:    "INS",
};

export const SPEEDS = {
  "1x":  { label: "1x",  deal: 400, draw: 450, result: 700,  between: 1000 },
  "2x":  { label: "2x",  deal: 180, draw: 200, result: 350,  between: 500  },
  "5x":  { label: "5x",  deal: 50,  draw: 60,  result: 120,  between: 250  },
  "Max": { label: "Max", deal: 0,   draw: 0,   result: 20,   between: 80   },
};

export const CHIPS = [
  { value: 500_000,     label: "50c",  color: "#444444" },
  { value: 1_000_000,   label: "$1",   color: "#c62828" },
  { value: 5_000_000,   label: "$5",   color: "#1565c0" },
  { value: 25_000_000,  label: "$25",  color: "#2e2e2e" },
  { value: 100_000_000, label: "$100", color: "#b8860b" },
];

export const C = {
  bg:   "#071a0e",
  felt: "#0c2616",
  fl:   "#153d24",
  sf:   "#172e20",
  sa:   "#1d4a2c",
  bd:   "#2a5a3a",
  cr:   "#f2e8d0",
  cd:   "#bfb49a",
  ac:   "#e8d48b",
  gn:   "#4caf50",
  rd:   "#ef5350",
  gd:   "#d4a840",
};

export const CARD = { w: 64, h: 90, ws: 50, hs: 70 };
