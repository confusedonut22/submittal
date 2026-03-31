// Degen Blackjack — PixieJS Canvas Renderer
// Chad Labs / Stake Engine RGS
// Handles: felt table, card rendering, chip stacks, animations

import * as PIXI from "pixi.js";
import { C, CARD, SUIT_SYMBOLS, RANK_VALUES } from "./constants.js";

const RED_COLOR  = 0xc62828;
const BLACK_COLOR = 0x1b1b1b;
const FELT_BG    = 0x0c2616;
const FELT_EDGE  = 0x153d24;
const SURFACE    = 0x172e20;
const GOLD       = 0xd4a840;
const CREAM      = 0xf2e8d0;

// ─── APP INIT ───

let app = null;
let cardContainer = null;
let dealerContainer = null;

export async function initCanvas(canvasEl, width, height) {
  app = new PIXI.Application();
  await app.init({
    canvas: canvasEl,
    width,
    height,
    backgroundColor: FELT_BG,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });

  drawFelt(app.stage, width, height);

  dealerContainer = new PIXI.Container();
  dealerContainer.y = 20;
  dealerContainer.x = width / 2;
  app.stage.addChild(dealerContainer);

  cardContainer = new PIXI.Container();
  cardContainer.y = height * 0.45;
  cardContainer.x = width / 2;
  app.stage.addChild(cardContainer);

  return app;
}

export function destroyCanvas() {
  if (app) {
    app.destroy(false, { children: true });
    app = null;
  }
}

export function resizeCanvas(width, height) {
  if (!app) return;
  app.renderer.resize(width, height);
  drawFelt(app.stage, width, height);
  if (dealerContainer) dealerContainer.x = width / 2;
  if (cardContainer)   { cardContainer.x = width / 2; cardContainer.y = height * 0.45; }
}

// ─── FELT TABLE ───

function drawFelt(stage, w, h) {
  // Remove existing felt background if any
  const existing = stage.getChildByName("felt-bg");
  if (existing) stage.removeChild(existing);

  const g = new PIXI.Graphics();
  g.label = "felt-bg";

  // Background
  g.rect(0, 0, w, h).fill(0x071a0e);

  // Felt center radial gradient approximation using concentric ellipses
  for (let i = 10; i >= 0; i--) {
    const alpha = (10 - i) / 10 * 0.6;
    const color = i > 5 ? FELT_BG : FELT_EDGE;
    g.ellipse(w / 2, h * 0.4, w * 0.6 * (i / 10), h * 0.55 * (i / 10))
     .fill({ color, alpha });
  }

  // Divider line
  g.moveTo(w * 0.05, h * 0.52)
   .lineTo(w * 0.95, h * 0.52)
   .stroke({ color: GOLD, alpha: 0.08, width: 1 });

  // "Blackjack pays 3 to 2" text
  const label = new PIXI.Text({
    text: "Blackjack pays 3 to 2",
    style: new PIXI.TextStyle({
      fontFamily: "Caveat, cursive",
      fontSize: 14,
      fill: CREAM,
      alpha: 0.3,
    }),
  });
  label.anchor.set(0.5, 0.5);
  label.x = w / 2;
  label.y = h * 0.52;
  label.alpha = 0.35;

  stage.addChildAt(g, 0);
  stage.addChild(label);
}

// ─── CARD RENDERING ───

