<script>
  import { onMount, onDestroy, afterUpdate } from "svelte";
  import { get } from "svelte/store";
  import {
    phase, balance, dealerHand, hands, activeHand, message, fact, pending,
    numSlots, maxHands, autoPlay, autoSpeed, autoCount, autoMax, autoMode,
    showAuto, showRules, showFacts, totalCost, canDeal, introOp, rgsStatus, rgsError, runtimeConfig, runtimeJurisdiction,
    sessionStartedAt, netPosition, runtimeCurrency,
    startIntro, addSlot, removeSlot, addSideBetChip, clearSideBet, setSideBetAmount, addChip, clearBet, setBetLevel, adjustBetByFactor,
    newRound, deal, hit, stand, doubleDown, split, takeInsurance, autoTick, refreshStakeBalance,
  } from "../game/store.js";
  import { PHASE, SPEEDS, MONEY_SCALE, CHIPS, CHIP_IMAGES, LOGO_IMAGE, C, RANK_VALUES } from "../game/constants.js";
  import { handValue, isSoft } from "../game/engine.js";
  import { launchWarnings, replayMode, sessionQuery } from "../game/session.js";
  import { sessionBootstrap } from "../game/bootstrap.js";
  import { formatCurrencyAmount, formatSessionDuration, formatSignedMoney } from "../game/sessionDisplay.js";
  import { toggleMute, isMuted } from "../game/audio.js";

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
      label: "High Roller",
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
    maxHands.set(windowWidth >= 600 ? 3 : 2);
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
  $: isSocial = $sessionQuery.social || $runtimeJurisdiction?.socialCasino === true;
  $: autoplayDisabled = $runtimeJurisdiction?.disabledAutoplay === true;
  $: showRtp = $runtimeJurisdiction?.displayRTP !== false;
  $: availableSpeeds = Object.entries(SPEEDS).filter(([k]) => {
    if (k === '5x' && $runtimeJurisdiction?.disabledTurbo) return false;
    if (k === 'Max' && $runtimeJurisdiction?.disabledSuperTurbo) return false;
    return true;
  });
  $: {
    // If current speed is no longer allowed, reset to fastest permitted
    const allowedKeys = availableSpeeds.map(([k]) => k);
    if (!allowedKeys.includes($autoSpeed) && allowedKeys.length > 0) {
      autoSpeed.set(allowedKeys[allowedKeys.length - 1]);
    }
  }
  let nowMs = Date.now();
  let sessionClock = null;
  $: showSessionTimer = $runtimeJurisdiction?.displaySessionTimer === true && Number.isInteger($sessionStartedAt) && !isReplay;
  $: showNetPosition = $runtimeJurisdiction?.displayNetPosition === true && !isReplay;
  $: sessionElapsed = showSessionTimer ? formatSessionDuration(nowMs - $sessionStartedAt) : "00:00";
  $: sessionNet = formatSignedMoney($netPosition, MONEY_SCALE, $runtimeCurrency);
  $: netPositive = $netPosition > 0;
  $: netNegative = $netPosition < 0;

  // ─── RESPONSIVE INLINE STYLE VALUES ───
  $: cardOverlap      = isDesktop ? (isWideDesktop ? '-46px' : '-51px') : '-18px';
  $: cardOverlapSmall = isDesktop ? (isWideDesktop ? '-34px' : '-37px') : '-13px';
  $: dealerOverlap    = isDesktop ? (isWideDesktop ? '-23px' : '-29px') : '-18px';
  $: isFour = $numSlots === 4;
  $: cardsRowMinH     = isDesktop ? (isFour ? 98 : (multi ? (isWideDesktop ? 123 : 146) : (isWideDesktop ? 165 : 195))) : (isFour ? 80 : (multi ? 113 : 146));
  $: handColMaxW      = isDesktop ? (multi ? (isWideDesktop ? '325px' : '390px') : (isWideDesktop ? '507px' : '598px')) : (multi ? '260px' : '416px');
  $: canDouble = (() => {
    if (!activeH || activeH.cards.length !== 2 || $balance < activeH.bet) return false;
    if (activeH.doubled) return false;
    const total = handValue(activeH.cards);
    const soft = isSoft(activeH.cards);
    if (soft) return false;
    return total === 9 || total === 10 || total === 11;
  })();
  $: canSplit  = activeH && activeH.cards.length === 2 && $balance >= activeH.bet && $numSlots < $maxHands &&
                 activeH.cards[0].rank === activeH.cards[1].rank;
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
      showAuto.set(false); // close the panel immediately
      autoCount.set(0);
      autoPlay.set(true);
      if (isResult || isBet) autoTick(); // kick off immediately
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

  // ─── SIDE BET SELECTION ───
  let sbSelect = {}; // { [handIdx]: "pp" | "t" | null }
  let sbDraft = {};  // { [handIdx+key]: string } — live input value while editing
  let betEntryMode = "amount";
  let betDraft = {};
  $: if (!isBet && !isResult) {
    sbSelect = {};
    sbDraft = {};
    betDraft = {};
  }
  $: if (isPlay) {
    showAuto.set(false); // always close auto panel when play starts
  }

  function toggleSbSelect(idx, key) {
    if (!isBet && !isResult) return;
    const next = sbSelect[idx] === key ? null : key;
    sbSelect = { ...sbSelect, [idx]: next };
    // When opening a sidebet, pre-fill draft with current amount if set
    if (next) {
      const hand = $hands[idx];
      const cur = hand?.sb[next] ?? 0;
      const draftKey = idx + next;
      sbDraft = { ...sbDraft, [draftKey]: cur > 0 ? (cur / MONEY_SCALE).toFixed(2) : '' };
    }
  }

  function onSbDraftInput(idx, key, val) {
    sbDraft = { ...sbDraft, [idx + key]: val };
  }

  function commitSbDraft(idx, key) {
    const draftKey = idx + key;
    const raw = Number.parseFloat(String(sbDraft[draftKey] ?? '').replace(/[^0-9.]/g, ''));
    if (Number.isFinite(raw) && raw > 0) {
      setSideBetAmount(idx, key, Math.round(raw * MONEY_SCALE));
    }
    sbSelect = { ...sbSelect, [idx]: null };
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

  let showAbout = false;
  let soundMuted = false;

  function onToggleMute(event) {
    event?.stopPropagation?.();
    soundMuted = toggleMute();
  }

  function closePanels() {
    if ($showAuto) showAuto.set(false);
    if ($showRules) showRules.set(false);
    if (showAbout) showAbout = false;
  }

  function toggleAbout(event) {
    event?.stopPropagation?.();
    showAbout = !showAbout;
    showAuto.set(false);
    showRules.set(false);
  }

  // ─── PER-HAND INSURANCE ───
  let insSelect = {};
  $: if (!isIns) insSelect = {};

  function toggleInsHand(idx) {
    insSelect = { ...insSelect, [idx]: !insSelect[idx] };
  }

  function toggleInsAll() {
    const allOn = $hands.every((_, i) => insSelect[i]);
    insSelect = Object.fromEntries($hands.map((_, i) => [i, !allOn]));
  }

  function confirmInsurance() {
    const anySelected = $hands.some((_, i) => insSelect[i]);
    if (!anySelected) { takeInsurance(false); return; }
    const amt = $hands.reduce((sum, h, i) => insSelect[i] ? sum + Math.floor(h.bet / 2) : sum, 0);
    takeInsurance(true, amt > 0 ? amt : null);
  }

  function toggleFacts(event) {
    event?.stopPropagation?.();
    showFacts.update((v) => !v);
  }

  function toggleAutoPanel(event) {
    event?.stopPropagation?.();
    if (isPlay) return; // don't open auto panel mid-hand
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

<svelte:window bind:innerWidth={windowWidth} on:keydown={(e) => {
  if (e.code === 'Space' && !$runtimeJurisdiction?.disabledSpacebar && !isReplay && !$autoPlay && (isResult || (isBet && $canDeal))) {
    e.preventDefault();
    onDeal();
  }
}} />

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
      <div class="intro-tagline">Built for players who want more.</div>
    </div>
  </div>
</div>
{:else}

<!-- GAME TABLE -->
<div class="table-wrap">
  <!-- BALANCE -->
  <div class="balance-row">
    <div class="utility-btns" on:click={stopEvent}>
      {#if !isReplay && !autoplayDisabled}
        <button class="btn-tab btn-utility" class:active={$showAuto} class:dim={isPlay && !$autoPlay} on:click={toggleAutoPanel}>Auto</button>
      {/if}
      <button class="btn-tab btn-utility" class:active={$showRules} on:click={toggleRulesPanel}>Rules</button>
      {#if !isReplay}
        <button class="btn-tab btn-utility btn-fact" class:active={$showFacts} on:click={toggleFacts}>Fact</button>
      {/if}
      <button class="btn-tab btn-utility btn-mute" class:muted={soundMuted} on:click={onToggleMute}>{soundMuted ? 'Unmute' : 'Sound'}</button>
      <button class="btn-tab btn-utility" class:active={showAbout} on:click={toggleAbout}>About</button>
    </div>
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

    <!-- INSURANCE MODAL — centered overlay -->
    {#if isIns && !isReplay}
      <div class="ins-modal" on:click={stopEvent}>
        <div class="ins-modal-title">Dealer shows an Ace</div>
        <div class="ins-modal-sub">Take insurance against a Blackjack?</div>
        {#if $numSlots === 1}
          <!-- Single hand: two clear buttons -->
          <div class="ins-two-btns">
            <button class="btn-ins-take" on:click={() => { insSelect = {0: true}; confirmInsurance(); }}>
              Take Insurance &nbsp; {fmt(Math.floor($hands[0].bet / 2), $runtimeCurrency)}
            </button>
            <button class="btn-ins-skip" on:click={() => takeInsurance(false)}>
              Skip
            </button>
          </div>
        {:else}
          <!-- Multi-hand: per-hand toggles -->
          <div class="ins-modal-hands">
            {#each $hands as hand, idx}
              <button
                class="btn-ins-hand"
                class:active={insSelect[idx]}
                on:click={() => toggleInsHand(idx)}
              >
                {insSelect[idx] ? `✓ Hand ${idx + 1}  ${fmt(Math.floor(hand.bet / 2), $runtimeCurrency)}` : `Hand ${idx + 1}`}
              </button>
            {/each}
          </div>
          <button
            class="btn-ins-all"
            class:active={$hands.every((_, i) => insSelect[i])}
            on:click={toggleInsAll}
          >
            {$hands.every((_, i) => insSelect[i]) ? 'Deselect All' : 'All Hands'}
          </button>
          <button class="btn-ins-confirm" on:click={confirmInsurance}>
            {$hands.some((_, i) => insSelect[i]) ? `Take Insurance  ${fmt($hands.reduce((s, h, i) => s + (insSelect[i] ? Math.floor(h.bet/2) : 0), 0), $runtimeCurrency)}` : 'Skip Insurance'}
          </button>
        {/if}
      </div>
    {/if}

    {#if !isReplay && isBet}
      <div class="felt-menu" on:click={stopEvent}>
        <div class="felt-toggle-copy">{isSocial ? 'Play amount' : 'Wager input'}</div>
        <div class="bet-entry-toggle felt-toggle-stack" on:click={stopEvent}>
          <button class="bet-entry-btn" class:active={betEntryMode === 'amount'} on:click={() => betEntryMode = 'amount'}>Amount</button>
          <button class="bet-entry-btn" class:active={betEntryMode === 'chips'} on:click={() => betEntryMode = 'chips'}>Chips</button>
        </div>
      </div>
    {/if}

    <!-- DEALER AREA -->
    <div class="dealer-area" class:dealer-area-hidden={isBet}>
      {#if $dealerHand.length > 0}
        <!-- Logo moves left of dealer cards once dealt -->
        <img src={LOGO_IMAGE} alt="Chad Labs" class="dealer-logo" />
        <div class="dealer-cards-col">
          <div class="hand-value">{dealerDisplay}</div>
          <div class="cards-row">
            {#each $dealerHand as card, i}
              <div class="card-wrap" style="margin-left: {i > 0 ? dealerOverlap : '0'}; z-index: {i}">
                {#if (isPlay || isIns) && i === 1}
                  <div class="card card-hidden">
                    <img src={LOGO_IMAGE} alt="" class="card-back-logo" />
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
              </div>
            {/each}
          </div>
        </div>
      {:else}
        <div class="dealer-placeholder"></div>
      {/if}
    </div>

    <!-- CHAD LABS LOGO — bet screen only (centered) -->
    {#if isBet}
      <div class="felt-logo-row">
        <img src={LOGO_IMAGE} alt="Chad Labs" class="felt-logo felt-logo-large" />
      </div>
    {/if}

    <!-- DIVIDER — active play only -->
    {#if !isBet}
      <div class="divider-row">
        <div class="divider-line"></div>
        <span class="divider-label">Blackjack pays 7 to 5</span>
        <div class="divider-line"></div>
      </div>
    {/if}

    {#if !isDealer}
      <div class="fact-row"></div>
    {/if}

    <!-- INSURANCE PROMPT (per-hand, handled inline per card + bottom dock) -->

    <!-- RESULT MESSAGE -->
    <div class="result-msg">
      {#if $message && isResult}
        <span class="msg-text" class:bad-beat={isBadBeat}>{$message}</span>
      {/if}
    </div>


    <!-- PLAYER HANDS -->
    <div class="hands-row" class:multi class:four={$numSlots === 4}>
      <!-- Invisible left spacer mirrors ghost width — keeps card stack at screen center -->
      {#if (isBet || isResult) && !isReplay && $numSlots < $maxHands}
        <div class="ghost-spacer"></div>
      {/if}

      {#each $hands as hand, idx}
        {@const isActive = $activeHand === idx && isPlay}
        {@const rc = resultColor(hand.result)}
        {@const activeSb = sbSelect[idx]}
        <div class="hand-col">

          <!-- Cards area -->
          <div class="cards-area">
            <div class="cards-col">
              <!-- Hand value bubble -->
              {#if hand.cards.length > 0}
                <div class="hv-bubble" class:active={isActive} style="color: {hand.result ? rc : C.cr}">
                  {handMsg(hand)}
                </div>
              {/if}

              <!-- sb-col sits beside cards-row in a shared flex row for vertical centering -->
              <div class="sb-and-cards">
                {#if isBet || isResult || hand.sb.pp > 0 || hand.sb.t > 0}
                <div class="sb-col">
                  {#each [{k:"pp", n:"Perfect Pairs"}, {k:"t", n:"21+3"}] as sb}
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                    {#if (isBet || isResult) && activeSb === sb.k}
                      <!-- Expanded: show inline wager input -->
                      <div class="sb-box sb-box-editing" on:click|stopPropagation>
                        <span class="sb-box-label">{sb.n}</span>
                        <input
                          class="sb-wager-input"
                          inputmode="decimal"
                          placeholder="0.00"
                          value={sbDraft[idx + sb.k] ?? ''}
                          on:input={(e) => onSbDraftInput(idx, sb.k, e.currentTarget.value)}
                          on:keydown={(e) => e.key === 'Enter' && commitSbDraft(idx, sb.k)}
                          on:blur={() => commitSbDraft(idx, sb.k)}
                          autofocus
                        />
                      </div>
                    {:else}
                      <div
                        class="sb-box"
                        class:sb-active={hand.sb[sb.k] > 0}
                        on:click={() => !isReplay && (isBet || isResult) && toggleSbSelect(idx, sb.k)}
                      >
                        <span class="sb-box-label">{sb.n}</span>
                        {#if hand.sb[sb.k] > 0}
                          <span class="sb-box-amt">{fmt(hand.sb[sb.k], $runtimeCurrency)}</span>
                        {/if}
                      </div>
                    {/if}
                  {/each}
                </div>
                {/if}
                <div class="cards-row" style="min-height: {cardsRowMinH}px">
                {#if hand.cards.length > 0}
                  {#each hand.cards as card, i}
                    <div class="card-wrap" style="margin-left: {i > 0 ? (multi ? cardOverlapSmall : cardOverlap) : '0'}; z-index: {i}">
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
                    </div>
                  {/each}
                {:else}
                  <div class="card-placeholder" class:small={multi}></div>
                  <div class="card-placeholder" class:small={multi} style="margin-left: {multi ? cardOverlapSmall : cardOverlap}; opacity: 0.5"></div>
                {/if}
              </div><!-- end cards-row -->
              </div><!-- end sb-and-cards -->

              <!-- Payout -->
              {#if hand.payout > 0 && isResult}
                <div class="payout">+{fmt(hand.payout, $runtimeCurrency)}</div>
              {/if}


              <!-- Wager label -->
              {#if hand.bet > 0 || isBet || isResult}
                <div class="bet-bar">
                  <div class="wager-label wager-label-top">
                    {fmt(hand.bet, $runtimeCurrency)}{activeSb ? ` · ${activeSb === 'pp' ? 'PP' : '21+3'} ${fmt(hand.sb[activeSb], $runtimeCurrency)}` : ''}
                  </div>
                  {#if (isBet || isResult) && !isReplay && !activeSb}
                    <div class="bet-amount-row bet-amount-row-with-actions">
                      <button class="bet-quick-btn" on:click={() => adjustBetByFactor(idx, 0.5)}>1/2</button>
                      <div class="bet-input-shell">
                        <span class="bet-amount-prefix">{isSocial ? 'Play' : 'Bet'}</span>
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

              {#if (isBet || isResult) && !isReplay && $numSlots > 1}
                <button class="btn-remove" on:click={() => removeSlot(idx)}>Remove</button>
              {/if}
            </div><!-- end cards-col -->
          </div><!-- end cards-area -->
        </div>
      {/each}

      <!-- Add hand ghost -->
      {#if (isBet || isResult) && !isReplay && $numSlots < $maxHands}
        <div class="ghost-wrap">
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <div class="ghost" on:click={addSlot}>+</div>
        </div>
      {/if}
    </div>

    <!-- BOTTOM DOCK -->
    <div class="bottom-dock" on:click={stopEvent}>

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
            {#each availableSpeeds as [k, sp]}
              <button class="btn-speed" class:active={$autoSpeed === k} on:click={() => autoSpeed.set(k)}>{sp.label}</button>
            {/each}
          </div>
          <div class="panel-hint">Insurance is always auto-declined. Current {isSocial ? 'plays and side plays' : 'bets and side bets'} stay in place between rounds.</div>
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

      <!-- About panel -->
      {#if showAbout}
        <div class="panel about-panel" on:click={stopEvent}>
          <div class="panel-title">About</div>
          <div class="about-text">{isSocial
            ? 'Sidebet Blackjack brings everything you want at the table into one place — side plays, multiple hands, and autoplay with three built-in strategy modes. Play up to four hands simultaneously, place Perfect Pairs and 21+3 side plays on each, and let autoplay run through rounds using Conservative, Optimal, or High Roller strategy. Built by Chad Labs.'
            : 'Sidebet Blackjack brings everything you want at the table into one place — side bets, multiple hands, and autoplay with three built-in strategy modes. Play up to four hands simultaneously, place Perfect Pairs and 21+3 side bets on each, and let autoplay grind through rounds using Conservative, Optimal, or High Roller strategy. Built by Chad Labs.'
          }</div>
        </div>
      {/if}

      <!-- Rules panel -->
      {#if $showRules}
        <div class="panel rules-panel" on:click={stopEvent}>
          <div class="panel-title">How To Play</div>

          <div class="rules-section"><strong>The Goal</strong>
            <div class="rules-text">Get a hand closer to 21 than the dealer without going over. If you go over 21, you bust and lose automatically, even if the dealer busts too.</div>
          </div>

          <div class="rules-section"><strong>Card Values</strong>
            <div class="rules-text">Number cards are worth their face value. Jack, Queen, and King are worth 10. Aces are worth either 1 or 11, whichever helps your hand more.</div>
          </div>

          <div class="rules-section"><strong>How a Round Works</strong>
            <div class="rules-text">You place your bet, then both you and the dealer are dealt two cards. One of the dealer's cards is face up, one is face down. Based on your cards and the dealer's visible card, you decide what to do next.</div>
          </div>

          <div class="rules-section"><strong>Your Options</strong>
            <div class="rules-text">
              <strong>Hit</strong> - Take another card. You can keep hitting as many times as you want, as long as you don't bust.<br/><br/>
              <strong>Stand</strong> - Keep your current hand and end your turn.<br/><br/>
              <strong>Double Down</strong> - Double your original bet and receive exactly one more card, then you're done. No more hits after doubling. This is a power move when your hand is in a strong spot, like starting with a 10 or 11, because you're getting twice the money down when the odds favor you.<br/><br/>
              <strong>Split</strong> - If your first two cards have the same numeric value (e.g. two 8s, or a 10 and a King), you can split them into two separate hands. Each hand gets a new card drawn, your bet is duplicated, and you play them out independently. Split Aces receive only one card each and cannot be hit again.
            </div>
          </div>

          <div class="rules-section"><strong>Blackjack</strong>
            <div class="rules-text">If your first two cards are an Ace and any 10-value card, that's a Blackjack, the best hand in the game. It pays 7:5, meaning a $10 bet wins $14.</div>
          </div>

          <div class="rules-section"><strong>Insurance</strong>
            <div class="rules-text">{isSocial
              ? "If the dealer's face-up card is an Ace, you'll be offered Insurance before play continues. Insurance is a side play that the dealer has Blackjack. It costs half your main play amount and pays 2:1 if the dealer does have Blackjack. It's generally not recommended for most players."
              : "If the dealer's face-up card is an Ace, you'll be offered Insurance before play continues. Insurance is a side bet that the dealer has Blackjack. It costs half your main bet and pays 2:1 if the dealer does have Blackjack. It's generally not recommended for most players."
            }</div>
          </div>

          <div class="rules-section"><strong>Payouts</strong>
            <div class="rules-text">
              Blackjack pays 7:5<br/>
              Winning hand pays 1:1<br/>
              Insurance pays 2:1
            </div>
          </div>

          <div class="rules-section"><strong>{isSocial ? 'Side Plays' : 'Side Bets'}</strong>
            <div class="rules-text">{isSocial
              ? "Side plays are optional extra plays placed before the deal. They're independent from your main hand — you can win a side play and lose your main hand, or vice versa. Side plays are higher risk, higher reward, and have a lower RTP than the base game."
              : "Side bets are optional extra bets placed before the deal. They're independent from your main hand, you can win a side bet and lose your main hand, or vice versa. Side bets are higher risk, higher reward, and have a lower RTP than the base game."
            }</div>
          </div>

          <div class="rules-section"><strong>Perfect Pairs</strong>
            <div class="rules-text rules-text-sm">{isSocial
              ? 'This play wins if your first two cards are a pair, same rank. There are three tiers. Note: the payout is profit only, your original side play amount is not returned on a win.'
              : 'This bet wins if your first two cards are a pair, same rank. There are three tiers. Note: the payout is profit only, your original side bet stake is not returned on a win.'
            }</div>
            <table class="payout-table">
              <tbody>
                <tr><td>Perfect Pair (25:1)</td><td class="rules-example">Same rank, same suit. Example: two 7s of Hearts.</td></tr>
                <tr><td>Coloured Pair (12:1)</td><td class="rules-example">Same rank, same color, different suit. Example: 7 of Hearts and 7 of Diamonds.</td></tr>
                <tr><td>Mixed Pair (6:1)</td><td class="rules-example">Same rank, different color. Example: 7 of Hearts and 7 of Spades.</td></tr>
              </tbody>
            </table>
          </div>

          <div class="rules-section"><strong>21+3</strong>
            <div class="rules-text rules-text-sm">{isSocial
              ? "This play combines your first two cards with the dealer's face-up card to make a 3-card poker hand. Note: the payout is profit only, your original side play amount is not returned on a win."
              : "This bet combines your first two cards with the dealer's face-up card to make a 3-card poker hand. Note: the payout is profit only, your original side bet stake is not returned on a win."
            }</div>
            <table class="payout-table">
              <tbody>
                <tr><td>Suited Trips (100:1)</td><td class="rules-example">All three cards same rank and same suit. Example: three 8s of Clubs.</td></tr>
                <tr><td>Straight Flush (40:1)</td><td class="rules-example">Three consecutive ranks, all the same suit. Example: 4, 5, 6 of Hearts.</td></tr>
                <tr><td>Three of a Kind (30:1)</td><td class="rules-example">All three cards same rank, any suits. Example: three Kings.</td></tr>
                <tr><td>Straight (10:1)</td><td class="rules-example">Three consecutive ranks, any suits. Ace counts high or low.</td></tr>
                <tr><td>Flush (5:1)</td><td class="rules-example">All three cards same suit, any ranks. Example: any three Diamonds.</td></tr>
              </tbody>
            </table>
          </div>

          <div class="rules-section"><strong>Game Rules</strong>
            <div class="rules-text">
              6-deck shoe, reshuffled when fewer than 52 cards remain.<br/>
              Dealer stands on all 17s (hard and soft).<br/>
              Double down available on any initial 2-card hand.<br/>
              One card only after doubling. No further hits.<br/>
              Split available when first two cards share the same numeric value.<br/>
              Re-splitting is permitted up to the table hand limit.<br/>
              Split Aces receive one card only and stand automatically.<br/>
              Maximum simultaneous hands: 4 on desktop, 2 on mobile.
            </div>
          </div>

          <div class="rules-section"><strong>Autoplay Modes</strong>
            <div class="rules-text">
              <strong>Conservative</strong> - Lower-variance play. Avoids marginal doubles, stands earlier in riskier spots. Designed to preserve your bankroll over longer sessions.<br/><br/>
              <strong>Optimal</strong> - Perfect basic strategy for this build. The mathematically strongest mode and the closest thing to ideal play.<br/><br/>
              <strong>High Roller</strong> - Aggressive action. Leans into doubles and pressure spots for higher volatility, bigger swings, and faster exposure.
            </div>
            <table class="payout-table strategy-table">
              <thead>
                <tr><th></th><th>Conservative</th><th>Optimal</th><th>High Roller</th></tr>
              </thead>
              <tbody>
                <tr><td>Hard 9 double</td><td>Never</td><td>vs 3-6 only</td><td>vs any</td></tr>
                <tr><td>Hard 10 double</td><td>vs 2-9</td><td>vs 2-9</td><td>vs any</td></tr>
                <tr><td>Hard 11 double</td><td>vs 2-9</td><td>vs any incl. A</td><td>vs any</td></tr>
                <tr><td>Soft doubles</td><td>Never</td><td>Full chart</td><td>More aggressive</td></tr>
                <tr><td>Surrender</td><td>Never</td><td>Yes</td><td>Never</td></tr>
                <tr><td>Splits</td><td>Aces + 8s only</td><td>Full chart</td><td>Full chart +</td></tr>
              </tbody>
            </table>
          </div>

          {#if showRtp}
            <div class="rules-section"><strong>RTP (Return to Player)</strong>
              <div class="rules-text rtp">
                Blackjack - 98.7%*<br/>
                Perfect Pairs - 86.4952%<br/>
                21+3 - 85.7029%<br/><br/>
                *Base game RTP is a simulation-backed estimate using basic strategy over 1,000,000-round test runs. Combined RTP depends on the amounts played on each selected option. If equal amounts are played on multiple options, the effective RTP is the average of those selected values. A player's skill and/or strategy will have an impact on their chances of winning. Any malfunction voids the game round and all eventual payouts for the round. Winnings are settled according to the amount received from the Remote Game Server.
              </div>
            </div>
          {/if}
        </div>
      {/if}


      <!-- Reload -->
      {#if $balance <= 0 && isBet}
        <button class="btn-reload" on:click={() => balance.set(1_000_000_000)}>Reload {fmt(1_000_000_000, $runtimeCurrency)}</button>
      {/if}


      <!-- Play / Action buttons — fixed height container prevents layout jump -->
      <div class="action-area-fixed">
        {#if isPlay && !$autoPlay && activeH && !isReplay}
          <div class="action-grid">
            <button class="btn-action" on:click={hit}>Hit</button>
            <button class="btn-action" on:click={stand}>Stand</button>
            <button class="btn-action" class:dim={!canSplit} disabled={!canSplit} on:click={canSplit ? split : undefined}>Split</button>
            <button class="btn-action" class:dim={!canDouble} disabled={!canDouble} on:click={canDouble ? doubleDown : undefined}>x2</button>
          </div>
        {:else if $autoPlay && !isReplay && !autoplayDisabled}
          <!-- Full-width red stop bar during autoplay -->
          <button class="btn-stop-bar" on:click={() => autoPlay.set(false)}>■ Stop Auto</button>
        {:else}
          <!-- Spacer to hold layout -->
          <div class="action-area-spacer"></div>
        {/if}
      </div>

      <!-- Deal button -->
      {#if (isBet || isResult) && !isReplay}
        <div class="center-deal-wrap">
          <button
            class="btn-deal"
            class:active={$canDeal || isResult}
            disabled={!$canDeal && !isResult}
            on:click={($canDeal || isResult) ? onDeal : undefined}
          >
            {dealLabel}
          </button>
        </div>
      {/if}

      <!-- Fact bar — below deal button, only visible after cards dealt -->
      {#if $showFacts && $fact && !isBet}
        <div class="fact-below-actions" on:click|stopPropagation>{$fact}</div>
      {/if}
    </div>
  </div>
</div>
{/if}

<style>
  :global(*) { box-sizing: border-box; margin: 0; padding: 0; }
  :global(body) {
    background: #071a0e;
    color: #f2e8d0;
    font-family: 'Inter', sans-serif;
    -webkit-tap-highlight-color: transparent;
  }
  :global(button) {
    font-family: 'Inter', sans-serif;
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
    inset: 8%;
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
    width: min(1000px, 90vw);
    padding: 52px 60px;
    border-radius: 28px;
    border: 1px solid rgba(232, 212, 139, 0.18);
    background: linear-gradient(180deg, rgba(10, 31, 18, 0.88), rgba(7, 22, 13, 0.92));
    box-shadow: 0 30px 80px rgba(0,0,0,0.35);
    display: grid;
    grid-template-columns: 180px minmax(0, 1fr);
    gap: 36px;
    align-items: center;
  }
  .intro-mark-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 180px;
    height: 180px;
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
    gap: 10px;
    min-width: 0;
  }
  .intro-kicker {
    font-size: 26px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(232, 212, 139, 0.86);
    font-family: 'Oswald', sans-serif;
  }
  .intro-title {
    font-size: clamp(48px, 5.5vw, 76px);
    line-height: 0.95;
    color: #f3e6c5;
    font-family: 'Rocksalt', cursive;
  }
  .intro-tagline {
    font-size: 20px;
    line-height: 1.3;
    color: rgba(232, 212, 139, 0.9);
    font-family: 'Inter', sans-serif;
    font-weight: 600;
    letter-spacing: 0.01em;
    margin-top: 2px;
  }
  /* MOBILE INTRO */
  @media (max-width: 767px) {
    .intro-frame {
      width: min(92vw, 520px);
      padding: 32px 28px;
      grid-template-columns: 1fr;
      gap: 20px;
      text-align: center;
    }
    .intro-mark-wrap { width: 120px; height: 120px; margin: 0 auto; }
    .intro-copy { align-items: center; }
    .intro-kicker { font-size: 18px; }
    .intro-title { font-size: clamp(28px, 7vw, 42px); }
    .intro-tagline { font-size: 16px; text-align: center; }
    .intro-note { font-size: 13px; text-align: center; }
  }
  /* TABLE */
  .table-wrap {
    height: 100vh;
    width: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .balance-row {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 14px 8px;
    min-height: 48px;
    align-items: center;
    border-bottom: 1px solid rgba(212,168,64,0.08);
    flex-shrink: 0;
  }
  .utility-btns {
    display: flex;
    gap: 6px;
    align-items: center;
  }
  .btn-utility {
    font-family: 'Oswald', sans-serif !important;
    font-weight: 600;
    font-size: 13px !important;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    padding: 5px 12px !important;
    border-radius: 6px !important;
    min-height: 32px !important;
    min-width: unset !important;
  }
  .btn-mute.muted { opacity: 0.45; }
  .btn-fact { font-size: 16px !important; padding: 7px 20px !important; min-height: 42px !important; }
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
  .balance     { font-size: 26px; font-weight: 700; white-space: nowrap; font-family: 'Oswald', sans-serif; letter-spacing: 0.02em; }
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
    padding: 4px 14px 0;
    padding-bottom: 220px;
    background: radial-gradient(ellipse at 50% 35%, #153d24, #0c2616 55%, #071a0e 100%);
    transform-origin: top center;
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
  }
  .felt-menu {
    display: flex;
    flex-direction: row;
    gap: 10px;
    align-items: center;
    justify-content: center;
    padding: 6px 0 2px;
    flex-shrink: 0;
    z-index: 4;
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
  .dealer-area { min-height: 112px; display: flex; flex-direction: row; align-items: center; justify-content: center; gap: 16px; }
  .dealer-area-hidden { min-height: 0 !important; overflow: hidden; }
  .dealer-area-hidden .dealer-placeholder { height: 0; }
  .dealer-placeholder { height: 96px; }

  /* CARDS */
  .cards-row   { display: flex; flex-wrap: nowrap; overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .card-wrap   { position: relative; flex-shrink: 0; }

  .card {
    border-radius: 8px;
    width: 104px;
    height: 200px;
    position: relative;
    overflow: hidden;
    animation: cardIn 0.22s ease both;
    box-shadow: 0 3px 12px rgba(0,0,0,0.3);
  }
  .card.small  { width: 81px; height: 113px; }
  .card-face         { background: #fff; }
  .card-custom { background: transparent; overflow: hidden; }
  .card-custom-art {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    width: 100%;
    height: 100%;
    object-fit: fill;
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

  .card-rank    { font-family: Georgia, serif; font-size: 20px; font-weight: bold; }
  .card-suit-sm { font-family: Georgia, serif; font-size: 17px; margin-top: -1px; }
  .card.small .card-rank    { font-size: 15px; }
  .card.small .card-suit-sm { font-size: 13px; }
  .card-center  { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); font-family: Georgia, serif; font-size: 42px; }
  .card.small .card-center { font-size: 30px; }
  .card-face.red .card-rank,
  .card-face.red .card-suit-sm,
  .card-face.red .card-center { color: #c62828; }
  .card-face:not(.red) .card-rank,
  .card-face:not(.red) .card-suit-sm,
  .card-face:not(.red) .card-center { color: #1b1b1b; }

  .card-placeholder {
    width: 104px; height: 200px;
    border-radius: 8px;
    border: 1.5px dashed rgba(242,232,208,0.12);
    background: rgba(242,232,208,0.03);
  }
  .card-placeholder.small { width: 81px; height: 113px; }

  /* HAND VALUE */
  .hv-bubble {
    background: rgba(0,0,0,0.45);
    padding: 2px 14px;
    border-radius: 12px;
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 4px;
    border: 1px solid transparent;
    text-align: center;
    font-family: 'Oswald', sans-serif;
    letter-spacing: 0.02em;
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
    font-weight: 600;
    margin-bottom: 5px;
    font-family: 'Oswald', sans-serif;
    letter-spacing: 0.02em;
  }

  /* PAYOUT */
  .payout { font-size: 16px; color: #66ff88; margin-top: 3px; font-weight: 600; font-family: 'Oswald', sans-serif; letter-spacing: 0.02em; }

  /* FELT LOGO — bet screen only */
  .felt-logo-row {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 6px 0 4px;
  }
  .felt-logo {
    width: 72px;
    height: 72px;
    object-fit: contain;
    opacity: 0.85;
    filter: drop-shadow(0 0 10px rgba(212,168,64,0.35));
  }
  .felt-logo-large {
    width: 230px;
    height: 230px;
    opacity: 0.95;
    filter: drop-shadow(0 0 24px rgba(212,168,64,0.55));
  }

  /* DEALER LOGO — left of dealer cards */
  .dealer-logo {
    width: 130px;
    height: 130px;
    object-fit: contain;
    opacity: 0.9;
    filter: drop-shadow(0 0 16px rgba(212,168,64,0.5));
    flex-shrink: 0;
  }
  .dealer-cards-col {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  /* DIVIDER — play screen */
  .divider-row {
    display: flex;
    align-items: center;
    margin: 2px 0;
  }
  .divider-line  { flex: 1; height: 1px; background: rgba(212,168,64,0.09); }
  .divider-label { font-size: 14px; padding: 0 14px; opacity: 0.6; font-family: 'Inter', sans-serif; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; }

  /* FACT BLOCK — top-right corner, beside dealer card */
  .fact-block {
    position: absolute;
    top: 12px;
    right: 14px;
    left: auto;
    width: 200px;
    padding: 10px 14px;
    background: rgba(8, 20, 12, 0.78);
    border: 1px solid rgba(232, 212, 139, 0.18);
    border-radius: 12px;
    backdrop-filter: blur(6px);
    font-family: 'Fredoka One', cursive;
    font-size: 14px;
    line-height: 1.65;
    color: rgba(242, 232, 208, 0.82);
    z-index: 5;
    pointer-events: none;
  }



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
    font-size: 16px;
    text-align: center;
    line-height: 1.4;
    padding: 0 8px;
    color: #f2e8d0;
    font-family: 'Rocksalt', cursive;
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

  /* INSURANCE — centered modal overlay */
  .ins-modal {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 30;
    width: min(460px, 88vw);
    background: rgba(7, 26, 14, 0.97);
    border: 1px solid rgba(212, 168, 64, 0.35);
    border-radius: 18px;
    padding: 28px 28px 22px;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    box-shadow: 0 8px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(212,168,64,0.1);
    animation: fadeIn 0.2s ease;
  }
  .ins-modal-title {
    font-family: 'Oswald', sans-serif;
    font-size: 22px;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    text-align: center;
    color: #e8d48b;
  }
  .ins-modal-sub {
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    opacity: 0.65;
    text-align: center;
    margin-top: -6px;
  }
  .ins-modal-hands {
    display: flex;
    gap: 8px;
    justify-content: center;
    flex-wrap: wrap;
  }
  .btn-ins-hand {
    min-width: 110px;
    min-height: 40px;
    padding: 0 16px;
    border-radius: 999px;
    border: 1.5px dashed rgba(232, 212, 139, 0.35);
    background: rgba(8, 20, 12, 0.6);
    color: rgba(242, 232, 208, 0.55);
    font-size: 14px;
    font-weight: 700;
    font-family: 'Inter', sans-serif;
    letter-spacing: 0.02em;
    transition: all 0.15s;
  }
  .btn-ins-hand.active {
    border-style: solid;
    border-color: #d4a840;
    background: rgba(212, 168, 64, 0.18);
    color: #f2e8d0;
    box-shadow: 0 0 10px rgba(212, 168, 64, 0.25);
  }
  .btn-ins-all {
    padding: 10px 0;
    border-radius: 8px;
    border: 1px solid rgba(212, 168, 64, 0.25);
    background: transparent;
    color: #bfb49a;
    font-size: 14px;
    font-weight: 700;
    font-family: 'Inter', sans-serif;
    transition: all 0.15s;
  }
  .btn-ins-all.active {
    border-color: #e8d48b;
    background: rgba(232, 212, 139, 0.08);
    color: #e8d48b;
  }
  .btn-ins-confirm {
    padding: 15px 0;
    border-radius: 10px;
    border: none;
    background: linear-gradient(135deg, #d4a840, #a88a30);
    color: #071a0e;
    font-size: 18px;
    font-weight: 700;
    font-family: 'Oswald', sans-serif;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    margin-top: 2px;
  }

  /* Single-hand insurance two-button layout */
  .ins-two-btns { display: flex; gap: 8px; margin-top: 2px; }
  .btn-ins-take {
    flex: 3;
    padding: 15px 0;
    border-radius: 10px;
    border: none;
    background: linear-gradient(135deg, #d4a840, #a88a30);
    color: #071a0e;
    font-size: 18px;
    font-weight: 700;
    font-family: 'Oswald', sans-serif;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    cursor: pointer;
  }
  .btn-ins-skip {
    flex: 1;
    padding: 15px 0;
    border-radius: 10px;
    border: 1.5px solid rgba(242,232,208,0.25);
    background: transparent;
    color: rgba(242,232,208,0.6);
    font-size: 18px;
    font-weight: 700;
    font-family: 'Oswald', sans-serif;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    cursor: pointer;
  }
  .btn-ins-skip:hover { border-color: rgba(242,232,208,0.5); color: #f2e8d0; }

  /* RESULT */
  .result-msg { min-height: 24px; display: flex; align-items: center; justify-content: center; }
  .msg-text   { font-size: 26px; font-weight: 700; animation: fadeIn 0.3s ease; font-family: 'Oswald', sans-serif; letter-spacing: 0.04em; }
  .msg-text.bad-beat { font-size: 30px; color: #ef5350; }

  /* HANDS ROW */
  .hands-row { display: flex; justify-content: center; gap: 16px; padding-top: 0; min-height: 0; flex: 0 0 auto; align-items: center; flex-wrap: nowrap; }
  .hands-row.multi { gap: 20px; }
  .hand-col  { display: flex; flex-direction: column; align-items: flex-start; flex: 0 0 auto; min-width: 0; justify-content: flex-start; }

  /* WAGER LABEL */
  .bet-bar {
    margin-top: 1px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }
  .wager-label {
    font-size: 20px; font-weight: 600; color: #f2e8d0;
    text-align: center; white-space: nowrap;
    font-family: 'Oswald', sans-serif; letter-spacing: 0.02em;
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
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 3px 8px;
    border-radius: 12px;
    background: rgba(8, 20, 12, 0.72);
    border: 1px solid rgba(232, 212, 139, 0.18);

  }
  .bet-amount-prefix {
    position: absolute;
    left: 8px;
    font-size: 14px;
    color: #bfb49a;
    pointer-events: none;
  }
  .bet-amount-input {
    width: 92px;
    border: none;
    outline: none;
    background: transparent;
    color: #f2e8d0;
    font-family: 'Oswald', sans-serif;
    font-size: 20px;
    font-weight: 600;
    text-align: center;
    letter-spacing: 0.02em;
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
  .cards-area { position: relative; }
  .sb-and-cards { display: flex; flex-direction: row; align-items: center; gap: 4px; }
  .sb-col     { display: flex; flex-direction: column; gap: 6px; flex-shrink: 0; }
  .cards-col  { min-width: 104px; display: flex; flex-direction: column; align-items: center; }

  .sb-box {
    width: 72px; min-height: 52px;
    border-radius: 7px;
    border: 1.5px dashed rgba(242,232,208,0.18);
    background: rgba(242,232,208,0.02);
    cursor: pointer;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 2px; padding: 5px 4px;
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
  .sb-box-label { font-size: 12px; font-weight: 700; text-align: center; line-height: 1.2; font-family: 'Oswald', sans-serif; letter-spacing: 0.04em; text-transform: uppercase; }
  .sb-box-amt   { font-size: 14px; font-weight: 700; color: #e8d48b; }
  .sb-box-editing {
    width: 72px; min-height: 52px;
    border-radius: 7px;
    border: 1.5px solid #d4a840;
    background: rgba(212,168,64,0.12);
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 3px; padding: 5px 4px;
    color: #f2e8d0;
  }
  .sb-wager-input {
    width: 60px;
    background: rgba(0,0,0,0.35);
    border: 1px solid rgba(232,212,139,0.4);
    border-radius: 4px;
    color: #f2e8d0;
    font-family: inherit;
    font-size: 13px;
    text-align: center;
    padding: 3px 4px;
    outline: none;
  }
  .sb-wager-input:focus { border-color: #d4a840; box-shadow: 0 0 6px rgba(212,168,64,0.3); }

  /* Invisible spacer mirrors ghost width so card stacks stay at true screen center */
  .ghost-spacer { width: 104px; flex-shrink: 0; visibility: hidden; pointer-events: none; }

  .ghost-wrap { display: flex; flex-direction: column; align-items: center; justify-content: flex-start; }
  .ghost {
    width: 104px; height: 146px; border-radius: 8px;
    border: 2px dashed rgba(242,232,208,0.15);
    background: rgba(242,232,208,0.03);
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    font-size: 28px; color: #f2e8d0; opacity: 0.2;
    transition: all 0.2s;
  }
  .ghost:hover { opacity: 0.4; }

  .btn-remove { font-size: 13px; color: #bfb49a; background: none; border: 1px solid #2a5a3a; border-radius: 4px; padding: 2px 10px; margin-top: 4px; opacity: 0.5; }

  /* BOTTOM DOCK */
  .bottom-dock {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    flex-shrink: 0;
    padding: 0 4px 8px;
    z-index: 10;
    background: linear-gradient(to bottom, rgba(7,26,14,0) 0%, #071a0e 16px);
    padding-top: 16px;
  }

  /* CENTERED DEAL */
  .center-deal-wrap {
    display: flex;
    justify-content: center;
    padding: 8px 0 0;
    flex-shrink: 0;
  }
  .center-deal-wrap .btn-deal {
    width: min(600px, calc(100% - 12px));
    min-height: 52px;
    font-size: 20px;
  }

  .action-area-fixed { display: flex; flex-direction: column; justify-content: flex-end; }
  .action-area-spacer { flex: 1; }
  .action-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-bottom: 5px; }
  /* Full-width red stop bar replaces action buttons during autoplay */
  .btn-stop-bar {
    width: 100%;
    padding: 12px;
    background: #c62828;
    color: #fff;
    font-family: inherit;
    font-size: 16px;
    font-weight: 700;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    letter-spacing: 0.05em;
    margin-bottom: 5px;
    transition: background 0.15s;
  }
  .btn-stop-bar:hover { background: #e53935; }
  /* Fact bar — pinned bottom strip, no border */
  .fact-below-actions {
    width: 100%;
    max-width: 912px;
    margin: 0 auto;
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Bebas Neue', 'Oswald', sans-serif;
    font-size: 22px;
    letter-spacing: 0.06em;
    color: rgba(242,232,208,0.65);
    text-align: center;
    padding: 0 16px;
    line-height: 1.2;
    background: none;
    border: none;
    box-shadow: none;
  }
  .btn-action {
    padding: 13px 0; border-radius: 7px; font-size: 16px; font-weight: 700;
    background: #1d4a2c; color: #f2e8d0; border: 1px solid #2a5a3a;
    font-family: 'Inter', sans-serif; letter-spacing: 0.04em; text-transform: uppercase;
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
    font-family: 'Oswald', sans-serif;
    letter-spacing: 0.06em;
    text-transform: uppercase;
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

  /* ABOUT */
  .about-panel { max-height: min(34vh, 320px); overflow-y: auto; }
  .about-text {
    font-size: 16px;
    line-height: 1.75;
    color: rgba(242, 232, 208, 0.72);
    font-style: italic;
    font-family: 'Inter', sans-serif;
  }

  /* RULES */
  .rules-panel { max-height: min(34vh, 320px); overflow-y: auto; }
  .panel-title  { font-size: 25px; font-weight: 700; margin-bottom: 8px; }
  .rules-section { margin-bottom: 10px; font-size: 20px; }
  .rules-text   { margin-left: 8px; margin-top: 4px; font-size: 16px; line-height: 1.6; }
  .rules-text-sm { font-size: 14px; opacity: 0.75; }
  .rules-text.rtp { font-size: 14px; opacity: 0.7; }
  .payout-table { width: 100%; font-size: 15px; margin-top: 6px; border-collapse: collapse; }
  .payout-table td, .payout-table th { padding: 3px 6px; vertical-align: top; }
  .payout-table td:first-child { font-weight: 600; white-space: nowrap; opacity: 0.9; }
  .payout-table .rules-example { font-size: 13px; opacity: 0.65; padding-left: 10px; }
  .strategy-table th { font-size: 13px; opacity: 0.6; font-weight: 600; text-align: center; padding-bottom: 4px; border-bottom: 1px solid rgba(212,168,64,0.15); }
  .strategy-table td { text-align: center; font-size: 13px; }
  .strategy-table td:first-child { text-align: left; opacity: 0.7; font-weight: 500; }
  .strategy-table tr:nth-child(even) td { background: rgba(255,255,255,0.03); }

  .btn-reload {
    width: 100%; padding: 8px 0; border-radius: 5px;
    border: 1px solid #2a5a3a; background: transparent;
    color: #f2e8d0; font-size: 15px; margin-top: 4px;
  }

  /* DESKTOP — fit full screen, no scroll */
  @media (min-width: 768px) {
    .table-wrap  { height: 100vh; overflow: hidden; }
    .felt        { overflow: hidden; padding: 6px 24px 0; }

    .balance     { font-size: 28px; }
    .balance-row { min-height: 44px; padding: 8px 24px 0; }
    .session-pill { font-size: 14px; }

    .dealer-area        { min-height: 118px; gap: 24px; }
    .dealer-logo        { width: 150px; height: 150px; }
    .dealer-placeholder { height: 106px; }
    .hand-value         { font-size: 20px; padding: 3px 14px; }

    .card        { width: 120px; height: 195px; border-radius: 10px; }
    .card.small  { width: 90px; height: 126px; }

    .card-tl     { top: 11px; left: 13px; }
    .card-br     { bottom: 11px; right: 13px; }
    .card.small .card-tl { top: 8px; left: 10px; }
    .card.small .card-br { bottom: 8px; right: 10px; }

    .card-rank    { font-size: 23px; }
    .card-suit-sm { font-size: 18px; }
    .card-center  { font-size: 46px; }
    .card.small .card-rank    { font-size: 17px; }
    .card.small .card-suit-sm { font-size: 14px; }
    .card.small .card-center  { font-size: 35px; }

    .card-placeholder       { width: 120px; height: 195px; }
    .card-placeholder.small { width: 90px; height: 126px; }

    .hands-row      { min-height: 0; gap: 32px; }
    .hands-row.multi{ gap: 24px; }

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

    .sb-box       { width: 80px; min-height: 60px; }
    .sb-box-label { font-size: 10px; }
    .sb-box-amt   { font-size: 13px; }
    .sb-col       { gap: 6px; }
    .cards-area   { gap: 8px; }

    .ghost { width: 120px; height: 170px; font-size: 30px; }
    .ghost-spacer { width: 120px; }
    .cards-col { min-width: 120px; }

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
      padding: 8px 0 4px;
    }
    .btn-next-centered {
      width: min(560px, 70vw);
      min-height: 72px;
      font-size: 30px;
    }

    .msg-text  { font-size: 22px; }
    .msg-text.bad-beat { font-size: 28px; }

    .center-deal-wrap .btn-deal { min-height: 56px; font-size: 22px; }
    .bottom-dock { padding: 0 8px 10px; }
    .cards-row { flex-wrap: nowrap; }
  }

  /* ── MOBILE OPTIMIZATIONS (max 767px) ─────────────────────────────────── */
  @media (max-width: 767px) {
    /* Hands row takes natural height so felt can scroll past it */
    .hands-row { flex: 0 0 auto; gap: 10px; }
    .hands-row.multi { gap: 8px; }

    /* Sticky bottom dock — deal/action buttons always visible while scrolling */
    .bottom-dock {
      position: sticky;
      bottom: 0;
      margin-top: 4px;
      z-index: 10;
      background: linear-gradient(to bottom, rgba(7,26,14,0) 0%, #071a0e 14px);
      padding-top: 14px;
    }

    /* Felt: tighter top padding, enough bottom clearance for sticky dock */
    .felt { padding: 2px 10px 0; padding-bottom: 120px; }

    /* Compact top bar */
    .balance      { font-size: 21px; }
    .balance-row  { min-height: 42px; padding: 6px 12px; }

    /* Compact felt logo + divider */
    .felt-logo-row  { padding: 2px 0 2px; }
    .felt-logo      { width: 52px; height: 52px; }
    .felt-logo-large { width: 120px; height: 120px; }

    /* Compact fact block */
    .fact-block { width: 140px; font-size: 11px; padding: 8px 10px; top: 8px; right: 8px; left: auto; }

    /* Compact dealer */
    .dealer-area        { min-height: 96px; }
    .dealer-placeholder { height: 80px; }
    .hand-value         { font-size: 18px; padding: 2px 12px; margin-bottom: 3px; }

    /* Result */
    .msg-text           { font-size: 20px; }
    .msg-text.bad-beat  { font-size: 24px; }

    /* Action buttons — bigger touch target */
    .btn-action { padding: 16px 0; }

    /* Bet quick buttons — bigger touch target */
    .bet-quick-btn { min-height: 36px; min-width: 52px; }

    /* Felt menu compact */
    .felt-menu        { padding: 3px 0 1px; gap: 8px; }
    .felt-toggle-copy { font-size: 14px; }
    .bet-entry-btn    { font-size: 14px; min-width: 60px; min-height: 28px; }

    /* Hide divider on mobile — saves ~28px vertical */
    .divider-row { display: none; }

    /* Panels — smaller text so they don't crowd the screen */
    .panel          { padding: 6px 8px; margin-top: 6px; }
    .panel-title    { font-size: 18px; margin-bottom: 6px; }
    .panel-label    { font-size: 15px; margin-bottom: 2px; }
    .panel-hint     { font-size: 13px; margin-bottom: 4px; }
    .mode-row,
    .speed-row      { gap: 3px; margin-bottom: 4px; }
    .btn-mode,
    .btn-speed      { font-size: 14px; min-width: 68px; padding: 5px 6px; }
    .btn-auto-toggle { font-size: 16px; padding: 8px 0; }
    .rounds-ctrl span   { font-size: 18px; }
    .rounds-ctrl button { width: 28px; height: 28px; }
    .rules-section  { font-size: 13px; margin-bottom: 8px; }
    .rules-text     { font-size: 13px; line-height: 1.5; }
    .rules-text-sm  { font-size: 12px; }
    .rules-text.rtp { font-size: 12px; }
    .payout-table   { font-size: 12px; }
    .rules-example  { font-size: 11px; }
    .strategy-table th, .strategy-table td { font-size: 11px; }
    .rules-panel    { max-height: min(42vh, 300px); }
    .panel-title    { font-size: 18px; }
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
