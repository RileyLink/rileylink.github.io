/* ============================================================
   Riley Link — Mastermind Game & Solver Logic
   ============================================================ */

/**
 * 1-to-1 JavaScript port of the undergraduate C++ mastermind class.
 * Keeps same member variables, algorithm logic, and structure.
 */
class MastermindEngine {
  constructor(codelength = 4) {
    this.CODELENGTH = codelength;
    this.colors = ['R', 'W', 'Y', 'G', 'B', 'K'];
  }

  /**
   * Replicates mastermind::score(string secretCode, string guess)
   * 1-to-1 logic with two-pass exact and color match counts.
   */
  score(secretCode, guess) {
    let score = "";
    let atCount = 0; // Count for correct characters and positions ('@')
    let oCount = 0;  // Count for correct characters but wrong positions ('o')

    // Create arrays to track matched positions (equivalent to vector<bool>)
    const secretMatched = new Array(this.CODELENGTH).fill(false);
    const guessMatched = new Array(this.CODELENGTH).fill(false);

    // First pass: Count exact matches ('@')
    for (let i = 0; i < this.CODELENGTH; i++) {
      if (guess[i] === secretCode[i]) {
        atCount++;
        secretMatched[i] = true; // Mark this character as matched
        guessMatched[i] = true;   // Mark this character as matched
      }
    }

    // Second pass: Count color matches ('o')
    for (let i = 0; i < this.CODELENGTH; i++) {
      if (!guessMatched[i]) { // Only consider unmatched guesses
        for (let j = 0; j < this.CODELENGTH; j++) {
          if (!secretMatched[j] && guess[i] === secretCode[j]) {
            oCount++;
            secretMatched[j] = true; // Mark this character as matched
            break; // Move to next guess after finding a match
          }
        }
      }
    }

    // Build the score string with all '@' first, followed by 'o'
    score += "@".repeat(atCount);
    score += "o".repeat(oCount);

    return score;
  }

  /**
   * Replicates mastermind::recurGenerate and generateCombinations
   */
  generateCombinations() {
    const result = [];
    const recurGenerate = (prefix) => {
      if (prefix.length === this.CODELENGTH) {
        result.push(prefix);
        return;
      }
      for (const c of this.colors) {
        recurGenerate(prefix + c);
      }
    };
    recurGenerate("");
    return result;
  }

  /**
   * Replicates mastermind::removeCode
   */
  removeCode(arr, code) {
    const idx = arr.indexOf(code);
    if (idx !== -1) {
      arr.splice(idx, 1);
      return true;
    }
    return false;
  }

  /**
   * Replicates mastermind::pickGuess
   */
  pickGuess(guesses, candidateSolutions) {
    // First loop: Find a possible guess in candidateSolutions
    for (const possibleGuess of guesses) {
      if (candidateSolutions.includes(possibleGuess)) {
        return possibleGuess;
      }
    }
    // Second loop: Find a possible guess in combinations
    return guesses[0];
  }

  /**
   * Replicates Knuth's Minimax evaluation step from mastermind::playDonaldKnuth
   * Returns the array of guesses that minimize the maximum possible remaining candidates.
   */
  calculateMinimaxGuesses(combinations, candidateSolutions) {
    const maxGuessVec = {};

    for (const key of combinations) {
      const scoreCount = {};
      // Count the scores for each candidate solution if key is played
      for (const sol of candidateSolutions) {
        const pegScore = this.score(key, sol);
        scoreCount[pegScore] = (scoreCount[pegScore] || 0) + 1;
      }

      // Find max score size
      let max = 0;
      for (const score in scoreCount) {
        if (scoreCount[score] > max) {
          max = scoreCount[score];
        }
      }
      maxGuessVec[key] = max;
    }

    // Find minimum of the maximums
    let min = Infinity;
    for (const key in maxGuessVec) {
      if (maxGuessVec[key] < min) {
        min = maxGuessVec[key];
      }
    }

    // Gather all guesses with the minimum value
    const minGuesses = [];
    for (const key in maxGuessVec) {
      if (maxGuessVec[key] === min) {
        minGuesses.push(key);
      }
    }

    return { minGuesses, minVal: min };
  }

