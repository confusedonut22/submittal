<script>
  import { onMount, onDestroy, afterUpdate } from "svelte";
  import { get } from "svelte/store";
  import {
    phase, balance, dealerHand, hands, activeHand, message, fact, pending,
    numSlots, maxHands, autoPlay, autoSpeed, autoCount, autoMax, autoMode,
    showAuto, showRules, showFacts, totalCost, canDeal, introOp, rgsStatus, rgsError, runtimeConfig, runtimeJurisdiction,
    sessionStartedAt, netPosition, runtimeCurrency,
    startIntro, addSlot, removeSlot, addSideBetChip, clearSideBet, addChip, clearBet, setBetLevel, adjustBetByFactor,
    newRound, deal, hit, stand, doubleDown, split, takeInsurance, autoTick, refreshStakeBalance,
  } from "../game/store.js";
  import { PHASE, SPEEDS, MONEY_SCALE, CHIPS, CHIP_IMAGES, LOGO_IMAGE, CUSTOM_CARD_FACES, C } from "../game/constants.js";
  import { handValue, isSoft } from "../game/engine.js";
  import { launchWarnings, replayMode, sessionQuery } from "../game/session.js";
  import { sessionBootstrap } from "../game/bootstrap.js";
  import { formatCurrencyAmount, formatSessionDuration, formatSignedMoney } from "../game/sessionDisplay.js";

  // ─── FORMAT ───
  const AUTO_MODES = [
    {
      key: "conservative",
      label: "Conservative",
      summary: "Protects bankroll by minimizing doubles and leaning toward lower-variance stands.",
    },
    {
      key: "optimal",
      label: "Optimal",
      summary: "Uses mathematically correct basic strategy for the current rule set.",
    },
    {
      key: "high-stakes",
      label: "High Stakes",
      summary: "Pushes more aggressive doubles and pressure spots for bigger swings.",
    },
  ];

  const fmt = (v, currency = "USD") => formatCurrencyAmount(v, currency, MONEY_SCALE);
  const fmtVal = (cards) => {
    if (!cards?.length) return "";
    const v = handValue(cards);
    const soft = isSoft(cards) && v <= 21;
    if (soft) return `${v - 10}/${v}`;
    return v;
  };

  // ─── RESPONSIVE ───
  let windowWidth = 500;
  $: isDesktop = windowWidth >= 768;
  $: isWideDesktop = windowWidth >= 1280;
  $: {
    maxHands.set(windowWidth >= 600 ? 4 : 2);
  }

  // ─── COMPUTED ───
  $: isBet    = $phase === PHASE.BET;
  $: isPlay   = $phase === PHASE.PLAY;
  $: isDealer = $phase === PHASE.DEALER;
  $: isResult = $phase === PHASE.RESULT;
  $: isIns    = $phase === PHASE.INS;
  $: locked   = !isBet;
  $: dealerVal = $dealerHand.length ? handValue($dealerHand) : 0;
  $: dealerSoft = $dealerHand.length >= 2 && !(isPlay || isIns) && isSoft($dealerHand) && dealerVal <= 21;
  $: dealerDisplay = (isPlay || isIns)
    ? handValue([$dealerHand[0]])
    : (dealerSoft ? `${dealerVal - 10}/${dealerVal}` : dealerVal);
  $: multi = $numSlots > 1;
  $: activeH = $activeHand >= 0 ? $hands[$activeHand] : null;
  $: isReplay = $replayMode;
  $: autoplayDisabled = $runtimeJurisdiction?.disabledAutoplay === true;
  $: showRtp = $runtimeJurisdiction?.displayRTP !== false;
  let nowMs = Date.now();
  let sessionClock = null;
  $: showSessionTimer = $runtimeJurisdiction?.displaySessionTimer === true && Number.isInteger($sessionStartedAt) && !isReplay;
  $: showNetPosition = $runtimeJurisdiction?.displayNetPosition === true && !isReplay;
  $: sessionElapsed = showSessionTimer ? formatSessionDuration(nowMs - $sessionStartedAt) : "00:00";
  $: sessionNet = formatSignedMoney($netPosition, MONEY_SCALE, $runtimeCurrency);
  $: netPositive = $netPosition > 0;
  $: netNegative = $netPosition < 0;

  // ─── RESPONSIVE INLINE STYLE VALUES ───
  $: desktopScale = isWideDesktop ? 0.86 : 1;
  $: cardOverlap      = isDesktop ? (isWideDesktop ? '-16px' : '-20px') : '-14px';
  $: cardOverlapSmall = isDesktop ? (isWideDesktop ? '-11px' : '-13px') : '-10px';
  $: dealerOverlap    = isDesktop ? (isWideDesktop ? '-18px' : '-22px') : '-14px';
  $: cardsRowMinH     = isDesktop ? (multi ? (isWideDesktop ? 106 : 126) : (isWideDesktop ? 142 : 168)) : (multi ? 87 : 112);
  $: handColMaxW      = isDesktop ? (multi ? (isWideDesktop ? '250px' : '300px') : (isWideDesktop ? '390px' : '460px')) : (multi ? '200px' : '320px');
  $: canDouble = activeH && activeH.cards.length === 2 && $balance >= activeH.bet && !activeH.isSplitAcesLocked;
  $: canSplit = activeH && activeH.cards.length === 2 && !activeH.doubled && !activeH.done && !activeH.isSplitAcesLocked && ((activeH.cards[0]?.rank === activeH.cards[1]?.rank) || (Math.min(10, handValue([activeH.cards[0]])) === Math.min(10, handValue([activeH.cards[1]]))));
  $: isBadBeat = isResult && $message;
  $: dealLabel = $autoPlay ? `Auto ${$autoCount}/${$autoMax}` : isDealer ? "Dealing..." : isIns ? "Insurance..." : isResult ? "Next Hand" : "Deal";
  $: tableControlMode = isDesktop && !isPlay ? 'table' : 'footer';

  // ─── ACTIONS ───
  function onDeal() {
    if (isResult) {
      newRound();
      setTimeout(() => {
        if (get(phase) === PHASE.BET) deal();
      }, 0);
    } else if (isBet) {
      deal();
    }
  }

  function toggleAuto() {
    if (autoplayDisabled) return;
    if ($autoPlay) {
      autoPlay.set(false);
    } else {
      autoCount.set(0);
      autoPlay.set(true);
      if (isResult) newRound();
    }
  }

  function resultColor(result) {
    if (result === "win" || result === "blackjack") return "#66ff88";
    if (result === "push") return C.cd;
    return C.rd;
  }

  function handMsg(h) {
    if (h.result) return h.message;
    const v = handValue(h.cards);
    if (isSoft(h.cards) && v <= 21) return `${v - 10}/${v}`;
    return v;
  }

  function customFaceFor(card) {
    if (!card) return null;
    return CUSTOM_CARD_FACES[`${card.rank}_${card.suit}`] ?? null;
  }

  // ─── SIDE BET SELECTION ───
  let sbSelect = {}; // { [handIdx]: "pp" | "t" | null }
  let betEntryMode = "amount";
  let betDraft = {};
  $: if (!isBet) {
    sbSelect = {};
    betDraft = {};
  }

  function toggleSbSelect(idx, key) {
    if (!isBet) return;
    sbSelect = { ...sbSelect, [idx]: sbSelect[idx] === key ? null : key };
  }

  function onChipClick(idx, value) {
    if (!isBet) return;
    const sb = sbSelect[idx];
    if (sb) addSideBetChip(idx, sb, value);
    else if ($runtimeConfig?.betLevels?.length) setBetLevel(idx, value);
    else addChip(idx, value);
  }

  function onClear(idx) {
    const sb = sbSelect[idx];
    if (sb) clearSideBet(idx, sb);
    else clearBet(idx);
  }

  function onBetDraftInput(idx, nextValue) {
    betDraft = { ...betDraft, [idx]: nextValue };
  }

  function commitBetDraft(idx) {
    const raw = Number.parseFloat(String(betDraft[idx] ?? "").replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(raw) || raw <= 0) return;
    const scaled = Math.round(raw * MONEY_SCALE);
    setBetLevel(idx, scaled);
    betDraft = { ...betDraft, [idx]: fmt(scaled, $runtimeCurrency).replace(/[^0-9.]/g, "") };
  }

  function closePanels() {
    if ($showAuto) showAuto.set(false);
    if ($showRules) showRules.set(false);
  }

  function toggleFacts(event) {
    event?.stopPropagation?.();
    showFacts.update((v) => !v);
  }

  function toggleAutoPanel(event) {
    event?.stopPropagation?.();
    showAuto.update((v) => !v);
    showRules.set(false);
  }

  function toggleRulesPanel(event) {
    event?.stopPropagation?.();
    showRules.update((v) => !v);
    showAuto.set(false);
  }

  function stopEvent(event) {
    event?.stopPropagation?.();
  }

  onMount(() => {
    startIntro();
    sessionClock = setInterval(() => {
      nowMs = Date.now();
    }, 1000);

    const handleWindowFocus = () => {
      refreshStakeBalance();
    };
    const handleVisibilityChange = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        refreshStakeBalance();
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("focus", handleWindowFocus);
    }
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("focus", handleWindowFocus);
      }
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
    };
  });

  onDestroy(() => {
    if (sessionClock) clearInterval(sessionClock);
  });
