/* ============================================================
   Weisfeiler-Leman Graph Isomorphism Test Visualizer Logic
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  // Presets and State
  let G1 = { vertices: [], edges: [] };
  let G2 = { vertices: [], edges: [] };
  
  let currentIteration = 0;
  let isAutoPlaying = false;
  let autoplayTimer = null;
  let autoplaySpeed = 1000; // ms
  let isTerminated = false;
  
  let colorMap = {}; // Maps stringified multisets to deterministic color index
  let usedColorsCount = 0;

  // Explanations for each preset
  const presetExplanations = {
    "stacked-gon-4": "<strong>Stacked Gons (n = 4)</strong>: Two stacked 7-gons ($G_1$) vs. a stacked 8-gon and a 6-gon ($G_2$). They are non-isomorphic but share the same degree sequences. 1-WL refinement distinguishes them in exactly 2 steps ($n/2$ iterations).",
    "stacked-gon-10": "<strong>Stacked Gons (n = 10)</strong>: Two stacked 13-gons ($G_1$) vs. a stacked 14-gon and a 12-gon ($G_2$). Larger stacked gons whose color refinement partitions split after exactly 5 iterations ($n/2$ steps).",
    "isomorphic-cycles": "<strong>Isomorphic Cycles (V = 8)</strong>: Two identical 8-vertex cycles. Since they are isomorphic, their color partitions stabilize immediately on iteration 0 and stay identical forever.",
    "nonisomorphic-trees": "<strong>Non-Isomorphic Trees (V = 10)</strong>: Two trees with identical degree sequences but different branching layouts. The colors will split at iteration 1, immediately showing they are non-isomorphic.",
    "custom": "<strong>Custom Editable Graph</strong>: Add vertices by clicking on empty canvas space. Drag-link from one node to another to create edges. Press backspace/delete to remove selected nodes."
  };

  // Premium HSL color scheme palette for different color partitions
  const partitionColors = [
    "hsl(220, 80%, 55%)",  // Premium blue
    "hsl(0, 75%, 55%)",    // Premium red
    "hsl(140, 70%, 45%)",  // Premium green
    "hsl(40, 90%, 50%)",   // Warm orange
    "hsl(280, 70%, 55%)",  // Deep purple
    "hsl(180, 75%, 40%)",  // Teal
    "hsl(320, 80%, 55%)",  // Vibrant pink
    "hsl(80, 75%, 45%)",   // Olive/Lime
    "hsl(20, 85%, 50%)",   // Coral
    "hsl(250, 75%, 55%)",  // Indigo
    "hsl(100, 75%, 40%)",  // Grass green
    "hsl(340, 80%, 50%)"   // Crimson
  ];

  // Helper to map multiset to color
  function getLabelColor(labelVal) {
    if (colorMap[labelVal] === undefined) {
      colorMap[labelVal] = usedColorsCount++;
    }
    const idx = colorMap[labelVal];
    // If we exceed predefined palette, generate a deterministic hue
    if (idx < partitionColors.length) {
      return partitionColors[idx];
    } else {
      const hue = (idx * 137) % 360; // Golden ratio spacing
      return `hsl(${hue}, 80%, 50%)`;
    }
  }

  // DOM Elements
  const presetSelect = document.getElementById("presetSelect");
  const presetExplanation = document.getElementById("presetExplanation");
  const btnStep = document.getElementById("btnStep");
  const btnPlay = document.getElementById("btnPlay");
  const btnReset = document.getElementById("btnReset");
  const speedSlider = document.getElementById("speedSlider");
  const speedLabel = document.getElementById("speedLabel");
  
  const wlBanner = document.getElementById("wlBanner");
  const iterationLabel = document.getElementById("iterationLabel");
  const partitionList = document.getElementById("partitionList");
  const logConsole = document.getElementById("logConsole");
  
  const svgG1 = document.getElementById("svgG1");
  const svgG2 = document.getElementById("svgG2");
  
  const canvasG1El = document.getElementById("canvasG1");
  const canvasG2El = document.getElementById("canvasG2");
  
  const customEditPanel = document.getElementById("customEditPanel");
  const btnClearG1 = document.getElementById("btnClearG1");
  const btnClearG2 = document.getElementById("btnClearG2");

  const g1NodeCount = document.getElementById("g1NodeCount");
  const g2NodeCount = document.getElementById("g2NodeCount");
  
  const wlTooltip = document.getElementById("wlTooltip");

  // Interaction variables for Custom editor
  let editMode = false; // True when 'custom' preset is active
  let selectedNode = null; // Node currently clicked
  let selectedGraphId = null; // "G1" or "G2"
  let edgeDrawingStartNode = null; // Node from which click-drag edge starts

  // Simple Physics Force Layout Engine
  let animFrameId = null;
  const width = 450;
  const height = 400;

  function runPhysicsLoop() {
    updatePhysics(G1);
    updatePhysics(G2);
    updateSVGPositions(G1, "G1");
    updateSVGPositions(G2, "G2");
    animFrameId = requestAnimationFrame(runPhysicsLoop);
  }

  function updatePhysics(graph) {
    const k_spring = 0.04;
    const l_rest = 75;
    const c_repulsion = 1200;
    const k_gravity = 0.015;
    const cx = width / 2;
    const cy = height / 2;

    const nodes = graph.vertices;
    const edges = graph.edges;

    // Reset forces
    nodes.forEach(n => {
      n.fx = 0;
      n.fy = 0;
    });

    // 1. Repulsion between all pairs
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        if (dist < 220) {
          const force = c_repulsion / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          
          nodes[i].fx -= fx;
          nodes[i].fy -= fy;
          nodes[j].fx += fx;
          nodes[j].fy += fy;
        }
      }
    }

    // 2. Attraction along edges
    edges.forEach(e => {
      const u = nodes.find(n => n.id === e.source);
      const v = nodes.find(n => n.id === e.target);
      if (u && v) {
        const dx = v.x - u.x;
        const dy = v.y - u.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = k_spring * (dist - l_rest);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        
        u.fx += fx;
        u.fy += fy;
        v.fx -= fx;
        v.fy -= fy;
      }
    });

    // 3. Gravity pulling toward center + update positions
    nodes.forEach(n => {
      if (n.isDragging) return; // Keep stationary while dragging

      n.fx += (cx - n.x) * k_gravity;
      n.fy += (cy - n.y) * k_gravity;

      // Damp velocities
      n.vx = (n.vx + n.fx) * 0.82;
      n.vy = (n.vy + n.fy) * 0.82;

      n.x += n.vx;
      n.y += n.vy;

      // Boundaries clamp
      n.x = Math.max(25, Math.min(width - 25, n.x));
      n.y = Math.max(25, Math.min(height - 25, n.y));
    });
  }

  // ───────────────────────────────
  // Presets Layout Computations
  // ───────────────────────────────

  function createStackedGonPreset(n, graphType) {
    const V = 2 * n + 4;
    const vertices = [];
    const edges = [];
    const R = 150;
    const cx = width / 2;
    const cy = height / 2;

    // Lay out nodes in a clean circle
    for (let i = 0; i < V; i++) {
      const angle = (2 * Math.PI * i) / V - Math.PI / 2;
      vertices.push({
        id: i,
        label: 0,
        x: cx + R * Math.cos(angle),
        y: cy + R * Math.sin(angle),
        vx: 0,
        vy: 0,
        isDragging: false
      });
      // Outer ring edges
      edges.push({ source: i, target: (i + 1) % V });
    }

    // Add Stacked Gon dividing chords
    if (graphType === 1) {
      // TWO stacked (n+3)-gons
      const gon = n + 3;
      const intersection1 = Math.floor((gon - 1) / 2);
      const intersection2 = intersection1 + gon - 1;
      edges.push({ source: intersection1, target: intersection2 });
    } else {
      // Stacked (n+4)-gon and (n+2)-gon
      const gon1 = n + 4;
      const gon2 = n + 2;
      const intersection1 = Math.floor((gon1 - 1) / 2);
      const intersection2 = intersection1 + gon2 - 1;
      edges.push({ source: intersection1, target: intersection2 });
    }

    return { vertices, edges };
  }

  function loadPreset(presetName) {
    cancelAnimationFrame(animFrameId);
    stopAutoplay();
    currentIteration = 0;
    iterationLabel.textContent = `Iteration ${currentIteration}`;
    hideBanner();
    clearLogs();
    
    selectedNode = null;
    selectedGraphId = null;
    edgeDrawingStartNode = null;
    customEditPanel.style.display = "none";
    editMode = false;
    isTerminated = false;
    
    colorMap = {};
    usedColorsCount = 0;

    // Set explanation text
    if (presetExplanation) {
      presetExplanation.innerHTML = presetExplanations[presetName] || "";
    }

    if (presetName === "stacked-gon-4") {
      G1 = createStackedGonPreset(4, 1); // 2 stacked 7-gons (V=12)
      G2 = createStackedGonPreset(4, 2); // Stacked 8-gon & 6-gon (V=12)
      appendLog("Loaded Stacked Gons (n=4, 12 vertices) preset.", true);
      appendLog("Distinguishing them requires exactly 2 iterations of 1-WL refinement.");
    } else if (presetName === "stacked-gon-10") {
      G1 = createStackedGonPreset(10, 1); // 2 stacked 13-gons (V=24)
      G2 = createStackedGonPreset(10, 2); // Stacked 14-gon & 12-gon (V=24)
      appendLog("Loaded Stacked Gons (n=10, 24 vertices) preset.", true);
      appendLog("Distinguishing them requires exactly 5 iterations of 1-WL refinement.");
    } else if (presetName === "isomorphic-cycles") {
      G1 = createIsomorphicCycles(8, true);
      G2 = createIsomorphicCycles(8, false);
      appendLog("Loaded Isomorphic 8-Cycle preset.", true);
      appendLog("Both graphs are isomorphic; the refinement partitions will remain identical.");
    } else if (presetName === "nonisomorphic-trees") {
      G1 = createNonIsomorphicTree(1);
      G2 = createNonIsomorphicTree(2);
      appendLog("Loaded Non-Isomorphic Trees preset.", true);
      appendLog("Both trees have matching degree sequences but will split color classes at iteration 1.");
    } else if (presetName === "custom") {
      G1 = { vertices: [], edges: [] };
      G2 = { vertices: [], edges: [] };
      editMode = true;
      customEditPanel.style.display = "block";
      appendLog("Loaded Custom graph layout. Click to add nodes; drag-link to add edges.", true);
    }

    g1NodeCount.textContent = `${G1.vertices.length} nodes`;
    g2NodeCount.textContent = `${G2.vertices.length} nodes`;

    // Compute degrees for initial labels
    computeInitialDegrees(G1);
    computeInitialDegrees(G2);
    
    // Create actual SVG DOM elements
    createSVGNodes(G1, svgG1, "G1");
    createSVGNodes(G2, svgG2, "G2");
    
    // Draw initial color partitioning table
    updatePartitionList();
    runPhysicsLoop();
  }

  function computeInitialDegrees(graph) {
    const degrees = {};
    graph.vertices.forEach(v => {
      degrees[v.id] = 0;
    });
    graph.edges.forEach(e => {
      if (degrees[e.source] !== undefined) degrees[e.source]++;
      if (degrees[e.target] !== undefined) degrees[e.target]++;
    });
    graph.vertices.forEach(v => {
      v.label = degrees[v.id];
      v.color = getLabelColor(v.label);
    });
  }

  function createIsomorphicCycles(V, shuffleLayout) {
    const vertices = [];
    const edges = [];
    const R = 130;
    const cx = width / 2;
    const cy = height / 2;

    for (let i = 0; i < V; i++) {
      let angle = (2 * Math.PI * i) / V - Math.PI / 2;
      // If shuffleLayout is active, slightly offset angles so they don't look exactly identical
      if (shuffleLayout) {
        angle += Math.PI / 6;
      }
      vertices.push({
        id: i,
        label: 0,
        x: cx + R * Math.cos(angle) + (Math.random() - 0.5) * 20,
        y: cy + R * Math.sin(angle) + (Math.random() - 0.5) * 20,
        vx: 0,
        vy: 0,
        isDragging: false
      });
      edges.push({ source: i, target: (i + 1) % V });
    }
    return { vertices, edges };
  }

  function createNonIsomorphicTree(type) {
    const vertices = [];
    const edges = [];
    const cx = width / 2;
    const cy = height / 2;

    // Both trees have 10 nodes, with degrees sequence: 3, 3, 2, 2, 2, 2, 2, 2, 1, 1 (degree checks won't distinguish them)
    for (let i = 0; i < 10; i++) {
      vertices.push({
        id: i,
        label: 0,
        x: cx + (Math.random() - 0.5) * 160,
        y: cy + (Math.random() - 0.5) * 160,
        vx: 0,
        vy: 0,
        isDragging: false
      });
    }

    if (type === 1) {
      // Tree 1 construction
      edges.push({ source: 0, target: 1 });
      edges.push({ source: 1, target: 2 });
      edges.push({ source: 2, target: 3 });
      edges.push({ source: 3, target: 4 });
      edges.push({ source: 4, target: 5 });
      edges.push({ source: 5, target: 6 });
      edges.push({ source: 6, target: 7 });
      // Branch chords
      edges.push({ source: 1, target: 8 });
      edges.push({ source: 6, target: 9 });
    } else {
      // Tree 2 construction (different branching points)
      edges.push({ source: 0, target: 1 });
      edges.push({ source: 1, target: 2 });
      edges.push({ source: 2, target: 3 });
      edges.push({ source: 3, target: 4 });
      edges.push({ source: 4, target: 5 });
      edges.push({ source: 5, target: 6 });
      edges.push({ source: 6, target: 7 });
      // Different chords
      edges.push({ source: 2, target: 8 });
      edges.push({ source: 5, target: 9 });
    }

    return { vertices, edges };
  }

  // ───────────────────────────────
  // Weisfeiler-Lehman Refinement Algorithm
  // ───────────────────────────────

  function runWLIteration() {
    if (isTerminated) {
      appendLog("WL Test has already finished. Please click 'Reset' or choose a new preset to run again.", true);
      stopAutoplay();
      return;
    }

    if (G1.vertices.length !== G2.vertices.length) {
      showBanner("Refinement Blocked: Vertices count mismatch. Graphs cannot be isomorphic.", "error");
      appendLog("WL Test failed: Graph sizes do not match.", true);
      isTerminated = true;
      stopAutoplay();
      return;
    }

    currentIteration++;
    iterationLabel.textContent = `Iteration ${currentIteration}`;

    const n = G1.vertices.length;

    // Multisets mapping
    const newLabelsG1 = Array.from({ length: n }, () => []);
    const newLabelsG2 = Array.from({ length: n }, () => []);

    // Helper to find neighbor labels
    function getNeighborsLabels(graph, vId, labels) {
      const list = [];
      graph.edges.forEach(e => {
        if (e.source === vId) {
          list.push(labels[e.target]);
        } else if (e.target === vId) {
          list.push(labels[e.source]);
        }
      });
      return list;
    }

    // Extract current labels
    const currentLabelsG1 = {};
    const currentLabelsG2 = {};
    G1.vertices.forEach(v => { currentLabelsG1[v.id] = v.label; });
    G2.vertices.forEach(v => { currentLabelsG2[v.id] = v.label; });

    // Aggregate neighbor labels + original label
    for (let i = 0; i < n; i++) {
      const vG1 = G1.vertices[i];
      const vG2 = G2.vertices[i];

      // G1
      const neighborsG1 = getNeighborsLabels(G1, vG1.id, currentLabelsG1);
      neighborsG1.push(vG1.label);
      neighborsG1.sort((a, b) => a - b);
      newLabelsG1[i] = neighborsG1;

      // G2
      const neighborsG2 = getNeighborsLabels(G2, vG2.id, currentLabelsG2);
      neighborsG2.push(vG2.label);
      neighborsG2.sort((a, b) => a - b);
      newLabelsG2[i] = neighborsG2;
    }

    let labelsChanged = false;
    const nextLabelsG1 = [];
    const nextLabelsG2 = [];

    // Assign new color hashes and update labels
    for (let i = 0; i < n; i++) {
      const multisetStrG1 = newLabelsG1[i].join(",");
      const multisetStrG2 = newLabelsG2[i].join(",");

      // Basic string hash function to produce numerical labels (matching C++ std::hash)
      const hash1 = stringHash(multisetStrG1);
      const hash2 = stringHash(multisetStrG2);

      const vG1 = G1.vertices[i];
      const vG2 = G2.vertices[i];

      // Save multiset string for interactive hover tooltip representation
      vG1.multiset = multisetStrG1;
      vG2.multiset = multisetStrG2;

      if (vG1.label !== hash1 || vG2.label !== hash2) {
        labelsChanged = true;
      }

      vG1.label = hash1;
      vG1.color = getLabelColor(hash1);
      if (vG1.circle) vG1.circle.setAttribute("fill", vG1.color);

      vG2.label = hash2;
      vG2.color = getLabelColor(hash2);
      if (vG2.circle) vG2.circle.setAttribute("fill", vG2.color);

      nextLabelsG1.push(hash1);
      nextLabelsG2.push(hash2);
    }

    // Sort to compare color distributions
    const sortedG1 = [...nextLabelsG1].sort((a, b) => a - b);
    const sortedG2 = [...nextLabelsG2].sort((a, b) => a - b);

    let match = true;
    for (let i = 0; i < n; i++) {
      if (sortedG1[i] !== sortedG2[i]) {
        match = false;
        break;
      }
    }

    updatePartitionList();

    if (!match) {
      // Color sets mismatch -> NON-ISOMORPHIC
      showBanner(`Iteration ${currentIteration}: Partition mismatch detected! Graphs are NOT isomorphic.`, "error");
      appendLog(`Iteration ${currentIteration}: Color partitions do not match. Graphs are NOT isomorphic!`, true);
      isTerminated = true;
      stopAutoplay();
    } else if (!labelsChanged) {
      // Color partitions stabilized -> ISOMORPHIC (Test passed)
      showBanner(`Iteration ${currentIteration}: Partitioning stabilized. Graphs are likely isomorphic!`, "success");
      appendLog(`Iteration ${currentIteration}: Color groups stabilized. WL test passed!`, true);
      isTerminated = true;
      stopAutoplay();
    } else {
      // Color sets still match, refinement continues
      appendLog(`Iteration ${currentIteration}: Refined colors match. Continuing...`);
    }
  }

  // Simple string hashing function (similar to std::hash<string>)
  function stringHash(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 33) ^ str.charCodeAt(i);
    }
    return Math.abs(hash);
  }

  // ───────────────────────────────
  // UI Rendering & Interactivity
  // ───────────────────────────────

  function createSVGNodes(graph, svgEl, graphId) {
    svgEl.innerHTML = "";
    
    // 1. Draw edges
    graph.edges.forEach(e => {
      const u = graph.vertices.find(n => n.id === e.source);
      const v = graph.vertices.find(n => n.id === e.target);
      if (u && v) {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", u.x);
        line.setAttribute("y1", u.y);
        line.setAttribute("x2", v.x);
        line.setAttribute("y2", v.y);
        line.setAttribute("class", "wl-edge");
        svgEl.appendChild(line);
        e.element = line;
      }
    });

    // 2. Draw nodes
    graph.vertices.forEach(v => {
      const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
      
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", v.x);
      circle.setAttribute("cy", v.y);
      circle.setAttribute("r", 15);
      circle.setAttribute("class", "wl-node");
      circle.setAttribute("fill", v.color);

      // Physics drag-and-drop actions
      circle.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        v.isDragging = true;
        selectedNode = v;
        selectedGraphId = graphId;
        edgeDrawingStartNode = v; // Setup clicked connection point
      });

      // Hover overlay aggregation tooltip
      circle.addEventListener("mouseenter", (e) => {
        showTooltip(v, e, graph, graphId);
      });
      circle.addEventListener("mouseleave", () => {
        hideTooltip();
      });

      // Append text degree labels
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", v.x);
      text.setAttribute("y", v.y);
      text.setAttribute("class", "wl-node-text");
      text.textContent = v.id;

      group.appendChild(circle);
      group.appendChild(text);
      svgEl.appendChild(group);

      v.circle = circle;
      v.text = text;
      v.element = group;
    });
  }

  function updateSVGPositions(graph, graphId) {
    // Update lines
    graph.edges.forEach(e => {
      const u = graph.vertices.find(n => n.id === e.source);
      const v = graph.vertices.find(n => n.id === e.target);
      if (u && v && e.element) {
        e.element.setAttribute("x1", u.x);
        e.element.setAttribute("y1", u.y);
        e.element.setAttribute("x2", v.x);
        e.element.setAttribute("y2", v.y);
        
        // Highlight active connections during node hovers
        if (selectedNode && selectedGraphId === graphId && (u.id === selectedNode.id || v.id === selectedNode.id)) {
          e.element.classList.add("is-highlighted");
        } else {
          e.element.classList.remove("is-highlighted");
        }
      }
    });

    // Update nodes
    graph.vertices.forEach(v => {
      if (v.circle && v.text) {
        v.circle.setAttribute("cx", v.x);
        v.circle.setAttribute("cy", v.y);
        v.text.setAttribute("x", v.x);
        v.text.setAttribute("y", v.y);

        if (selectedNode && selectedNode.id === v.id && selectedGraphId === graphId) {
          v.circle.classList.add("is-selected");
        } else {
          v.circle.classList.remove("is-selected");
        }
      }
    });
  }

  // Draw partition lists in right side panel
  function updatePartitionList() {
    partitionList.innerHTML = "";
    
    // Group vertices by their current colors for G1 and G2
    const groupsG1 = {};
    const groupsG2 = {};
    
    G1.vertices.forEach(v => {
      if (!groupsG1[v.color]) groupsG1[v.color] = [];
      groupsG1[v.color].push(v.id);
    });

    G2.vertices.forEach(v => {
      if (!groupsG2[v.color]) groupsG2[v.color] = [];
      groupsG2[v.color].push(v.id);
    });

    // Merge partition views for comparison
    const allColors = new Set([...Object.keys(groupsG1), ...Object.keys(groupsG2)]);
    
    allColors.forEach(color => {
      const groupEl = document.createElement("div");
      groupEl.className = "wl-partition-group";
      
      const header = document.createElement("div");
      header.className = "wl-partition-color-header";
      header.innerHTML = `
        <div class="wl-color-dot" style="background-color: ${color}"></div>
        <span>Color Group</span>
      `;
      groupEl.appendChild(header);

      const nodesContainer = document.createElement("div");
      nodesContainer.className = "wl-partition-nodes";

      // G1 partition nodes
      const nodesG1 = groupsG1[color] || [];
      const nodesG2 = groupsG2[color] || [];

      let html = `<span style="font-size:10px; color:var(--text-secondary); width:100%">G₁: </span>`;
      if (nodesG1.length > 0) {
        nodesG1.forEach(id => {
          html += `<span class="wl-partition-node-pill">${id}</span>`;
        });
      } else {
        html += `<span style="font-size:10px; opacity:0.5">none</span>`;
      }

      html += `<span style="font-size:10px; color:var(--text-secondary); width:100%; margin-top:2px; display:block;">G₂: </span>`;
      if (nodesG2.length > 0) {
        nodesG2.forEach(id => {
          html += `<span class="wl-partition-node-pill">${id}</span>`;
        });
      } else {
        html += `<span style="font-size:10px; opacity:0.5">none</span>`;
      }

      nodesContainer.innerHTML = html;
      groupEl.appendChild(nodesContainer);
      partitionList.appendChild(groupEl);
    });
  }

  // Interactive Hover tooltip details
  function showTooltip(node, event, graph, graphId) {
    wlTooltip.style.display = "block";
    wlTooltip.style.left = `${event.pageX + 15}px`;
    wlTooltip.style.top = `${event.pageY + 15}px`;

    // Calculate degree
    let deg = 0;
    const neighbors = [];
    graph.edges.forEach(e => {
      if (e.source === node.id) {
        const targetNode = graph.vertices.find(n => n.id === e.target);
        if (targetNode) {
          neighbors.push(targetNode);
          deg++;
        }
      } else if (e.target === node.id) {
        const sourceNode = graph.vertices.find(n => n.id === e.source);
        if (sourceNode) {
          neighbors.push(sourceNode);
          deg++;
        }
      }
    });

    let neighborsColorList = neighbors.map(n => n.label).sort((a,b)=>a-b).join(", ");
    if (!neighborsColorList) neighborsColorList = "none";

    let html = `
      <h5>Node ${node.id} (${graphId})</h5>
      <div><strong>Degree:</strong> ${deg}</div>
      <div><strong>Current Hash Label:</strong> <span style="font-family:var(--font-mono); font-size:10px;">${node.label}</span></div>
      <div style="margin-top:5px; border-top:1px dashed rgba(255,255,255,0.15); padding-top:4px;">
        <strong>Refinement Multiset:</strong>
        <div class="wl-tooltip-multiset">{ ${node.label} | ${neighborsColorList} }</div>
      </div>
    `;

    wlTooltip.innerHTML = html;
  }

  // Hide tooltip
  function hideTooltip() {
    wlTooltip.style.display = "none";
  }

  // Drag physics events
  document.addEventListener("mousemove", (e) => {
    if (selectedNode && selectedNode.isDragging) {
      const bounds = selectedGraphId === "G1" ? canvasG1El.getBoundingClientRect() : canvasG2El.getBoundingClientRect();
      selectedNode.x = e.clientX - bounds.left;
      selectedNode.y = e.clientY - bounds.top;
      
      // Clamp bounds
      selectedNode.x = Math.max(25, Math.min(width - 25, selectedNode.x));
      selectedNode.y = Math.max(25, Math.min(height - 25, selectedNode.y));
    }
  });

  document.addEventListener("mouseup", (e) => {
    if (selectedNode) {
      selectedNode.isDragging = false;
      
      // If we are in custom edit mode, handle mouseup edge creation
      if (editMode && edgeDrawingStartNode) {
        const targetGraphId = selectedGraphId;
        const bounds = targetGraphId === "G1" ? canvasG1El.getBoundingClientRect() : canvasG2El.getBoundingClientRect();
        const mx = e.clientX - bounds.left;
        const my = e.clientY - bounds.top;
        
        // Find if user mouseup landed on another node
        const graph = targetGraphId === "G1" ? G1 : G2;
        const targetNode = graph.vertices.find(n => {
          if (n.id === edgeDrawingStartNode.id) return false;
          const dx = n.x - mx;
          const dy = n.y - my;
          return Math.sqrt(dx*dx + dy*dy) < 25; // Landed nearby
        });

        if (targetNode) {
          // Verify edge doesn't already exist
          const exists = graph.edges.some(edge => 
            (edge.source === edgeDrawingStartNode.id && edge.target === targetNode.id) ||
            (edge.source === targetNode.id && edge.target === edgeDrawingStartNode.id)
          );

          if (!exists) {
            graph.edges.push({ source: edgeDrawingStartNode.id, target: targetNode.id });
            appendLog(`Created edge between ${edgeDrawingStartNode.id} and ${targetNode.id} in ${targetGraphId}.`);
            
            // Recompute counts and degrees
            g1NodeCount.textContent = `${G1.vertices.length} nodes`;
            g2NodeCount.textContent = `${G2.vertices.length} nodes`;
            computeInitialDegrees(G1);
            computeInitialDegrees(G2);
            updatePartitionList();
            
            // Recreate DOM nodes with new edge
            createSVGNodes(graph, targetGraphId === "G1" ? svgG1 : svgG2, targetGraphId);
          }
        }
      }
      
      selectedNode = null;
      selectedGraphId = null;
      edgeDrawingStartNode = null;
    }
  });

  // Custom node placement clicks
  canvasG1El.addEventListener("click", (e) => {
    if (!editMode) return;
    if (e.target !== svgG1 && e.target.tagName === "circle") return; // didn't click background space
    
    // Add node
    const bounds = canvasG1El.getBoundingClientRect();
    const nx = e.clientX - bounds.left;
    const ny = e.clientY - bounds.top;

    const nextId = G1.vertices.length > 0 ? Math.max(...G1.vertices.map(v => v.id)) + 1 : 0;
    G1.vertices.push({
      id: nextId,
      label: 0,
      x: nx,
      y: ny,
      vx: 0,
      vy: 0,
      isDragging: false
    });
    
    appendLog(`Added node ${nextId} to Graph 1.`);
    g1NodeCount.textContent = `${G1.vertices.length} nodes`;
    computeInitialDegrees(G1);
    updatePartitionList();
    createSVGNodes(G1, svgG1, "G1");
  });

  canvasG2El.addEventListener("click", (e) => {
    if (!editMode) return;
    if (e.target !== svgG2 && e.target.tagName === "circle") return;
    
    // Add node
    const bounds = canvasG2El.getBoundingClientRect();
    const nx = e.clientX - bounds.left;
    const ny = e.clientY - bounds.top;

    const nextId = G2.vertices.length > 0 ? Math.max(...G2.vertices.map(v => v.id)) + 1 : 0;
    G2.vertices.push({
      id: nextId,
      label: 0,
      x: nx,
      y: ny,
      vx: 0,
      vy: 0,
      isDragging: false
    });
    
    appendLog(`Added node ${nextId} to Graph 2.`);
    g2NodeCount.textContent = `${G2.vertices.length} nodes`;
    computeInitialDegrees(G2);
    updatePartitionList();
    createSVGNodes(G2, svgG2, "G2");
  });

  // Keyboard deletes for custom editor
  document.addEventListener("keydown", (e) => {
    if (!editMode || !selectedNode) return;
    if (e.key === "Backspace" || e.key === "Delete") {
      const graph = selectedGraphId === "G1" ? G1 : G2;
      const nodeId = selectedNode.id;
      
      // Remove node
      graph.vertices = graph.vertices.filter(v => v.id !== nodeId);
      
      // Remove connected edges
      graph.edges = graph.edges.filter(edge => edge.source !== nodeId && edge.target !== nodeId);
      
      appendLog(`Deleted node ${nodeId} from ${selectedGraphId}.`);
      
      g1NodeCount.textContent = `${G1.vertices.length} nodes`;
      g2NodeCount.textContent = `${G2.vertices.length} nodes`;
      computeInitialDegrees(G1);
      computeInitialDegrees(G2);
      updatePartitionList();
      createSVGNodes(graph, selectedGraphId === "G1" ? svgG1 : svgG2, selectedGraphId);
      
      selectedNode = null;
      selectedGraphId = null;
    }
  });

  // ───────────────────────────────
  // Logger & Banners
  // ───────────────────────────────

  function appendLog(message, isImportant = false) {
    const item = document.createElement("div");
    item.className = `wl-log-item${isImportant ? " is-important" : ""}`;
    item.textContent = message;
    logConsole.appendChild(item);
    logConsole.scrollTop = logConsole.scrollHeight;
  }

  function clearLogs() {
    logConsole.innerHTML = "";
  }

  function showBanner(message, type = "info") {
    wlBanner.textContent = message;
    wlBanner.className = `wl-banner is-${type}`;
  }

  function hideBanner() {
    wlBanner.textContent = "";
    wlBanner.className = "wl-banner";
  }

  // ───────────────────────────────
  // Auto Refinement Autoplay Loops
  // ───────────────────────────────

  function startAutoplay() {
    isAutoPlaying = true;
    btnPlay.textContent = "Pause";
    btnPlay.classList.add("btn--primary");
    autoplayTimer = setInterval(runWLIteration, autoplaySpeed);
  }

  function stopAutoplay() {
    isAutoPlaying = false;
    btnPlay.textContent = "Auto Play";
    btnPlay.classList.remove("btn--primary");
    clearInterval(autoplayTimer);
  }

  // ───────────────────────────────
  // Controls wiring
  // ───────────────────────────────

  btnStep.addEventListener("click", () => {
    if (isTerminated) {
      appendLog("WL Test has already finished. Please click 'Reset' or choose a new preset to run again.", true);
      return;
    }
    stopAutoplay();
    runWLIteration();
  });

  btnPlay.addEventListener("click", () => {
    if (isTerminated) {
      appendLog("WL Test has already finished. Please click 'Reset' or choose a new preset to run again.", true);
      return;
    }
    if (isAutoPlaying) {
      stopAutoplay();
    } else {
      startAutoplay();
    }
  });

  btnReset.addEventListener("click", () => {
    stopAutoplay();
    loadPreset(presetSelect.value);
  });

  presetSelect.addEventListener("change", (e) => {
    loadPreset(e.target.value);
  });

  speedSlider.addEventListener("input", (e) => {
    autoplaySpeed = parseInt(e.target.value);
    speedLabel.textContent = `${autoplaySpeed}ms`;
    if (isAutoPlaying) {
      stopAutoplay();
      startAutoplay();
    }
  });

  btnClearG1.addEventListener("click", () => {
    G1 = { vertices: [], edges: [] };
    g1NodeCount.textContent = "0 nodes";
    computeInitialDegrees(G1);
    updatePartitionList();
    createSVGNodes(G1, svgG1, "G1");
  });

  btnClearG2.addEventListener("click", () => {
    G2 = { vertices: [], edges: [] };
    g2NodeCount.textContent = "0 nodes";
    computeInitialDegrees(G2);
    updatePartitionList();
    createSVGNodes(G2, svgG2, "G2");
  });

  // Initialize page load
  loadPreset("stacked-gon-4");
});
