/* ============================================================
   Riley Link — Nine-Card Golf Card Game & RL Solver Logic
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  const suitSymbols = {
    Hearts: "♥",
    Diamonds: "♦",
    Clubs: "♣",
    Spades: "♠",
    Joker: "★"
  };

  class Card {
    constructor(suit, rank, value) {
      this.suit = suit;     // "Hearts" | "Diamonds" | "Clubs" | "Spades" | "Joker"
      this.rank = rank;     // "A" | "2"-"9" | "T" | "J" | "Q" | "K" | "Jo"
      this.value = value;   // Point value: Ace=1, 2-10=face value, Jack/Queen=10, King=0, Joker=-2
      this.show = false;    // Flipped face up
      this.matched = false; // Part of a matching rank column (points zeroed)
    }
  }

  // Game state
  let currentRound = 1;
  let playerHand = [];
  let aiHand = [];
  let deck = [];
  let discardPile = [];
  
  let playerTotalScore = 0;
  let aiTotalScore = 0;
  let playerWins = 0;
  let aiWins = 0;

  // Phase: "setup" | "player_turn" | "player_swap" | "ai_turn" | "round_over" | "game_over"
  let gamePhase = "setup";
  let activeBotType = "rl"; // "rl" | "random"
  let policy = {}; // Loaded from golf_policy.json
  
  let drawnCard = null;
  let drawnFrom = null; // "deck" | "discard"

  // DOM Cache
  const aiGrid = document.getElementById("aiGrid");
  const playerGrid = document.getElementById("playerGrid");
  const deckPile = document.getElementById("deckPile");
  const deckCount = document.getElementById("deckCount");
  const discardPileEl = document.getElementById("discardPile");
  const discardContainer = document.getElementById("discardContainer");

  const btnReset = document.getElementById("btnReset");
  const btnNextRound = document.getElementById("btnNextRound");
  const btnBotRL = document.getElementById("btnBotRL");
  const btnBotRandom = document.getElementById("btnBotRandom");

  const statRound = document.getElementById("statRound");
  const statPlayerTotal = document.getElementById("statPlayerTotal");
  const statAiTotal = document.getElementById("statAiTotal");
  const statWins = document.getElementById("statWins");

  const playerRoundScoreEl = document.getElementById("playerRoundScore");
  const aiRoundScoreEl = document.getElementById("aiRoundScore");
  const helpText = document.getElementById("helpText");
  const historyList = document.getElementById("historyList");
  const bannerEl = document.getElementById("golfBanner");

  // Load RL Q-learning policy lookup table
  async function loadPolicy() {
    try {
      const res = await fetch("golf_policy.json");
      if (!res.ok) throw new Error("Policy file not found");
      policy = await res.json();
      console.log("Loaded Golf policy with", Object.keys(policy).length, "states");
    } catch (err) {
      console.warn("Could not load golf_policy.json, AI will fall back to heuristic:", err.message);
    }
  }

  // Banner Helpers
  function showBanner(message, type = "info") {
    if (!bannerEl) return;
    bannerEl.textContent = message;
    bannerEl.className = `golf-banner is-${type}`;
  }

  function hideBanner() {
    if (!bannerEl) return;
    bannerEl.textContent = "";
    bannerEl.className = "golf-banner";
  }

  // ───────────────────────────────
  // Card & Deck Engine
  // ───────────────────────────────

  function createDeck() {
    const newDeck = [];
    const suits = ["Hearts", "Diamonds", "Clubs", "Spades"];
    const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"];
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 0]; // Ace=1, Jack=10, Queen=10, King=0

    // Add standard cards
    for (const suit of suits) {
      for (let i = 0; i < ranks.length; i++) {
        newDeck.push(new Card(suit, ranks[i], values[i]));
      }
    }
    
    // Add two jokers
    for (let i = 0; i < 2; i++) {
      newDeck.push(new Card("Joker", "Jo", -2));
    }
    
    return newDeck;
  }

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  // ───────────────────────────────
  // Score Math & Triple Columns Rule
  // ───────────────────────────────

  function checkTripleRule(hand) {
    const columns = [
      [0, 3, 6], // Column 1
      [1, 4, 7], // Column 2
      [2, 5, 8]  // Column 3
    ];
    let tripleFound = false;

    // Reset matched flags
    hand.forEach(c => {
      if (c) c.matched = false;
    });

    for (const col of columns) {
      const c1 = hand[col[0]];
      const c2 = hand[col[1]];
      const c3 = hand[col[2]];

      if (c1 && c2 && c3 && c1.show && c2.show && c3.show) {
        if (c1.rank === c2.rank && c2.rank === c3.rank) {
          c1.matched = true;
          c2.matched = true;
          c3.matched = true;
          tripleFound = true;
        }
      }
    }
    return tripleFound;
  }

  function calculateScore(hand, countAll = false) {
    let score = 0;
    // Hand columns logic
    checkTripleRule(hand);
    
    hand.forEach(card => {
      if (!card) return;
      if (card.matched) return; // matched cards are 0 points
      if (card.show || countAll) {
        score += card.value;
      }
    });
    return score;
  }

  // ───────────────────────────────
  // Rendering Board and Cards
  // ───────────────────────────────

  function renderCard(card, slotEl) {
    slotEl.innerHTML = "";
    slotEl.className = "golf-card-slot";
    
    if (!card) {
      slotEl.classList.remove("is-revealed");
      slotEl.innerHTML = `<div class="golf-pile-empty">Empty</div>`;
      return;
    }

    const cardDiv = document.createElement("div");
    cardDiv.className = "golf-card";
    cardDiv.dataset.suit = card.suit;

    const backDiv = document.createElement("div");
    backDiv.className = "golf-card__back";
    cardDiv.appendChild(backDiv);

    const frontDiv = document.createElement("div");
    frontDiv.className = "golf-card__front";

    const suitSym = suitSymbols[card.suit] || "";
    const displayRank = card.rank === "T" ? "10" : card.rank;

    frontDiv.innerHTML = `
      <div class="golf-card-top-left">
        <span>${displayRank}</span>
        <span>${suitSym}</span>
      </div>
      <div class="golf-card-suit-large">${suitSym}</div>
      <div class="golf-card-bottom-right">
        <span>${displayRank}</span>
        <span>${suitSym}</span>
      </div>
    `;

    cardDiv.appendChild(frontDiv);
    slotEl.appendChild(cardDiv);

    if (card.show) {
      slotEl.classList.add("is-revealed");
    }

    // Add visual highlights for column triplets
    if (card.matched) {
      const matchOverlay = document.createElement("div");
      matchOverlay.className = "golf-col-matched";
      
      // Put a badge on the middle card of the column
      const idx = parseInt(slotEl.dataset.index);
      if (idx === 3 || idx === 4 || idx === 5) {
        const badge = document.createElement("div");
        badge.className = "golf-col-badge";
        badge.textContent = "Triple";
        slotEl.appendChild(badge);
      }
      
      slotEl.appendChild(matchOverlay);
    }
  }

  function renderDiscardPile() {
    discardPileEl.innerHTML = "";
    if (discardPile.length === 0) {
      discardPileEl.className = "golf-pile-empty";
      discardPileEl.textContent = "Empty";
    } else {
      discardPileEl.className = "golf-pile-card";
      const topCard = discardPile[discardPile.length - 1];
      
      const cardDiv = document.createElement("div");
      cardDiv.className = "golf-card";
      cardDiv.dataset.suit = topCard.suit;

      const frontDiv = document.createElement("div");
      frontDiv.className = "golf-card__front";

      const suitSym = suitSymbols[topCard.suit] || "";
      const displayRank = topCard.rank === "T" ? "10" : topCard.rank;

      frontDiv.innerHTML = `
        <div class="golf-card-top-left">
          <span>${displayRank}</span>
          <span>${suitSym}</span>
        </div>
        <div class="golf-card-suit-large">${suitSym}</div>
        <div class="golf-card-bottom-right">
          <span>${displayRank}</span>
          <span>${suitSym}</span>
        </div>
      `;

      cardDiv.appendChild(frontDiv);
      discardPileEl.appendChild(cardDiv);
    }
  }

  function renderBoards() {
    // 1. Render AI Hand Grid
    aiGrid.innerHTML = "";
    for (let i = 0; i < 9; i++) {
      const slot = document.createElement("div");
      slot.className = "golf-card-slot";
      slot.dataset.index = i;
      renderCard(aiHand[i], slot);
      aiGrid.appendChild(slot);
    }

    // 2. Render Player Hand Grid
    playerGrid.innerHTML = "";
    for (let i = 0; i < 9; i++) {
      const slot = document.createElement("div");
      slot.className = "golf-card-slot";
      slot.dataset.index = i;
      renderCard(playerHand[i], slot);
      
      // Wire up slot interactions
      slot.addEventListener("click", () => handlePlayerSlotClick(i));
      playerGrid.appendChild(slot);
    }

    // 3. Render Pile counts
    deckCount.textContent = deck.length;
    renderDiscardPile();

    // 4. Update Current Scores
    playerRoundScoreEl.textContent = `Score: ${calculateScore(playerHand)}`;
    aiRoundScoreEl.textContent = `Score: ${calculateScore(aiHand)}`;
  }

  // ───────────────────────────────
  // Game Interactions
  // ───────────────────────────────

  function handlePlayerSlotClick(idx) {
    if (gamePhase === "setup") {
      // Flip exactly 3 cards at start of round
      if (playerHand[idx].show) return;
      playerHand[idx].flip();
      renderBoards();
      
      const numFlipped = playerHand.filter(c => c.show).length;
      if (numFlipped >= 3) {
        // Setup complete, start round
        gamePhase = "player_turn";
        helpText.textContent = "Your Turn: Draw a card from the Deck or Discard Pile.";
        
        // Flip AI's first 3 random cards
        const randomSlots = [];
        while (randomSlots.length < 3) {
          const r = Math.floor(Math.random() * 9);
          if (!randomSlots.includes(r)) {
            randomSlots.push(r);
          }
        }
        randomSlots.forEach(s => aiHand[s].flip());
        
        // Push first card to discard
        const firstCard = deck.pop();
        firstCard.show = true;
        discardPile.push(firstCard);
        
        renderBoards();
      }
    } else if (gamePhase === "player_swap") {
      // Swap the drawn card with slot at idx
      const replacedCard = playerHand[idx];
      
      // Place drawn card into hand slot (face up)
      playerHand[idx] = drawnCard;
      drawnCard.show = true;
      
      // Push old replaced card to top of discard pile (face up)
      replacedCard.show = true;
      discardPile.push(replacedCard);
      
      // Reset swap helpers
      drawnCard = null;
      drawnFrom = null;
      deckPile.classList.remove("is-active-draw");
      discardPileEl.classList.remove("is-active-draw");
      
      // Remove visual swap selectors
      document.querySelectorAll("#playerGrid .golf-card-slot").forEach(el => el.classList.remove("is-selectable"));
      
      // Calculate score & check triplet rules
      checkTripleRule(playerHand);
      renderBoards();
      
      // Check if player board is fully revealed
      if (playerHand.every(c => c.show)) {
        endRound();
      } else {
        // AI Opponent's turn
        gamePhase = "ai_turn";
        helpText.textContent = "AI Opponent is thinking...";
        setTimeout(aiTurn, 1200); // 1.2s delay for visual feedback
      }
    }
  }

  // Deck pile click
  deckPile.addEventListener("click", () => {
    if (gamePhase !== "player_turn") return;
    if (deck.length === 0) {
      endRound(); // empty deck triggers round end
      return;
    }
    
    drawnCard = deck.pop();
    drawnCard.show = true;
    drawnFrom = "deck";
    gamePhase = "player_swap";
    helpText.textContent = "Your Turn: Swap the drawn card with one of your 9 cards.";
    
    // Highlight the drawn card (visualized on the deck stack)
    deckPile.classList.add("is-active-draw");
    
    // Highlight slot choices
    document.querySelectorAll("#playerGrid .golf-card-slot").forEach(el => el.classList.add("is-selectable"));
  });

  // Discard pile click
  discardPileEl.addEventListener("click", () => {
    if (gamePhase !== "player_turn") return;
    if (discardPile.length === 0) return;
    
    drawnCard = discardPile.pop();
    drawnFrom = "discard";
    gamePhase = "player_swap";
    helpText.textContent = "Your Turn: Swap the discard card with one of your 9 cards.";
    
    // Highlight discard card stack
    discardPileEl.classList.add("is-active-draw");
    
    // Highlight slot choices
    document.querySelectorAll("#playerGrid .golf-card-slot").forEach(el => el.classList.add("is-selectable"));
  });

  // ───────────────────────────────
  // AI Opponent (Q-Learning Policy)
  // ───────────────────────────────

  function aiTurn() {
    if (gamePhase !== "ai_turn" || isGameOver()) return;

    let drawChoice = 0; // 0 = Deck, 1 = Discard
    let replaceIdx = 0; // index in hand 0-8

    // Read top discard
    const topDiscard = discardPile[discardPile.length - 1];
    const discardValue = topDiscard ? topDiscard.value : 0;
    const currentScore = calculateScore(aiHand);
    
    // Policy Lookup
    const stateKey = `${currentScore},${discardValue}`;
    const actionIdx = policy[stateKey];

    if (activeBotType === "rl" && actionIdx !== undefined) {
      // Deconstruct action mapping:
      // actionIdx maps to combination product of (0,1) x range(0,9)
      drawChoice = Math.floor(actionIdx / 9); // 0 or 1
      replaceIdx = actionIdx % 9; // 0 to 8
      console.log(`AI Q-Learning: state [${stateKey}], action index [${actionIdx}] -> drawChoice [${drawChoice}], replaceIdx [${replaceIdx}]`);
    } else {
      // Heuristic Fallback / Simple Bot
      // If discard value is <= 2, take it; else draw from deck
      if (discardValue <= 2 && discardPile.length > 0) {
        drawChoice = 1;
      } else {
        drawChoice = 0;
      }
      
      // Prioritize replacing highest value face-up card, or swap a face-down card
      let highestVal = -100;
      let targetSlot = -1;
      for (let s = 0; s < 9; s++) {
        const card = aiHand[s];
        if (!card.show) {
          targetSlot = s; // Swap face-down card
          break;
        } else if (card.value > highestVal && !card.matched) {
          highestVal = card.value;
          targetSlot = s;
        }
      }
      replaceIdx = (targetSlot !== -1) ? targetSlot : Math.floor(Math.random() * 9);
      console.log(`AI Heuristic: drawChoice [${drawChoice}], replaceIdx [${replaceIdx}]`);
    }

    // Perform the selected AI Action
    let aiDrawn = null;
    if (drawChoice === 1 && discardPile.length > 0) {
      // Take discard
      aiDrawn = discardPile.pop();
    } else {
      // Draw deck
      aiDrawn = deck.pop();
      if (!aiDrawn) {
        endRound();
        return;
      }
      aiDrawn.show = true;
    }

    // Replace hand card
    const oldAiCard = aiHand[replaceIdx];
    aiHand[replaceIdx] = aiDrawn;
    aiDrawn.show = true;
    
    // Swapped card goes to discard
    oldAiCard.show = true;
    discardPile.push(oldAiCard);

    checkTripleRule(aiHand);
    renderBoards();

    // Check terminal condition
    if (aiHand.every(c => c.show)) {
      showBanner("AI Opponent revealed all cards! Round Over.", "info");
      setTimeout(endRound, 1000);
    } else {
      // Return turn to player
      gamePhase = "player_turn";
      helpText.textContent = "Your Turn: Draw a card from the Deck or Discard Pile.";
    }
  }

  // ───────────────────────────────
  // Scoring & Round Loops
  // ───────────────────────────────

  function endRound() {
    gamePhase = "round_over";
    
    // Reveal all card slots
    playerHand.forEach(c => { if (c) c.show = true; });
    aiHand.forEach(c => { if (c) c.show = true; });
    
    // Calculate final scores
    const playerRoundScore = calculateScore(playerHand, true);
    const aiRoundScore = calculateScore(aiHand, true);

    playerTotalScore += playerRoundScore;
    aiTotalScore += aiRoundScore;

    // Check perfect 100 points rule
    let playerBonus = "";
    if (playerTotalScore === 100) {
      playerTotalScore = 0;
      playerBonus = " (perfect 100 bonus: -100!)";
    }
    let aiBonus = "";
    if (aiTotalScore === 100) {
      aiTotalScore = 0;
      aiBonus = " (perfect 100 bonus: -100!)";
    }

    renderBoards();

    // Update Totals
    statPlayerTotal.textContent = playerTotalScore;
    statAiTotal.textContent = aiTotalScore;

    // Append to logs
    appendHistoryItem(currentRound, playerRoundScore, aiRoundScore);

    if (currentRound >= 9) {
      // End Game
      gamePhase = "game_over";
      btnNextRound.setAttribute("disabled", "true");
      
      let msg = "";
      if (playerTotalScore < aiTotalScore) {
        playerWins++;
        msg = `Game Over! You won the game! Player: ${playerTotalScore}, AI: ${aiTotalScore}`;
        showBanner(msg, "success");
      } else if (playerTotalScore > aiTotalScore) {
        aiWins++;
        msg = `Game Over! AI won the game. Player: ${playerTotalScore}, AI: ${aiTotalScore}`;
        showBanner(msg, "error");
      } else {
        msg = `Game Over! The match ended in a tie. Player: ${playerTotalScore}, AI: ${aiTotalScore}`;
        showBanner(msg, "info");
      }
      
      statWins.textContent = `${playerWins} - ${aiWins}`;
      helpText.textContent = "Match completed. Click New Game to play again!";
    } else {
      btnNextRound.removeAttribute("disabled");
      btnNextRound.classList.add("btn--primary");
      helpText.textContent = `Round ${currentRound} complete. Click Next Round to proceed.`;
      showBanner(`Round ${currentRound} Complete! You scored ${playerRoundScore}${playerBonus}, AI scored ${aiRoundScore}${aiBonus}.`, "success");
    }
  }

  function appendHistoryItem(round, playerSc, aiSc) {
    if (round === 1) {
      historyList.innerHTML = "";
    }
    const item = document.createElement("div");
    item.className = "golf-history-item";
    item.innerHTML = `
      <span>Round ${round}</span>
      <span>You: <strong>${playerSc}</strong> | AI: <strong>${aiSc}</strong></span>
    `;
    historyList.insertBefore(item, historyList.firstChild);
  }

  function startNewRound() {
    deck = createDeck();
    shuffle(deck);

    playerHand = [];
    aiHand = [];
    discardPile = [];
    drawnCard = null;
    drawnFrom = null;

    // Deal 9 cards
    for (let i = 0; i < 9; i++) {
      playerHand.push(deck.pop());
      aiHand.push(deck.pop());
    }

    gamePhase = "setup";
    hideBanner();
    btnNextRound.setAttribute("disabled", "true");
    btnNextRound.classList.remove("btn--primary");
    helpText.textContent = "Select 3 cards on your board to flip over and start the round!";
    
    statRound.textContent = `${currentRound} / 9`;
    renderBoards();
  }

  function startNewGame() {
    currentRound = 1;
    playerTotalScore = 0;
    aiTotalScore = 0;
    
    statPlayerTotal.textContent = "0";
    statAiTotal.textContent = "0";
    historyList.innerHTML = `<div style="color:var(--text-secondary); text-align:center; width:100%; font-size:var(--text-xs); padding:var(--space-sm) 0">No round data yet</div>`;
    
    startNewRound();
  }

  function isGameOver() {
    return gamePhase === "game_over";
  }

  // Wire up game buttons
  btnReset.addEventListener("click", startNewGame);
  
  btnNextRound.addEventListener("click", () => {
    if (gamePhase !== "round_over") return;
    currentRound++;
    startNewRound();
  });

  // Wire up Bot Selectors
  btnBotRL.addEventListener("click", () => {
    btnBotRL.classList.add("is-active");
    btnBotRandom.classList.remove("is-active");
    activeBotType = "rl";
  });

  btnBotRandom.addEventListener("click", () => {
    btnBotRandom.classList.add("is-active");
    btnBotRL.classList.remove("is-active");
    activeBotType = "random";
  });

  // Initialize Page
  loadPolicy().then(() => {
    startNewGame();
  });
});
