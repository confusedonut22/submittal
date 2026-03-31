// Degen Blackjack — Game Constants
// Chad Labs / Stake Engine RGS

export {
  MONEY_SCALE,
  STARTING_BALANCE,
  SIDE_BET_COST,
  SUITS,
  RANKS,
  RED_SUITS,
  RANK_VALUES,
  NUM_DECKS,
  RESHUFFLE_THRESHOLD,
  BJ_MULTIPLIER,
  PHASE,
  SPEEDS,
  CHIPS,
  C,
  CARD,
} from "./rules.js";

export const SUIT_SYMBOLS = {
  diamonds: "♦", hearts: "♥", clubs: "♣", spades: "♠",
};

import chip50c  from "../assets/chip_50c.png";
import chip1    from "../assets/chip_1.png";
import chip5    from "../assets/chip_5.png";
import chip25   from "../assets/chip_25.png";
import chip100  from "../assets/chip_100.png";
import logo     from "../assets/chad_labs_logo.png";
import jackSpadesCustom from "../assets/jack_spades_sidebetbj.png";

export const CHIP_IMAGES = {
  500_000:     chip50c,
  1_000_000:   chip1,
  5_000_000:   chip5,
  25_000_000:  chip25,
  100_000_000: chip100,
};
export const LOGO_IMAGE = logo;

export const CUSTOM_CARD_FACES = {
  "J_spades": jackSpadesCustom,
};