  /**
   * Replicates createSecretCode randomly
   */
  createSecretCode() {
    let secret = "";
    for (let i = 0; i < this.CODELENGTH; i++) {
      const rndIdx = Math.floor(Math.random() * this.colors.length);
      secret += this.colors[rndIdx];
    }
    return secret;
  }
}

// ─────────────────────────────────────────────────────────────
// UI CONTROLLER
// ─────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  const engine = new MastermindEngine();
  const maxRows = 10;
  
  // Game state
  let currentMode = "play"; // "play" | "knuth" | "brute"
  let secretCode = "";      // Secret code set by AI (in Play mode) or User (in Solver modes)
  let activeRow = 0;        // Current active guess row (0 to 9, where 0 is first row at the bottom)
  let userGuess = ["", "", "", ""]; // Active row pegs being colored
  let historyGuesses = [];  // Guesses played so far
  let historyScores = [];   // Scores of those guesses
  let isGameOver = false;

  // Solver running state
  let solverState = null;
  let autoPlayTimer = null;
  let autoPlaySpeed = 1000; // ms

  // DOM Cache
  const boardEl = document.getElementById("mmBoard");
  const shieldEl = document.getElementById("mmShield");
  const shieldCover = document.getElementById("mmShieldCover");
  const shieldCoverText = document.getElementById("mmShieldCoverText");
  const shieldSlots = document.getElementById("mmShieldSlots");
  const bannerEl = document.getElementById("mmBanner");
  
  // Panels and Buttons
  const tabPlay = document.getElementById("tabPlay");
  const tabKnuth = document.getElementById("tabKnuth");
  const tabBrute = document.getElementById("tabBrute");
  const panelPlay = document.getElementById("panelPlay");
  const panelSolver = document.getElementById("panelSolver");

  const palettePegs = document.querySelectorAll(".mm-palette .mm-peg");
  const btnSubmit = document.getElementById("btnSubmit");
  const btnReset = document.getElementById("btnReset");

  // Solver DOM elements
  const secretSetupSlots = document.querySelectorAll("#secretSetup .mm-peg");
  const btnStartSolver = document.getElementById("btnStartSolver");
  const btnSolverStep = document.getElementById("btnSolverStep");
  const btnSolverAuto = document.getElementById("btnSolverAuto");
  const btnSolverStop = document.getElementById("btnSolverStop");
  const speedSlider = document.getElementById("speedSlider");
  const speedVal = document.getElementById("speedVal");

  // Visualizer stats
  const statGuesses = document.getElementById("statGuesses");
  const statCandidates = document.getElementById("statCandidates");
  const statPruned = document.getElementById("statPruned");
  const statTime = document.getElementById("statTime");
  const candidatesScroll = document.getElementById("candidatesScroll");

  // Code Viewer elements
  const codePre = document.getElementById("codePre");
  const tabH = document.getElementById("tabH");
  const tabCPP = document.getElementById("tabCPP");
  const tabMain = document.getElementById("tabMain");
  const codeDownload = document.getElementById("codeDownload");

  // Banner helpers
  function showBanner(message, type = "info") {
    if (!bannerEl) return;
    bannerEl.textContent = message;
    bannerEl.className = `mm-banner is-${type}`;
  }

  function hideBanner() {
    if (!bannerEl) return;
    bannerEl.textContent = "";
    bannerEl.className = "mm-banner";
  }

  // ───────────────────────────────
  // UI Setup & Rendering
  // ───────────────────────────────

  function initBoard() {
    boardEl.innerHTML = "";
    // Create 10 rows (numbered 10 to 1 top to bottom)
    for (let r = maxRows - 1; r >= 0; r--) {
      const rowDiv = document.createElement("div");
      rowDiv.className = `mm-row row-${r}`;
      rowDiv.id = `row-${r}`;

      // Row Number label
      const numSpan = document.createElement("span");
      numSpan.className = "mm-row-num";
      numSpan.textContent = r + 1;
      rowDiv.appendChild(numSpan);

      // Guess Slots (4 pegs)
      const slotsDiv = document.createElement("div");
      slotsDiv.className = "mm-slots";
      for (let s = 0; s < 4; s++) {
        const pegDiv = document.createElement("div");
        pegDiv.className = "mm-peg";
        pegDiv.dataset.row = r;
        pegDiv.dataset.slot = s;
        // In Play mode, pegs in active row are clickable
        pegDiv.addEventListener("click", () => handlePegClick(r, s));
        slotsDiv.appendChild(pegDiv);
      }
      rowDiv.appendChild(slotsDiv);

      // Feedback area (2x2 key pegs)
      const feedbackDiv = document.createElement("div");
      feedbackDiv.className = "mm-feedback";
      for (let f = 0; f < 4; f++) {
        const keyPeg = document.createElement("div");
        keyPeg.className = "mm-key-peg";
        keyPeg.dataset.row = r;
        keyPeg.dataset.idx = f;
        feedbackDiv.appendChild(keyPeg);
      }
      rowDiv.appendChild(feedbackDiv);

      boardEl.appendChild(rowDiv);
    }
  }

  function handlePegClick(row, slot) {
    if (currentMode !== "play" || isGameOver) return;
    if (row !== activeRow) return;

    // Pick currently selected color in palette or toggle colors on click
    const activeColor = getActiveColorFromPalette();
    userGuess[slot] = activeColor;
    updateRowVisuals();
  }

  function getActiveColorFromPalette() {
    const selected = document.querySelector(".mm-palette .mm-peg.is-selected");
    return selected ? selected.dataset.color : "R";
  }

  function updateRowVisuals() {
    const rowEl = document.getElementById(`row-${activeRow}`);
    if (!rowEl) return;

    // Set row active classes
    document.querySelectorAll(".mm-row").forEach(r => r.classList.remove("is-active"));
    if (!isGameOver) {
      rowEl.classList.add("is-active");
    }

    const pegs = rowEl.querySelectorAll(".mm-slots .mm-peg");
    pegs.forEach((peg, idx) => {
      const color = userGuess[idx];
      if (color) {
        peg.setAttribute("data-color", color);
        peg.style.transform = "scale(1.05)";
      } else {
        peg.removeAttribute("data-color");
        peg.style.transform = "scale(1)";
      }
      
      // Make clickable if active row
      if (activeRow === parseInt(peg.dataset.row) && !isGameOver) {
        peg.classList.add("is-clickable");
      } else {
        peg.classList.remove("is-clickable");
      }
    });

    // Check if guess is fully filled to enable Submit button
    const isFilled = userGuess.every(c => c !== "");
    if (isFilled && currentMode === "play" && !isGameOver) {
      btnSubmit.removeAttribute("disabled");
      btnSubmit.classList.add("btn--primary");
    } else {
      btnSubmit.setAttribute("disabled", "true");
      btnSubmit.classList.remove("btn--primary");
    }
  }

  function setupPaletteSelection() {
    palettePegs.forEach(peg => {
      peg.addEventListener("click", () => {
        palettePegs.forEach(p => p.classList.remove("is-selected"));
        peg.classList.add("is-selected");
      });
    });
  }

  // ───────────────────────────────
  // Mode Selection Panels
  // ───────────────────────────────

  function setMode(mode) {
    stopAutoPlay();
    currentMode = mode;

    tabPlay.classList.toggle("is-active", mode === "play");
    tabKnuth.classList.toggle("is-active", mode === "knuth");
    tabBrute.classList.toggle("is-active", mode === "brute");

    panelPlay.classList.toggle("is-active", mode === "play");
    panelSolver.classList.toggle("is-active", mode !== "play");

    // Clear stats and lists
    resetGame();
  }

  tabPlay.addEventListener("click", () => setMode("play"));
  tabKnuth.addEventListener("click", () => setMode("knuth"));
  tabBrute.addEventListener("click", () => setMode("brute"));

  // ───────────────────────────────
  // Setup user secret code in solver mode
  // ───────────────────────────────

  let secretSetupCode = ["", "", "", ""];
  secretSetupSlots.forEach((slot, idx) => {
    slot.addEventListener("click", () => {
      if (solverState && solverState.running) return;
      const activeColor = getActiveColorFromPalette();
      secretSetupCode[idx] = activeColor;
      slot.setAttribute("data-color", activeColor);
      
      // Enable Start button if complete
      const isFilled = secretSetupCode.every(c => c !== "");
      if (isFilled) {
        btnStartSolver.removeAttribute("disabled");
        btnStartSolver.classList.add("btn--primary");
      }
    });
  });

  // ───────────────────────────────
  // Game Actions — Play Mode
  // ───────────────────────────────

  btnSubmit.addEventListener("click", () => {
    if (currentMode !== "play" || isGameOver) return;
    const guessStr = userGuess.join("");
    
    // Score guess
    const scoreStr = engine.score(secretCode, guessStr);
    historyGuesses.push(guessStr);
    historyScores.push(scoreStr);

    renderFeedback(activeRow, scoreStr);

    if (scoreStr === "@@@@") {
      winGame();
    } else if (activeRow >= maxRows - 1) {
      loseGame();
    } else {
      activeRow++;
      userGuess = ["", "", "", ""];
      updateRowVisuals();
    }
  });

  function renderFeedback(row, scoreStr) {
    const rowEl = document.getElementById(`row-${row}`);
    if (!rowEl) return;
    
    const feedbackDiv = rowEl.querySelector(".mm-feedback");
    feedbackDiv.innerHTML = "";
    
    // Sort scores: Black ('@') first, then White ('o')
    for (let i = 0; i < scoreStr.length; i++) {
      if (scoreStr[i] === "@") {
        const badge = document.createElement("span");
        badge.className = "mm-badge";
        badge.textContent = "@";
        badge.setAttribute("data-type", "exact");
        feedbackDiv.appendChild(badge);
      }
    }
    for (let i = 0; i < scoreStr.length; i++) {
      if (scoreStr[i] === "o") {
        const badge = document.createElement("span");
        badge.className = "mm-badge";
        badge.textContent = "o";
        badge.setAttribute("data-type", "color");
        feedbackDiv.appendChild(badge);
      }
    }
  }

  function revealSecretCode(code) {
    shieldEl.classList.add("is-revealed");
    shieldSlots.innerHTML = "";
    for (let i = 0; i < 4; i++) {
      const peg = document.createElement("div");
      peg.className = "mm-peg";
      peg.setAttribute("data-color", code[i]);
      shieldSlots.appendChild(peg);
    }
  }

  function winGame() {
    isGameOver = true;
    revealSecretCode(secretCode);
    updateRowVisuals();
    showBanner(`Congratulations! You broke the secret code in ${activeRow + 1} guesses!`, "success");
  }

  function loseGame() {
    isGameOver = true;
    revealSecretCode(secretCode);
    updateRowVisuals();
    showBanner(`Game Over! You've run out of guesses. The secret code was: ${secretCode}`, "error");
  }

  // ───────────────────────────────
  // Solver Engine (Knuth & Brute Force)
  // ───────────────────────────────

  function initSolver() {
    secretCode = secretSetupCode.join("");
    activeRow = 0;
    historyGuesses = [];
    historyScores = [];
    isGameOver = false;
    hideBanner();

    // Reset visual board
    initBoard();
    shieldEl.classList.remove("is-revealed");
    shieldCoverText.innerHTML = `<span style="color:var(--accent);">●</span> SECRET SHIELDED`;

    // 1-to-1 matching C++ setup
    const combinations = engine.generateCombinations();
    
    // Check if Brute Force mode
    if (currentMode === "brute") {
      const tStart = performance.now();
      const guesses = [];
      const correctScore = "@@@@";
      
      for (const guess of combinations) {
        guesses.push(guess);
        const scr = engine.score(secretCode, guess);
        if (scr === correctScore) {
          break;
        }
      }
      
      const tEnd = performance.now();
      const totalTime = tEnd - tStart;
      const totalGuesses = guesses.length;
      
      // Render final winning guess on row 0 of the board so user sees it visually
      renderGuessOnBoard(0, guesses[guesses.length - 1]);
      renderFeedback(0, "@@@@");
      
      // Set game over and reveal
      isGameOver = true;
      revealSecretCode(secretCode);
      
      // Update visual stats
      statGuesses.textContent = totalGuesses;
      statCandidates.textContent = "0 / 1296";
      statPruned.textContent = "100.0%";
      statTime.textContent = `${totalTime.toFixed(2)} ms`;
      
      candidatesScroll.innerHTML = `<span class="mm-cand-pill" style="border-color:var(--accent);">Code Found!</span>`;
      
      // Disable buttons
      btnStartSolver.setAttribute("disabled", "true");
      btnSolverStep.setAttribute("disabled", "true");
      btnSolverAuto.setAttribute("disabled", "true");
      btnSolverStop.setAttribute("disabled", "true");
      
      showBanner(`Brute Force Solver finished instantly in ${totalGuesses} guesses (${totalTime.toFixed(2)} ms)!`, "success");
      return;
    }

    // Otherwise, Knuth's Solver (step-by-step)
    const candidateSolutions = [...combinations];

    let firstGuess = "";
    // Replicates standard C++ first guess loop:
    // for (int i = 0; i < CODELENGTH; ++i) { currentGuess += colors[i / 2]; }
    for (let i = 0; i < 4; i++) {
      firstGuess += engine.colors[Math.floor(i / 2)]; // RRWW
    }

    solverState = {
      running: true,
      mode: currentMode, // "knuth"
      combinations: combinations,
      candidateSolutions: candidateSolutions,
      currentGuess: firstGuess,
      step: 1,
      totalPruned: 0,
      candidatesLeft: 1296
    };

    // UI Updates
    btnStartSolver.setAttribute("disabled", "true");
    btnSolverStep.removeAttribute("disabled");
    btnSolverAuto.removeAttribute("disabled");
    
    // Make secret selection static
    secretSetupSlots.forEach(s => s.classList.remove("is-clickable"));

    // Render Stats
    updateSolverStats(0, 1296, 0);
  }

  function solverNextStep() {
    if (!solverState || !solverState.running) return;

    const tStart = performance.now();
    const currentGuess = solverState.currentGuess;
    
    // Add to board UI
    renderGuessOnBoard(activeRow, currentGuess);

    // Get score (replicates C++ score call)
    const currentScore = engine.score(secretCode, currentGuess);
    historyGuesses.push(currentGuess);
    historyScores.push(scoreStr(currentScore));

    renderFeedback(activeRow, currentScore);

    // 1. Remove current guess from combinations and candidate solutions
    engine.removeCode(solverState.combinations, currentGuess);
    engine.removeCode(solverState.candidateSolutions, currentGuess);

    // Prune candidates that wouldn't give the same score response
    const prevCandidatesSize = solverState.candidateSolutions.length;
    solverState.candidateSolutions = solverState.candidateSolutions.filter(cand => {
      return engine.score(cand, currentGuess) === currentScore;
    });

    const currCandidatesSize = solverState.candidateSolutions.length;
    const prunedCount = prevCandidatesSize - currCandidatesSize;
    solverState.totalPruned = 1296 - currCandidatesSize;

    // Check terminal condition (replicates C++ terminate)
    if (currentScore === "@@@@") {
      const tEnd = performance.now();
      updateSolverStats(solverState.step, currCandidatesSize, tEnd - tStart);
      solverFinish(true);
      return;
    }

    if (activeRow >= maxRows - 1) {
      solverFinish(false);
      return;
    }

    // Pick next guess based on mode (Knuth's solver only now)
    if (solverState.mode === "knuth") {
      // Run the Minimax computation step
      const { minGuesses } = engine.calculateMinimaxGuesses(
        solverState.combinations, 
        solverState.candidateSolutions
      );
      
      // Choose next guess (replicates mastermind::pickGuess)
      solverState.currentGuess = engine.pickGuess(
        minGuesses, 
        solverState.candidateSolutions
      );
    }

    activeRow++;
    solverState.step++;

    const tEnd = performance.now();
    updateSolverStats(solverState.step - 1, currCandidatesSize, tEnd - tStart);
  }

  function scoreStr(s) {
    return s === "" ? "no pegs" : s;
  }

  function renderGuessOnBoard(row, guess) {
    const rowEl = document.getElementById(`row-${row}`);
    if (!rowEl) return;
    
    const pegs = rowEl.querySelectorAll(".mm-slots .mm-peg");
    pegs.forEach((peg, idx) => {
      peg.setAttribute("data-color", guess[idx]);
    });
  }

  function updateSolverStats(step, candidatesLeft, stepDurationMs) {
    statGuesses.textContent = step;
    statCandidates.textContent = `${candidatesLeft} / 1296`;
    
    const percentPruned = (((1296 - candidatesLeft) / 1296) * 100).toFixed(1);
    statPruned.textContent = `${percentPruned}%`;
    statTime.textContent = `${stepDurationMs.toFixed(1)} ms`;

    // Populate Candidates List
    candidatesScroll.innerHTML = "";
    if (candidatesLeft === 0) {
      candidatesScroll.innerHTML = `<span class="mm-cand-pill" style="border-color:var(--accent);">Code Found!</span>`;
      return;
    }

    // Display first 60 candidates to keep DOM light and visual
    const displayLimit = 60;
    const candidates = solverState.candidateSolutions;
    
    for (let i = 0; i < Math.min(candidates.length, displayLimit); i++) {
      const pill = document.createElement("span");
      pill.className = "mm-cand-pill";
      pill.textContent = candidates[i];
      candidatesScroll.appendChild(pill);
    }

    if (candidates.length > displayLimit) {
      const more = document.createElement("span");
      more.className = "mm-cand-pill";
      more.style.backgroundColor = "transparent";
      more.style.border = "none";
      more.textContent = `+ ${candidates.length - displayLimit} more`;
      candidatesScroll.appendChild(more);
    }
  }

  function solverFinish(success) {
    stopAutoPlay();
    solverState.running = false;
    isGameOver = true;
    revealSecretCode(secretCode);
    
    btnSolverStep.setAttribute("disabled", "true");
    btnSolverAuto.setAttribute("disabled", "true");
    btnSolverStop.setAttribute("disabled", "true");

    if (success) {
      showBanner(`Solver finished! Guessed the secret code in ${activeRow + 1} steps.`, "success");
    } else {
      showBanner("Solver failed: Exceeded maximum board rows!", "error");
    }
  }

  // Auto-play buttons
  btnStartSolver.addEventListener("click", initSolver);
  
  btnSolverStep.addEventListener("click", () => {
    solverNextStep();
  });

  btnSolverAuto.addEventListener("click", () => {
    btnSolverAuto.setAttribute("disabled", "true");
    btnSolverStop.removeAttribute("disabled");
    btnSolverStep.setAttribute("disabled", "true");
    
    autoPlayTimer = setInterval(() => {
      solverNextStep();
    }, autoPlaySpeed);
  });

  function stopAutoPlay() {
    if (autoPlayTimer) {
      clearInterval(autoPlayTimer);
      autoPlayTimer = null;
    }
    btnSolverStop.setAttribute("disabled", "true");
    if (solverState && solverState.running) {
      btnSolverAuto.removeAttribute("disabled");
      btnSolverStep.removeAttribute("disabled");
    }
  }

  btnSolverStop.addEventListener("click", stopAutoPlay);

  speedSlider.addEventListener("input", (e) => {
    autoPlaySpeed = parseInt(e.target.value);
    speedVal.textContent = `${(autoPlaySpeed / 1000).toFixed(1)}s`;
    
    // If playing, adjust interval on the fly
    if (autoPlayTimer) {
      stopAutoPlay();
      btnSolverAuto.click();
    }
  });

  // ───────────────────────────────
  // Code Reset
  // ───────────────────────────────

  function resetGame() {
    stopAutoPlay();
    hideBanner();
    isGameOver = false;
    activeRow = 0;
    userGuess = ["", "", "", ""];
    historyGuesses = [];
    historyScores = [];
    solverState = null;

    initBoard();
    shieldEl.classList.remove("is-revealed");
    shieldCoverText.innerHTML = `<span style="color:var(--accent);">●</span> SECRET SHIELDED`;

    // Clear stats
    statGuesses.textContent = "0";
    statCandidates.textContent = "1296 / 1296";
    statPruned.textContent = "0.0%";
    statTime.textContent = "0.0 ms";
    candidatesScroll.innerHTML = `<div style="color:var(--text-secondary); text-align:center; width:100%; font-size:var(--text-xs)">Solver not running</div>`;

    if (currentMode === "play") {
      secretCode = engine.createSecretCode();
      document.querySelectorAll(".mm-slots .mm-peg[data-row='0']").forEach(p => p.classList.add("is-clickable"));
      btnSubmit.setAttribute("disabled", "true");
      btnSubmit.classList.remove("btn--primary");
    } else {
      // Reset solver selections
      secretSetupCode = ["", "", "", ""];
      secretSetupSlots.forEach(s => {
        s.removeAttribute("data-color");
        s.classList.add("is-clickable");
      });
      btnStartSolver.setAttribute("disabled", "true");
      btnSolverStep.setAttribute("disabled", "true");
      btnSolverAuto.setAttribute("disabled", "true");
      btnSolverStop.setAttribute("disabled", "true");
    }

    updateRowVisuals();
  }

  btnReset.addEventListener("click", resetGame);

  // Initialize
  initBoard();
  setupPaletteSelection();
  resetGame();


  // ───────────────────────────────
  // C++ Code Tab Viewer Integration
  // ───────────────────────────────

  const cppFilePaths = {
    h: "./mastermind-cpp/mastermind.h",
    cpp: "./mastermind-cpp/mastermind.cpp",
    main: "./mastermind-cpp/main.cpp"
  };

  function highlightCPP(code) {
    return code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // comments
      .replace(/(\/\/.*)/g, '<span style="color: #75715e">$1</span>')
      .replace(/(\/\*[\s\S]*?\*\/)/g, '<span style="color: #75715e">$1</span>')
      // strings
      .replace(/("[^"]*")/g, '<span style="color: #e6db74">$1</span>')
      .replace(/('[^']')/g, '<span style="color: #e6db74">$1</span>')
      // keywords
      .replace(/\b(const|char|int|void|bool|class|public|private|static|explicit|return|if|else|do|while|for|using|namespace|std|vector|string|list|unordered_map|chrono|omp|pragma)\b/g, '<span style="color: #f92672">$1</span>')
      // preprocessor directives
      .replace(/(#include|#define|#ifndef|#endif)\b/g, '<span style="color: #a6e22e">$1</span>');
  }

  function loadCode(type) {
    tabH.classList.toggle("is-active", type === "h");
    tabCPP.classList.toggle("is-active", type === "cpp");
    tabMain.classList.toggle("is-active", type === "main");

    const filePath = cppFilePaths[type];
    codeDownload.setAttribute("href", filePath);
    codeDownload.setAttribute("download", filePath.split("/").pop());

    codePre.innerHTML = "Loading source file...";

    fetch(filePath)
      .then(res => {
        if (!res.ok) throw new Error("File not found");
        return res.text();
      })
      .then(text => {
        codePre.innerHTML = highlightCPP(text);
      })
      .catch(err => {
        codePre.innerHTML = `<span style="color:var(--accent)">Error loading code file: ${err.message}</span>`;
      });
  }

  tabH.addEventListener("click", () => loadCode("h"));
  tabCPP.addEventListener("click", () => loadCode("cpp"));
  tabMain.addEventListener("click", () => loadCode("main"));

  // Initial code load
  loadCode("cpp");
});