function makeCardSprite(card, hidden = false, small = false) {
  const w = small ? CARD.ws : CARD.w;
  const h = small ? CARD.hs : CARD.h;
  const container = new PIXI.Container();

  const g = new PIXI.Graphics();

  if (hidden) {
    // Card back: dark green gradient with border
    g.roundRect(0, 0, w, h, 7).fill({ color: 0x1a3a24 });
    g.roundRect(0, 0, w, h, 7).stroke({ color: 0x2a5a3a, width: 1.5 });
    // Cross-hatch pattern suggestion
    g.moveTo(4, 4).lineTo(w - 4, h - 4).stroke({ color: 0x2a5a3a, alpha: 0.2, width: 1 });
    g.moveTo(w - 4, 4).lineTo(4, h - 4).stroke({ color: 0x2a5a3a, alpha: 0.2, width: 1 });
  } else {
    const suit = card.suit;
    const isRed = suit === "diamonds" || suit === "hearts";
    const color = isRed ? RED_COLOR : BLACK_COLOR;
    const symbol = SUIT_SYMBOLS[suit];
    const rankLabel = card.rank;

    // White card face
    g.roundRect(0, 0, w, h, 7).fill(0xffffff);
    g.roundRect(0, 0, w, h, 7).stroke({ color: 0xdddddd, width: 0.5 });

    const f1 = small ? 12 : 15;
    const f2 = small ? 10 : 13;
    const fc = small ? 22 : 28;

    // Top-left rank + suit
    const topRank = new PIXI.Text({
      text: rankLabel,
      style: new PIXI.TextStyle({ fontFamily: "Georgia, serif", fontSize: f1, fontWeight: "bold", fill: color }),
    });
    topRank.x = small ? 4 : 6;
    topRank.y = small ? 3 : 5;

    const topSuit = new PIXI.Text({
      text: symbol,
      style: new PIXI.TextStyle({ fontFamily: "Georgia, serif", fontSize: f2, fill: color }),
    });
    topSuit.x = small ? 4 : 6;
    topSuit.y = (small ? 3 : 5) + f1 - 2;

    // Center suit
    const centerSuit = new PIXI.Text({
      text: symbol,
      style: new PIXI.TextStyle({ fontFamily: "Georgia, serif", fontSize: fc, fill: color }),
    });
    centerSuit.anchor.set(0.5, 0.5);
    centerSuit.x = w / 2;
    centerSuit.y = h / 2;

    // Bottom-right (rotated 180)
    const botRank = new PIXI.Text({
      text: rankLabel,
      style: new PIXI.TextStyle({ fontFamily: "Georgia, serif", fontSize: f1, fontWeight: "bold", fill: color }),
    });
    botRank.rotation = Math.PI;
    botRank.x = w - (small ? 4 : 6);
    botRank.y = h - (small ? 3 : 5);

    const botSuit = new PIXI.Text({
      text: symbol,
      style: new PIXI.TextStyle({ fontFamily: "Georgia, serif", fontSize: f2, fill: color }),
    });
    botSuit.rotation = Math.PI;
    botSuit.x = w - (small ? 4 : 6);
    botSuit.y = h - (small ? 3 : 5) - f1 + 2;

    container.addChild(topRank, topSuit, centerSuit, botRank, botSuit);
  }

  container.addChildAt(g, 0);
  return container;
}

// ─── RENDER HANDS ───

export function renderDealerHand(cards, hideHole = false, small = false) {
  if (!dealerContainer) return;
  dealerContainer.removeChildren();

  const cw = small ? CARD.ws : CARD.w;
  const total = cards.length;
  const overlap = -12;
  const totalW = total * cw + (total - 1) * overlap;
  let x = -totalW / 2;

  for (let i = 0; i < cards.length; i++) {
    const hidden = hideHole && i === 1;
    const sprite = makeCardSprite(cards[i], hidden, small);
    sprite.x = x;
    sprite.y = 0;
    // Slide-in animation
    sprite.alpha = 0;
    sprite.y -= 10;
    dealerContainer.addChild(sprite);

    const delay = i * 60;
    setTimeout(() => {
      if (!sprite.destroyed) {
        sprite.alpha = 1;
        sprite.y = 0;
      }
    }, delay);
    x += cw + overlap;
  }
}

export function renderPlayerHands(handsData, activeIdx, phase, small = false) {
  if (!cardContainer) return;
  cardContainer.removeChildren();

  const numHands = handsData.length;
  const cw = small ? CARD.ws : CARD.w;
  const handSpacing = small ? 100 : 130;
  const startX = -(numHands - 1) * handSpacing / 2;

  handsData.forEach((hand, hIdx) => {
    const isActive = hIdx === activeIdx;
    const hContainer = new PIXI.Container();
    hContainer.x = startX + hIdx * handSpacing;

    // Active hand glow
    if (isActive) {
      const glow = new PIXI.Graphics();
      glow.roundRect(-cw * 0.5 - 8, -8, cw * hand.cards.length + 16, CARD.h + 16, 10)
          .fill({ color: GOLD, alpha: 0.08 });
      hContainer.addChild(glow);
    }

    const overlap = small ? -6 : -10;
    hand.cards.forEach((card, cIdx) => {
      const sprite = makeCardSprite(card, false, small);
      sprite.x = cIdx * (cw + overlap);
      sprite.alpha = 0;
      hContainer.addChild(sprite);
      setTimeout(() => { if (!sprite.destroyed) sprite.alpha = 1; }, cIdx * 60);
    });

    cardContainer.addChild(hContainer);
  });
}

// ─── CHIP STACK ───

export function makeChipStack(bet) {
  const container = new PIXI.Container();
  if (bet <= 0) return container;

  const denoms = [100_000_000, 25_000_000, 5_000_000, 1_000_000, 500_000];
  const colors = {
    100_000_000: 0xb8860b,
    25_000_000:  0x333333,
    5_000_000:   0x1565c0,
    1_000_000:   0xc62828,
    500_000:     0x555555,
  };

  let rem = bet;
  const stack = [];
  for (const d of denoms) {
    while (rem >= d && stack.length < 6) {
      stack.push(d);
      rem -= d;
    }
  }

  stack.forEach((d, i) => {
    const chip = new PIXI.Graphics();
    chip.ellipse(14, 3.5, 14, 3.5).fill({ color: colors[d] ?? 0x666666 });
    chip.ellipse(14, 3.5, 14, 3.5).stroke({ color: 0xffffff, alpha: 0.15, width: 1 });
    chip.y = -(i * 4);
    container.addChild(chip);
  });

  return container;
}