</script>

<svelte:window bind:innerWidth={windowWidth} />

<!-- INTRO SCREEN -->
{#if $phase === PHASE.INTRO}
<div class="intro" style="opacity: {$introOp}">
  <div class="intro-glow"></div>
  <div class="intro-frame">
    <div class="intro-mark-wrap">
      <img src={LOGO_IMAGE} alt="Chad Labs" class="intro-mark" />
    </div>
    <div class="intro-copy">
      <div class="intro-kicker">Chad Labs</div>
      <div class="intro-title">Sidebet Blackjack</div>
      <div class="intro-subtitle">Sidebets, Multiple Hands</div>
    </div>
  </div>
</div>
{:else}

<!-- GAME TABLE -->
<div class="table-wrap" style:--desktop-scale={desktopScale}>
  <!-- BALANCE -->
  <div class="balance-row">
    <div class="session-meta">
      {#if showSessionTimer}
        <span class="session-pill">
          <strong>Session</strong> {sessionElapsed}
        </span>
      {/if}
      {#if showNetPosition}
        <span class="session-pill" class:positive={netPositive} class:negative={netNegative}>
          <strong>Net</strong> {sessionNet}
        </span>
      {/if}
    </div>
    <div class="balance-meta">
      <span class="balance">{fmt($balance, $runtimeCurrency)}</span>
      {#if $rgsStatus === "playing" || $rgsStatus === "round-active"}
        <span class="rgs-status">RGS {$rgsStatus}</span>
      {/if}
    </div>
  </div>

  {#if $sessionBootstrap.status === "loading"}
    <div class="launch-warning">
      Authenticating Stake session...
    </div>
  {:else if $sessionBootstrap.status === "error"}
    <div class="launch-warning">
      Authenticate failed: {$sessionBootstrap.error}
    </div>
  {:else if $rgsError}
    <div class="launch-warning">
      RGS flow warning: {$rgsError}
    </div>
  {:else if $sessionBootstrap.resumeBlocked}
    <div class="launch-warning">
      Authenticated session returned an active round. Resume flow is not implemented in this prototype.
    </div>
  {:else if isReplay}
    <div class="replay-banner">
      <strong>Replay mode</strong>
      <span>
        {#if $sessionQuery.game}Game {$sessionQuery.game}{/if}
        {#if $sessionQuery.version} · Version {$sessionQuery.version}{/if}
        {#if $sessionQuery.event} · Event {$sessionQuery.event}{/if}
      </span>
    </div>
  {:else if $launchWarnings.length > 0}
    <div class="launch-warning">
      Launch params incomplete: {$launchWarnings.join(", ")}
    </div>
  {/if}

  <!-- FELT AREA -->
  <div class="felt" on:click={closePanels}>
    {#if !isReplay && (isBet || isResult) && !autoplayDisabled}
      <div class="felt-menu" on:click={stopEvent}>
        <div class="felt-menu-row">
          <button class="btn-tab felt-menu-btn" class:active={$showAuto} on:click={toggleAutoPanel}>Auto</button>
          <button class="btn-tab felt-menu-btn" class:active={$showRules} on:click={toggleRulesPanel}>Rules</button>
          <button class="btn-tab felt-menu-btn felt-menu-btn-fact" class:active={$showFacts} on:click={toggleFacts}>Fact</button>
        </div>
        {#if isBet}
          <div class="felt-toggle-copy">Wager input</div>
          <div class="bet-entry-toggle felt-toggle-stack" on:click={stopEvent}>
            <button class="bet-entry-btn" class:active={betEntryMode === 'amount'} on:click={() => betEntryMode = 'amount'}>Amount</button>
            <button class="bet-entry-btn" class:active={betEntryMode === 'chips'} on:click={() => betEntryMode = 'chips'}>Chips</button>
          </div>
        {/if}
      </div>
    {/if}

    <!-- DEALER AREA -->
    <div class="dealer-area">
      {#if $dealerHand.length > 0}
        <div class="hand-value">{dealerDisplay}</div>
        <div class="cards-row">
          {#each $dealerHand as card, i}
            <div class="card-wrap" style="margin-left: {i > 0 ? dealerOverlap : '0'}; z-index: {i}">
              {#if (isPlay || isIns) && i === 1}
                <div class="card card-hidden">
                  <img src={LOGO_IMAGE} alt="" class="card-back-logo" />
                </div>
              {:else}
                {#if customFaceFor(card)}
                  <div class="card card-face card-custom" class:small={multi}>
                    <img src={customFaceFor(card)} alt={`${card.rank} of ${card.suit}`} class="card-custom-art" />
                  </div>
                {:else}
                  <div class="card card-face" class:red={card.suit === 'diamonds' || card.suit === 'hearts'}>
                    <div class="card-corner card-tl">
                      <span class="card-rank">{card.rank}</span>
                      <span class="card-suit-sm">{card.suit === 'diamonds' ? '♦' : card.suit === 'hearts' ? '♥' : card.suit === 'clubs' ? '♣' : '♠'}</span>
                    </div>
                    <div class="card-center">{card.suit === 'diamonds' ? '♦' : card.suit === 'hearts' ? '♥' : card.suit === 'clubs' ? '♣' : '♠'}</div>
                    <div class="card-corner card-br">
                      <span class="card-rank">{card.rank}</span>
                      <span class="card-suit-sm">{card.suit === 'diamonds' ? '♦' : card.suit === 'hearts' ? '♥' : card.suit === 'clubs' ? '♣' : '♠'}</span>
                    </div>
                  </div>
                {/if}
              {/if}
            </div>
          {/each}
        </div>
      {:else}
        <div class="dealer-placeholder"></div>
      {/if}
    </div>

    <!-- DIVIDER + FACT -->
    <div class="divider-row">
      <div class="divider-line"></div>
      <span class="divider-label">Blackjack pays 3 to 2</span>
      <div class="divider-line"></div>
    </div>
    {#if isBet}
      <div class="fact-row" class:table-layout={tableControlMode === 'table'}>
        {#if tableControlMode === 'table'}
          <div class="desktop-deal-wrap">
            <button
              class="btn-deal btn-deal-inline"
              disabled={!$canDeal && !isDealer && !isIns}
              class:active={$canDeal}
              on:click={$canDeal ? onDeal : undefined}
            >
              {dealLabel}
            </button>
          </div>
        {/if}
      </div>
    {/if}

    <!-- INSURANCE PROMPT -->
    {#if isIns && $pending?.insuranceOffers}
      <div class="ins-grid">
        {#each $pending.insuranceOffers as offer}
          <div class="ins-card">
            <span class="ins-label">Hand {offer.handIndex + 1} insurance?</span>
            <span class="ins-amount">{fmt(offer.amount, $runtimeCurrency)}</span>
            <div class="ins-actions">
              <button class="btn-ins-yes" on:click={() => takeInsurance(offer.handIndex, true)}>Yes</button>
              <button class="btn-ins-no" on:click={() => takeInsurance(offer.handIndex, false)}>No</button>
            </div>
          </div>
        {/each}
      </div>
    {/if}

    <!-- RESULT MESSAGE -->
    <div class="result-msg">
      {#if $message && isResult}
        <span class="msg-text" class:bad-beat={isBadBeat}>{$message}</span>
      {/if}
    </div>

    {#if isResult}
      <div class="result-next-wrap">
        <button
          class="btn-deal btn-next-centered"
          disabled={!$canDeal && !isDealer && !isIns}
          class:active={$canDeal}
          on:click|stopPropagation={$canDeal ? onDeal : undefined}
        >
          {dealLabel}
        </button>
      </div>
    {/if}

    <!-- PLAYER HANDS -->
    <div class="hands-row" class:multi>
      {#each $hands as hand, idx}
        {@const isActive = $activeHand === idx && isPlay}
        {@const rc = resultColor(hand.result)}
        {@const activeSb = sbSelect[idx]}
        <div class="hand-col" style="max-width: {handColMaxW}">

          <!-- Hand value bubble -->
          {#if hand.cards.length > 0}
            <div class="hv-bubble" class:active={isActive} style="color: {hand.result ? rc : C.cr}">
              {handMsg(hand)}
            </div>
          {/if}

          <!-- Cards area with side bet boxes on left -->
          <div class="cards-area">
            <!-- Side bet boxes: only show when betting or when a side bet is active -->
            {#if isBet || hand.sb.pp > 0 || hand.sb.t > 0}
            <div class="sb-col">
              {#each [{k:"pp", n:"PP"}, {k:"t", n:"21+3"}] as sb}
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <!-- svelte-ignore a11y-no-static-element-interactions -->
                <div
                  class="sb-box"
                  class:sb-active={hand.sb[sb.k] > 0}
                  class:sb-selected={activeSb === sb.k}
                  on:click={() => !isReplay && toggleSbSelect(idx, sb.k)}
                >
                  <span class="sb-box-label">{sb.n}</span>
                  {#if hand.sb[sb.k] > 0}
                    <span class="sb-box-amt">{fmt(hand.sb[sb.k], $runtimeCurrency)}</span>
                  {/if}
                </div>
              {/each}
            </div>
            {/if}

            <!-- Cards column -->
            <div class="cards-col">
              <div class="cards-row" style="min-height: {cardsRowMinH}px">
                {#if hand.cards.length > 0}
                  {#each hand.cards as card, i}
                    <div class="card-wrap" style="margin-left: {i > 0 ? (multi ? cardOverlapSmall : cardOverlap) : '0'}; z-index: {i}">
                      {#if customFaceFor(card)}
                        <div class="card card-face card-custom" class:small={multi}>
                          <img src={customFaceFor(card)} alt={`${card.rank} of ${card.suit}`} class="card-custom-art" />
                        </div>
                      {:else}
                        <div class="card card-face" class:small={multi} class:red={card.suit === 'diamonds' || card.suit === 'hearts'}>
                          <div class="card-corner card-tl">
                            <span class="card-rank">{card.rank}</span>
                            <span class="card-suit-sm">{card.suit === 'diamonds' ? '♦' : card.suit === 'hearts' ? '♥' : card.suit === 'clubs' ? '♣' : '♠'}</span>
                          </div>
                          <div class="card-center">{card.suit === 'diamonds' ? '♦' : card.suit === 'hearts' ? '♥' : card.suit === 'clubs' ? '♣' : '♠'}</div>
                          <div class="card-corner card-br">
                            <span class="card-rank">{card.rank}</span>
                            <span class="card-suit-sm">{card.suit === 'diamonds' ? '♦' : card.suit === 'hearts' ? '♥' : card.suit === 'clubs' ? '♣' : '♠'}</span>
                          </div>
                        </div>
                      {/if}
                    </div>
                  {/each}
                {:else}
                  <div class="card-placeholder" class:small={multi}></div>
                  <div class="card-placeholder" class:small={multi} style="margin-left: {multi ? cardOverlapSmall : cardOverlap}; opacity: 0.5"></div>
                {/if}
              </div>
            </div>
          </div>

          <!-- Payout -->
          {#if hand.payout > 0 && isResult}
            <div class="payout">+{fmt(hand.payout, $runtimeCurrency)}</div>
          {/if}

          <!-- Wager label -->
          {#if hand.bet > 0 || isBet}
            <div class="bet-bar">
              <div class="wager-label wager-label-top">
                {fmt(hand.bet, $runtimeCurrency)}{activeSb ? ` · ${activeSb === 'pp' ? 'PP' : '21+3'} ${fmt(hand.sb[activeSb], $runtimeCurrency)}` : ''}
              </div>
              {#if isBet && !isReplay && !activeSb && (betEntryMode === 'amount' || betEntryMode === 'both')}
                <div class="bet-amount-row bet-amount-row-with-actions">
                  <button class="bet-quick-btn" on:click={() => adjustBetByFactor(idx, 0.5)}>1/2</button>
                  <div class="bet-input-shell">
                    <span class="bet-amount-prefix">Bet</span>
                    <input
                      class="bet-amount-input"
                      inputmode="decimal"
                      value={betDraft[idx] ?? fmt(hand.bet, $runtimeCurrency).replace(/[^0-9.]/g, '')}
                      on:click|stopPropagation
                      on:input={(event) => onBetDraftInput(idx, event.currentTarget.value)}
                      on:blur={() => commitBetDraft(idx)}
                      on:keydown={(event) => event.key === 'Enter' && commitBetDraft(idx)}
                    />
                  </div>
                  <button class="bet-quick-btn" on:click={() => adjustBetByFactor(idx, 2)}>2x</button>
                </div>
              {:else if isBet && !isReplay && !activeSb}
                <div class="bet-quick-actions bet-quick-actions-bottom">
                  <button class="bet-quick-btn" on:click={() => adjustBetByFactor(idx, 0.5)}>1/2</button>
                  <button class="bet-quick-btn" on:click={() => adjustBetByFactor(idx, 2)}>2x</button>
                </div>
              {/if}
            </div>
          {/if}

          <!-- Chip buttons -->
          {#if isBet && !isReplay && (betEntryMode === 'chips' || betEntryMode === 'both')}
            <div class="chip-btns">
              {#if !activeSb && $runtimeConfig?.betLevels?.length}
                {#each $runtimeConfig.betLevels as betLevel}
                  <button
                    class="chip-btn chip-btn-level"
                    on:click={() => onChipClick(idx, betLevel)}
                    disabled={betLevel > $balance}
                  >
                    {fmt(betLevel, $runtimeCurrency)}
                  </button>
                {/each}
              {:else}
                {#each CHIPS as chip}
                  <button
                    class="chip-btn"
                    class:sb-target={!!activeSb}
                    on:click={() => onChipClick(idx, chip.value)}
                    disabled={$totalCost + chip.value > $balance}
                  >
                    <img src={CHIP_IMAGES[chip.value]} alt={chip.label} />
                  </button>
                {/each}
              {/if}
            </div>
            {#if hand.bet > 0 || (activeSb && hand.sb[activeSb] > 0)}
              <button class="btn-clear" on:click={() => onClear(idx)}>
                {activeSb && hand.sb[activeSb] > 0 ? `Clear ${activeSb === 'pp' ? 'PP' : '21+3'}` : 'Clear'}
              </button>
            {/if}
          {/if}

          {#if isBet && !isReplay && $numSlots > 1}
            <button class="btn-remove" on:click={() => removeSlot(idx)}>Remove</button>
          {/if}
        </div>
      {/each}

      <!-- Add hand ghost -->
      {#if isBet && !isReplay && $numSlots < $maxHands}
        <div class="ghost-wrap">
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <div class="ghost" on:click={addSlot}>+</div>
        </div>
      {/if}
    </div>
  </div>

  <!-- CONTROLS -->
  <div class="controls">

    <!-- Play / Action buttons -->
    {#if isPlay && !$autoPlay && activeH && !isReplay}
      <div class="action-grid">
        <button class="btn-action" on:click={hit}>Hit</button>
        <button class="btn-action" on:click={stand}>Stand</button>
        <button class="btn-action" class:dim={!canSplit} disabled={!canSplit} on:click={canSplit ? split : undefined}>Split</button>
        <button class="btn-action" class:dim={!canDouble} disabled={!canDouble} on:click={canDouble ? doubleDown : undefined}>x2</button>
      </div>
    {:else if tableControlMode !== 'table' && !isResult}
      <div class="deal-row">
        <button
          class="btn-deal"
          disabled={!$canDeal && !isDealer && !isIns}
          class:active={$canDeal}
          on:click={$canDeal ? onDeal : undefined}
        >
          {dealLabel}
        </button>
      </div>
    {/if}

    <!-- Secondary controls row -->
    {#if $autoPlay && !isReplay && !autoplayDisabled}
      <div class="ctrl-row ctrl-row-inline">
        <div class="ctrl-right">
          <button class="btn-stop" on:click={() => autoPlay.set(false)}>Stop</button>
        </div>
      </div>
    {/if}

    <!-- Auto panel -->
    {#if $showAuto && !autoplayDisabled}
      <div class="panel" on:click={stopEvent}>
        <div class="panel-label">Mode</div>
        <div class="mode-row">
          {#each AUTO_MODES as mode}
            <button class="btn-mode" class:active={$autoMode === mode.key} on:click={() => autoMode.set(mode.key)}>{mode.label}</button>
          {/each}
        </div>
        <div class="panel-hint mode-hint">
          {AUTO_MODES.find((mode) => mode.key === $autoMode)?.summary}
        </div>
        <div class="panel-label">Speed</div>
        <div class="speed-row">
          {#each Object.entries(SPEEDS) as [k, sp]}
            <button class="btn-speed" class:active={$autoSpeed === k} on:click={() => autoSpeed.set(k)}>{sp.label}</button>
          {/each}
        </div>
        <div class="panel-hint">Insurance is always auto-declined. Current bets and side bets stay in place between rounds.</div>
        <div class="rounds-row">
          <span class="panel-label">Max Rounds</span>
          <div class="rounds-ctrl">
            <button on:click={() => autoMax.update(m => Math.max(1, m - 10))}>-</button>
            <span>{$autoMax}</span>
            <button on:click={() => autoMax.update(m => Math.min(1000, m + 10))}>+</button>
          </div>
        </div>
        <button class="btn-auto-toggle" class:stop={$autoPlay} on:click={toggleAuto}>
          {$autoPlay ? "Stop Auto" : "Start Auto"}
        </button>
      </div>
    {/if}

    <!-- Rules panel -->
    {#if $showRules}
      <div class="panel rules-panel" on:click={stopEvent}>
        <div class="panel-title">How To Play</div>
        <div class="rules-section"><strong>Payouts</strong>
          <div class="rules-text">
            Blackjack pays 3:2<br/>
            Winning hand pays 1:1<br/>
            Insurance pays 2:1
          </div>
        </div>
        <div class="rules-section"><strong>Perfect Pairs</strong>
          <table class="payout-table">
            <tbody>
              <tr><td>Perfect Pair</td><td>25:1</td></tr>
              <tr><td>Coloured Pair</td><td>12:1</td></tr>
              <tr><td>Mixed Pair</td><td>6:1</td></tr>
            </tbody>
          </table>
        </div>
        <div class="rules-section"><strong>21+3</strong>
          <table class="payout-table">
            <tbody>
              <tr><td>Suited Trips</td><td>100:1</td></tr>
              <tr><td>Straight Flush</td><td>40:1</td></tr>
              <tr><td>Three of a Kind</td><td>30:1</td></tr>
              <tr><td>Straight</td><td>10:1</td></tr>
              <tr><td>Flush</td><td>5:1</td></tr>
            </tbody>
          </table>
        </div>
        <div class="rules-section"><strong>Game Rules</strong>
          <div class="rules-text">
            Dealer hits soft 17.<br/>
            Double down is available on any initial 2-card hand.<br/>
            Split hands may be hit multiple times; split aces receive one card only.<br/>
            21+3 treats Ace as high or low for straights.
          </div>
        </div>
        <div class="rules-section"><strong>Auto Play Modes</strong>
          <div class="rules-text">
            <strong>Conservative</strong> — lower-variance play. It avoids marginal doubles, stands earlier in riskier spots, and is designed to preserve bankroll over longer sessions.<br/><br/>
            <strong>Optimal</strong> — perfect basic strategy for this build. This is the mathematically strongest default mode and the closest thing to ideal play.<br/><br/>
            <strong>High Stakes</strong> — more aggressive action. It leans into doubles and pressure spots for higher volatility, bigger swings, and faster exposure.
          </div>
        </div>
        {#if showRtp}
          <div class="rules-section"><strong>Return to Player</strong>
            <div class="rules-text rtp">
              Blackjack — 98.7%*<br/>
              Perfect Pairs bet — 86.4952%<br/>
              21+3 bet — 85.7029%<br/><br/>
              *base game estimate is simulation-backed using basic strategy over current 1,000,000-round test runs.<br/><br/>
              Combined RTP depends on the amounts wagered on each selected bet. If equal amounts are wagered on multiple bets, the effective RTP is the average of those selected RTP values.<br/><br/>
              A player's skill and/or strategy will have an impact on their chances of winning.<br/><br/>
              Any malfunction voids the game round and all eventual payouts for the round.
            </div>
          </div>
        {/if}
      </div>
    {/if}

    {#if $showFacts && isBet}
      <div class="floating-fact floating-fact-bottom" on:click={stopEvent}>
        {$fact}
      </div>
    {/if}

    <!-- Reload -->
    {#if $balance <= 0 && isBet}
      <button class="btn-reload" on:click={() => balance.set(100_000_000)}>Reload {fmt(100_000_000, $runtimeCurrency)}</button>
    {/if}
  </div>
</div>
{/if}

<style>
  @import "@fontsource/caveat/index.css";

  :global(*) { box-sizing: border-box; margin: 0; padding: 0; }
  :global(body) {
    background: #071a0e;
    color: #f2e8d0;
    font-family: 'Caveat', cursive;
    -webkit-tap-highlight-color: transparent;
  }
  :global(button) {
    font-family: 'Caveat', cursive;
    cursor: pointer;
    transition: all 0.1s;
    -webkit-tap-highlight-color: transparent;
  }
  :global(button:active:not(:disabled)) { transform: scale(0.97); opacity: 0.85; }
  :global(button:disabled) { opacity: 0.2; cursor: default; }

  /* INTRO */
  .intro {
    position: fixed; inset: 0;
    background:
      radial-gradient(circle at 50% 38%, rgba(212,168,64,0.16), transparent 30%),
      linear-gradient(180deg, #07170e 0%, #041008 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: opacity 0.7s;
    overflow: hidden;
  }
  .intro-glow {
    position: absolute;
    inset: 12%;
    border-radius: 32px;
    border: 1px solid rgba(232, 212, 139, 0.14);
    background: radial-gradient(circle at center, rgba(18, 51, 30, 0.72), rgba(5, 18, 10, 0.18));
    box-shadow:
      inset 0 0 90px rgba(0, 0, 0, 0.28),
      0 0 120px rgba(0, 0, 0, 0.24);
  }
  .intro-frame {
    position: relative;
    z-index: 1;
    width: min(760px, 86vw);
    padding: 40px 42px;
    border-radius: 28px;
    border: 1px solid rgba(232, 212, 139, 0.18);
    background: linear-gradient(180deg, rgba(10, 31, 18, 0.88), rgba(7, 22, 13, 0.92));
    box-shadow: 0 30px 80px rgba(0,0,0,0.35);
    display: grid;
    grid-template-columns: 148px minmax(0, 1fr);
    gap: 28px;
    align-items: center;
  }
  .intro-mark-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 148px;
    height: 148px;
    border-radius: 28px;
    background: radial-gradient(circle at 50% 42%, rgba(232, 212, 139, 0.18), rgba(20, 46, 29, 0.92));
    border: 1px solid rgba(232, 212, 139, 0.24);
  }
  .intro-mark {
    width: 82%;
    height: 82%;
    object-fit: contain;
    filter: drop-shadow(0 8px 24px rgba(0,0,0,0.35));
  }
  .intro-copy {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
  }
  .intro-kicker {
    font-size: 24px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(232, 212, 139, 0.86);
  }
  .intro-title {
    font-size: clamp(40px, 5vw, 64px);
    line-height: 0.95;
    color: #f3e6c5;
  }
  .intro-subtitle {
    font-size: 22px;
    line-height: 1.25;
    color: rgba(242, 232, 208, 0.72);
  }
  /* TABLE */
  .table-wrap {
    min-height: 100vh;
    max-width: 500px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  @media (min-width: 768px) {
    .table-wrap {
      max-width: 100%;
    }
  }

  .balance-row {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 16px 0;
    min-height: 44px;
    align-items: center;
  }
  .session-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    min-width: 0;
  }
  .session-pill {
    border-radius: 999px;
    border: 1px solid rgba(232, 212, 139, 0.25);
    background: rgba(15, 34, 23, 0.72);
    color: #d9d7ca;
    font-size: 13px;
    line-height: 1;
    padding: 7px 10px;
    white-space: nowrap;
  }
  .session-pill strong {
    color: #f2e8d0;
    margin-right: 4px;
    font-weight: 700;
  }
  .session-pill.positive { color: #85f7ad; }
  .session-pill.negative { color: #ff8e8e; }
  .balance-meta {
    margin-left: auto;
    display: flex;
    align-items: center;
    justify-content: flex-end;
  }
  .balance     { font-size: 26px; font-weight: 700; white-space: nowrap; }
  .rgs-status  { margin-left: 10px; font-size: 14px; color: #e8d48b; white-space: nowrap; }
  .replay-banner,
  .launch-warning {
    width: min(960px, 94vw);
    margin: 0 auto 10px;
    padding: 8px 12px;
    border-radius: 12px;
    border: 1px solid rgba(232, 212, 139, 0.35);
    background: rgba(23, 46, 32, 0.88);
    color: #f2e8d0;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
    text-align: center;
    font-size: 16px;
  }
  .launch-warning { color: #e8d48b; }

  /* FELT */
  .felt {
    position: relative;
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 4px 14px 4px;
    background: radial-gradient(ellipse at 50% 35%, #153d24, #0c2616 55%, #071a0e 100%);
    transform-origin: top center;
  }
  .felt-menu {
    position: absolute;
    top: 10px;
    left: 12px;
    z-index: 4;
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }
  .felt-menu-row {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .felt-menu-btn {
    min-width: 92px;
    min-height: 42px;
    border-radius: 999px;
    font-size: 22px;
    padding: 0 18px;
    background: rgba(7, 26, 14, 0.82);
    backdrop-filter: blur(4px);
  }
  .felt-menu-btn-fact {
    min-width: 82px;
  }
  .felt-toggle-copy {
    margin-left: 4px;
    font-size: 18px;
    color: rgba(242, 232, 208, 0.72);
  }
  .felt-toggle-stack {
    margin-left: 2px;
  }

  /* DEALER */
  .dealer-area { min-height: 112px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .dealer-placeholder { height: 96px; }

  /* CARDS */
  .cards-row   { display: flex; flex-wrap: nowrap; overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .card-wrap   { position: relative; flex-shrink: 0; }

  .card {
    border-radius: 8px;
    width: 80px;
    height: 112px;
    position: relative;
    overflow: hidden;
    animation: cardIn 0.22s ease both;
    box-shadow: 0 3px 12px rgba(0,0,0,0.3);
  }
  .card.small  { width: 62px; height: 87px; }
  .card-face   { background: #fff; }
  .card-custom { background: #fff; }
  .card-custom-art {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .card-hidden {
    background: linear-gradient(150deg, #1a3a24, #0e2214);
    border: 1.5px solid #2a5a3a;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .card-back-logo {
    width: 82%;
    height: 82%;
    object-fit: contain;
    object-position: center;
    opacity: 0.92;
    filter: drop-shadow(0 2px 8px rgba(0,0,0,0.35));
  }

  .card-corner { position: absolute; display: flex; flex-direction: column; line-height: 1; }
  .card-tl     { top: 6px; left: 7px; }
  .card-br     { bottom: 6px; right: 7px; transform: rotate(180deg); }
  .card.small .card-tl { top: 4px; left: 5px; }
  .card.small .card-br { bottom: 4px; right: 5px; }

  .card-rank    { font-family: Georgia, serif; font-size: 17px; font-weight: bold; }
  .card-suit-sm { font-family: Georgia, serif; font-size: 14px; margin-top: -1px; }
  .card.small .card-rank    { font-size: 13px; }
  .card.small .card-suit-sm { font-size: 11px; }
  .card-center  { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); font-family: Georgia, serif; font-size: 32px; }
  .card.small .card-center { font-size: 24px; }
  .card-face.red .card-rank,
  .card-face.red .card-suit-sm,
  .card-face.red .card-center { color: #c62828; }
  .card-face:not(.red) .card-rank,
  .card-face:not(.red) .card-suit-sm,
  .card-face:not(.red) .card-center { color: #1b1b1b; }

  .card-placeholder {
    width: 80px; height: 112px;
    border-radius: 8px;
    border: 1.5px dashed rgba(242,232,208,0.12);
    background: rgba(242,232,208,0.03);
  }
  .card-placeholder.small { width: 62px; height: 87px; }

  /* HAND VALUE */
  .hv-bubble {
    background: rgba(0,0,0,0.45);
    padding: 2px 14px;
    border-radius: 12px;
    font-size: 18px;
    font-weight: 700;
    margin-bottom: 4px;
    border: 1px solid transparent;
    text-align: center;
  }
  .hv-bubble.active {
    background: rgba(212,168,64,0.15);
    border-color: rgba(212,168,64,0.4);
    animation: glow 1.5s ease infinite;
  }

  /* HAND VALUE (dealer) */
  .hand-value {
    background: rgba(0,0,0,0.5);
    padding: 3px 16px;
    border-radius: 14px;
    font-size: 22px;
    font-weight: 700;
    margin-bottom: 5px;
  }

  /* PAYOUT */
  .payout { font-size: 16px; color: #66ff88; margin-top: 3px; font-weight: 700; }

  /* DIVIDER */
  .divider-row {
    display: flex;
    align-items: center;
    margin: 2px 0 2px;
  }
  .divider-line  { flex: 1; height: 1px; background: rgba(212,168,64,0.09); }
  .divider-label { font-size: 20px; padding: 0 10px; opacity: 0.6; }

  .fact-row {
    display: flex;
    flex-direction: column;
    gap: 4px;
    align-items: center;
    margin-bottom: 0;
  }
  .fact-row.table-layout {
    width: min(1180px, 100%);
    margin: 0 auto 8px;
    padding: 12px 0 18px;
    display: grid;
    grid-template-columns: minmax(260px, 340px) minmax(420px, 820px);
    gap: 28px;
    align-items: center;
  }
  .fact-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    min-width: 0;
  }
  .fact-caption {
    font-size: 20px;
    line-height: 1.1;
    color: rgba(242, 232, 208, 0.78);
    text-align: center;
  }
  .fact {
    font-size: 22px;
    text-align: center;
    line-height: 1.2;
    padding: 0 8px;
    color: #f2e8d0;
    font-style: italic;
    max-width: 560px;
    align-self: center;
    margin-bottom: 0;
  }
  .desktop-deal-wrap {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
  }
  .floating-fact {
    width: min(560px, 72vw);
    margin: 6px auto 2px;
    padding: 8px 18px;
    text-align: center;
    font-size: 20px;
    line-height: 1.2;
    color: rgba(242, 232, 208, 0.82);
    background: rgba(8, 20, 12, 0.56);
    border: 1px solid rgba(232, 212, 139, 0.14);
    border-radius: 999px;
    backdrop-filter: blur(6px);
  }
  .floating-fact-bottom {
    margin: 8px auto 0;
  }
  .bet-entry-toggle {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px;
    border-radius: 999px;
    background: rgba(8, 20, 12, 0.72);
    border: 1px solid rgba(232, 212, 139, 0.18);
  }
  .bet-entry-btn {
    min-width: 72px;
    min-height: 32px;
    padding: 0 12px;
    border-radius: 999px;
    border: 1px solid transparent;
    background: transparent;
    color: #bfb49a;
    font-size: 16px;
    font-weight: 700;
  }
  .bet-entry-btn.active {
    border-color: rgba(232,212,139,0.35);
    background: rgba(232,212,139,0.12);
    color: #f2e8d0;
  }
  .fact-result {
    font-style: normal;
    color: rgba(242, 232, 208, 0.86);
  }
  .result-next-wrap {
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 4px auto 2px;
    width: 100%;
  }
  .btn-next-centered {
    width: min(520px, 92vw);
    min-height: 68px;
    border-radius: 999px;
    font-size: 28px;
    font-weight: 700;
    opacity: 1;
  }

  /* INSURANCE */
  .ins-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 10px;
    width: min(860px, 100%);
    margin: 0 auto 6px;
    animation: fadeIn 0.2s ease;
  }
  .ins-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 10px 12px;
    border-radius: 14px;
    background: rgba(8, 20, 12, 0.66);
    border: 1px solid rgba(232, 212, 139, 0.18);
  }
  .ins-label   { font-size: 18px; font-weight: 700; text-align: center; }
  .ins-amount  { font-size: 18px; color: #e8d48b; }
  .ins-actions { display: flex; gap: 8px; }
  .btn-ins-yes { padding: 6px 16px; border-radius: 6px; border: none; background: #4caf50; color: #fff; font-size: 16px; font-weight: 700; }
  .btn-ins-no  { padding: 6px 16px; border-radius: 6px; border: none; background: rgba(255,255,255,0.1); color: #f2e8d0; font-size: 16px; }

  /* RESULT */
  .result-msg { min-height: 24px; display: flex; align-items: center; justify-content: center; }
  .msg-text   { font-size: 26px; font-weight: 700; animation: fadeIn 0.3s ease; }
  .msg-text.bad-beat { font-size: 30px; color: #ef5350; }

  /* HANDS ROW */
  .hands-row { display: flex; justify-content: center; gap: 16px; padding-top: 0; min-height: 0; flex: 1; align-items: flex-start; }
  .hands-row.multi { gap: 12px; }
  .hand-col  { display: flex; flex-direction: column; align-items: center; flex: 1; min-width: 0; justify-content: flex-start; margin-top: -12px; }

  /* WAGER LABEL */
  .bet-bar {
    margin-top: 1px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }
  .wager-label {
    font-size: 18px; font-weight: 700; color: #f2e8d0;
    text-align: center; white-space: nowrap;
  }
  .wager-label-top {
    margin-bottom: 1px;
  }
  .bet-quick-actions {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 2px;
    border-radius: 999px;
    background: rgba(8, 20, 12, 0.7);
    border: 1px solid rgba(232, 212, 139, 0.18);
  }
  .bet-quick-actions-bottom {
    margin-top: 2px;
  }
  .bet-quick-btn {
    min-width: 54px;
    min-height: 28px;
    padding: 0 12px;
    border-radius: 999px;
    border: 1px solid rgba(232, 212, 139, 0.28);
    background: rgba(25, 53, 34, 0.92);
    color: #f2e8d0;
    font-size: 16px;
    font-weight: 700;
  }
  .bet-amount-row {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .bet-amount-row-with-actions {
    width: 100%;
    justify-content: center;
  }
  .bet-input-shell {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 8px;
    border-radius: 12px;
    background: rgba(8, 20, 12, 0.72);
    border: 1px solid rgba(232, 212, 139, 0.18);
  }
  .bet-amount-prefix {
    font-size: 14px;
    color: #bfb49a;
  }
  .bet-amount-input {
    width: 92px;
    border: none;
    outline: none;
    background: transparent;
    color: #f2e8d0;
    font-family: 'Caveat', cursive;
    font-size: 20px;
    text-align: center;
  }

  /* CHIP BUTTONS */
  .chip-btns { display: flex; gap: 3px; margin-top: 4px; flex-wrap: nowrap; overflow-x: auto; -webkit-overflow-scrolling: touch; justify-content: flex-start; }
  .chip-btn  {
    width: 42px; height: 42px; border-radius: 50%; padding: 0;
    border: none; background: transparent; overflow: hidden;
    transition: all 0.15s;
  }
  .chip-btn-level {
    width: auto;
    min-width: 76px;
    height: 40px;
    border-radius: 999px;
    padding: 0 12px;
    background: rgba(18, 28, 19, 0.9);
    border: 1px solid rgba(232, 212, 139, 0.35);
    color: #f2e8d0;
    font-size: 18px;
    font-weight: 700;
  }
  .chip-btn img { width: 42px; height: 42px; display: block; }
  .chip-btn:disabled { opacity: 0.2; }
  .chip-btn.sb-target { box-shadow: 0 0 0 2px #e8d48b; border-radius: 50%; }

  .btn-clear  { font-size: 12px; color: #bfb49a; background: none; border: 1px solid #2a5a3a; border-radius: 4px; padding: 1px 8px; margin-top: 2px; }

  /* SIDE BETS */
  .cards-area { display: flex; align-items: flex-start; gap: 8px; }
  .sb-col     { display: flex; flex-direction: column; gap: 6px; padding-top: 0; flex-shrink: 0; }
  .cards-col  { flex: 1; min-width: 0; }

  .sb-box {
    width: 52px; min-height: 52px;
    border-radius: 7px;
    border: 1.5px dashed rgba(242,232,208,0.18);
    background: rgba(242,232,208,0.02);
    cursor: pointer;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 2px; padding: 5px 3px;
    transition: all 0.15s;
    color: rgba(242,232,208,0.35);
    user-select: none;
  }
  .sb-box.sb-active {
    border-style: solid;
    border-color: rgba(232,212,139,0.5);
    background: rgba(232,212,139,0.06);
    color: #e8d48b;
  }
  .sb-box.sb-selected {
    border-color: #d4a840;
    background: rgba(212,168,64,0.18);
    box-shadow: 0 0 10px rgba(212,168,64,0.3);
    color: #f2e8d0;
  }
  .sb-box-label { font-size: 13px; font-weight: 700; text-align: center; line-height: 1.2; }
  .sb-box-amt   { font-size: 14px; font-weight: 700; color: #e8d48b; }

  .ghost-wrap { display: flex; flex-direction: column; align-items: center; margin-top: 12px; }
  .ghost {
    width: 80px; height: 112px; border-radius: 8px;
    border: 2px dashed rgba(242,232,208,0.15);
    background: rgba(242,232,208,0.03);
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    font-size: 22px; color: #f2e8d0; opacity: 0.2;
    transition: all 0.2s;
  }
  .ghost:hover { opacity: 0.4; }

  .btn-remove { font-size: 13px; color: #bfb49a; background: none; border: 1px solid #2a5a3a; border-radius: 4px; padding: 2px 10px; margin-top: 4px; opacity: 0.5; }

  /* CONTROLS */
  .controls {
    padding: 2px 10px 4px;
    background: #071a0e;
    border-top: 1px solid #172e20;
    flex-shrink: 0;
  }

  .action-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-bottom: 5px; }
  .btn-action {
    padding: 13px 0; border-radius: 7px; font-size: 18px; font-weight: 700;
    background: #1d4a2c; color: #f2e8d0; border: 1px solid #2a5a3a;
  }
  .btn-action.dim { background: #172e20; color: #bfb49a; border-color: #172e20; }

  .deal-row {
    display: flex; gap: 6px; align-items: stretch; margin-bottom: 5px;
    max-width: 360px; margin-left: auto; margin-right: auto;
  }
  .btn-deal {
    flex: 1; padding: 12px 0; border-radius: 8px;
    border: none;
    background: #172e20; color: #bfb49a;
    font-size: 18px; font-weight: 700;
    opacity: 0.35;
  }
  .btn-deal.active {
    background: linear-gradient(135deg, #d4a840, #a88a30);
    color: #071a0e;
    opacity: 1;
  }
  .btn-auto-tab { padding: 0 16px; font-size: 15px; }

  .ctrl-row  { display: flex; align-items: center; justify-content: space-between; min-height: 28px; }
  .ctrl-row-inline { justify-content: flex-end; margin-top: 4px; }
  .ctrl-left { display: flex; gap: 6px; }
  .ctrl-right { min-width: 50px; text-align: center; }

  .btn-tab {
    font-size: 18px; padding: 4px 13px; border-radius: 4px;
    border: 1px solid #2a5a3a; background: transparent; color: #bfb49a;
  }
  .btn-tab.active { border-color: #e8d48b; background: rgba(232,212,139,0.12); color: #e8d48b; }

  .btn-stop { font-size: 14px; padding: 3px 10px; border-radius: 4px; border: 1px solid #ef5350; background: transparent; color: #ef5350; }

  /* PANELS */
  .panel {
    background: #172e20; border-radius: 6px; padding: 8px 10px; margin-top: 8px;
    animation: fadeIn 0.15s ease;
  }
  .panel-label { font-size: 21px; margin-bottom: 3px; opacity: 0.6; }
  .panel-hint  { font-size: 17px; opacity: 0.5; margin-bottom: 6px; line-height: 1.4; }
  .mode-row,
  .speed-row   { display: flex; gap: 3px; margin-bottom: 6px; flex-wrap: wrap; }
  .btn-mode,
  .btn-speed   { flex: 1; padding: 5px 8px; font-size: 20px; border-radius: 4px; border: 1px solid #2a5a3a; background: transparent; color: #bfb49a; min-width: 88px; }
  .btn-mode.active,
  .btn-speed.active { border-color: #e8d48b; background: rgba(232,212,139,0.12); color: #e8d48b; }
  .mode-hint { min-height: 34px; }

  .rounds-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
  .rounds-ctrl { display: flex; align-items: center; gap: 3px; }
  .rounds-ctrl button {
    width: 22px; height: 22px; border-radius: 4px;
    border: 1px solid #2a5a3a; background: #071a0e; color: #bfb49a;
    font-size: 16px; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
  }
  .rounds-ctrl span { font-size: 22px; width: 36px; text-align: center; font-weight: 700; }
  .btn-auto-toggle {
    width: 100%; padding: 8px 0; border-radius: 5px; border: none;
    font-size: 21px; font-weight: 700; background: #4caf50; color: #fff;
  }
  .btn-auto-toggle.stop { background: #ef5350; }

  /* RULES */
  .rules-panel { max-height: min(34vh, 320px); overflow-y: auto; }
  .panel-title  { font-size: 25px; font-weight: 700; margin-bottom: 8px; }
  .rules-section { margin-bottom: 10px; font-size: 20px; }
  .rules-text   { margin-left: 8px; margin-top: 4px; font-size: 21px; line-height: 1.6; }
  .rules-text.rtp { font-size: 18px; opacity: 0.7; }
  .payout-table { width: 100%; font-size: 20px; margin-top: 4px; }
  .payout-table td:last-child { text-align: right; }
  .payout-table td:first-child { opacity: 0.7; }

  .btn-reload {
    width: 100%; padding: 8px 0; border-radius: 5px;
    border: 1px solid #2a5a3a; background: transparent;
    color: #f2e8d0; font-size: 15px; margin-top: 4px;
  }

  /* MOBILE INTRO LOGO */
  @media (max-width: 767px) {
    .intro-frame {
      width: min(92vw, 520px);
      padding: 28px 24px;
      grid-template-columns: 1fr;
      gap: 18px;
      text-align: center;
    }
    .intro-mark-wrap {
      width: 112px;
      height: 112px;
      margin: 0 auto;
    }
    .intro-copy {
      align-items: center;
    }
    .intro-kicker {
      font-size: 18px;
    }
    .intro-subtitle {
      font-size: 18px;
    }
  }

  /* DESKTOP — fit full screen, no scroll */
  @media (min-width: 768px) {
    .table-wrap  { height: 100vh; overflow: hidden; }
    .felt        { overflow: hidden; padding: 6px 24px 4px; transform: scale(var(--desktop-scale, 1)); }

    .balance     { font-size: 28px; }
    .balance-row { min-height: 44px; padding: 8px 24px 0; }
    .session-pill { font-size: 14px; }

    .dealer-area        { min-height: 132px; }
    .dealer-placeholder { height: 118px; }
    .hand-value         { font-size: 20px; padding: 3px 14px; }

    .card        { width: 104px; height: 146px; border-radius: 10px; }
    .card.small  { width: 78px;  height: 109px; }

    .card-tl     { top: 9px; left: 11px; }
    .card-br     { bottom: 9px; right: 11px; }
    .card.small .card-tl { top: 6px; left: 8px; }
    .card.small .card-br { bottom: 6px; right: 8px; }

    .card-rank    { font-size: 21px; }
    .card-suit-sm { font-size: 17px; }
    .card-center  { font-size: 40px; }
    .card.small .card-rank    { font-size: 16px; }
    .card.small .card-suit-sm { font-size: 13px; }
    .card.small .card-center  { font-size: 30px; }

    .card-placeholder       { width: 104px; height: 146px; }
    .card-placeholder.small { width: 78px;  height: 109px; }

    .hands-row      { min-height: 0; gap: 22px; }
    .hands-row.multi{ gap: 16px; }

    .hv-bubble   { font-size: 18px; padding: 3px 14px; }
    .bet-bar { margin-top: 1px; gap: 3px; }
    .wager-label { font-size: 18px; }
    .bet-quick-actions { gap: 6px; padding: 3px; }
    .bet-quick-btn { min-width: 58px; min-height: 30px; font-size: 16px; }
    .bet-input-shell { padding: 4px 8px; }
    .bet-amount-prefix { font-size: 14px; }
    .bet-amount-input { width: 92px; font-size: 20px; }

    .chip-btn     { width: 56px; height: 56px; }
    .chip-btn img { width: 56px; height: 56px; }
    .chip-btns    { gap: 5px; margin-top: 6px; flex-wrap: nowrap; justify-content: center; overflow-x: visible; }

    .sb-box       { width: 56px; min-height: 56px; }
    .sb-box-label { font-size: 12px; }
    .sb-box-amt   { font-size: 13px; }
    .sb-col       { gap: 6px; }
    .cards-area   { gap: 8px; }

    .ghost { width: 104px; height: 146px; }

    .fact-row.table-layout {
      width: min(960px, 100%);
      margin: 0 auto 2px;
      padding: 3px 2px 2px;
      grid-template-columns: minmax(260px, 340px) minmax(360px, 1fr);
      gap: 18px;
    }
    .fact-block { align-items: center; }
    .fact-caption,
    .fact { text-align: center; }
    .fact-caption { font-size: 20px; }
    .fact      { font-size: 24px; max-width: 760px; }
    .bet-entry-toggle { gap: 4px; padding: 3px; }
    .bet-entry-btn { min-width: 68px; min-height: 30px; font-size: 15px; }
    .felt-menu {
      top: 12px;
      left: 16px;
    }
    .felt-menu-btn {
      min-width: 100px;
      min-height: 46px;
      font-size: 24px;
    }
    .btn-next-centered {
      width: min(560px, 70vw);
      min-height: 72px;
      font-size: 30px;
    }

    .msg-text  { font-size: 22px; }
    .msg-text.bad-beat { font-size: 28px; }

    .deal-row { max-width: 400px; }
    .btn-deal { font-size: 18px; padding: 11px 0; }

    .controls { padding: 1px 10px 3px; }
    .cards-row { flex-wrap: nowrap; }
  }

  /* ANIMATIONS */
  @keyframes introFade {
    0%   { opacity: 0; transform: scale(0.9); }
    30%  { opacity: 1; transform: scale(1); }
    100% { opacity: 1; }
  }
  @keyframes cardIn {
    from { opacity: 0; transform: translateY(-10px) scale(0.95); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes glow {
    0%, 100% { box-shadow: 0 0 4px rgba(212,168,64,0.2); }
    50%       { box-shadow: 0 0 14px rgba(212,168,64,0.4); }
  }
</style>
