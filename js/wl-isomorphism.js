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
    "stacked-gon-growing": "<strong>Stacked Gons (Growing Parameter n)</strong>: G&#x2081; consists of two stacked (n+3)-gons while G&#x2082; consists of a stacked (n+4)-gon and (n+2)-gon. Both have 2n+4 vertices and identical degree sequences. Adjust the parameter <em>n</em> using the slider/number input below to see the graphs grow, and run the test to see how WL refinement takes exactly <em>n/2 iterations</em> to distinguish them.",
    "isomorphic-cycles-growing": "<strong>Isomorphic Cycles (Growing Vertices V)</strong>: Two identical cycle graphs of size V. Since they are isomorphic, the WL refinement partitions stabilize immediately in 1 step, and color classes never mismatch. Adjust the size V to see the graphs grow.",
    "nonisomorphic-trees": "<strong>Non-Isomorphic Trees (V = 10)</strong>: Two trees with 10 vertices and identical degree sequences (two degree-3 nodes, six degree-2 nodes, two leaves). They differ in where the branches connect along the spine. 1-WL splits the color classes at iteration 1, immediately proving non-isomorphism.",
    "custom": "<strong>Custom Editable Graph</strong>: Click empty space to add a node. Click a node to select it (pulses red), then click another node in the same graph to add/remove an edge. Press Backspace or Delete to delete a selected node. Drag nodes to position them."
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

  // Growing Mode Elements
  const growingControls = document.getElementById("growingControls");
  const inputRangeN = document.getElementById("inputRangeN");
  const inputNumberN = document.getElementById("inputNumberN");
  const growingParamLabel = document.getElementById("growingParamLabel");
  const growingVerticesCount = document.getElementById("growingVerticesCount");

  // Interaction variables for Custom editor
  let editMode = false; // True when 'custom' preset is active
  let selectedNode = null; // Node currently clicked
  let selectedGraphId = null; // "G1" or "G2"
  
  // Custom graph click-to-connect state
  let activeConnectSource = null; // Node currently selected for connecting
  let activeConnectGraphId = null; // "G1" or "G2"
  let dragStartPos = { x: 0, y: 0 };
  let hasMovedSignificant = false; // Track if user is dragging or just clicking
  let previewLineG1 = null;
  let previewLineG2 = null;

  const width = 450;
  const height = 400;

  function updatePreviewLine(mx, my) {
    const svgEl = activeConnectGraphId === "G1" ? svgG1 : svgG2;
    let previewLine = activeConnectGraphId === "G1" ? previewLineG1 : previewLineG2;
    
    if (!previewLine) {
      previewLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
      previewLine.setAttribute("class", "wl-preview-line");
      if (activeConnectGraphId === "G1") {
        previewLineG1 = previewLine;
      } else {
        previewLineG2 = previewLine;
      }
    }
    
    if (activeConnectSource) {
      previewLine.setAttribute("x1", activeConnectSource.x);
      previewLine.setAttribute("y1", activeConnectSource.y);
      previewLine.setAttribute("x2", mx);
      previewLine.setAttribute("y2", my);
      if (!previewLine.parentNode) {
        svgEl.appendChild(previewLine);
      }
    } else {
      if (previewLine.parentNode) {
        previewLine.parentNode.removeChild(previewLine);
      }
    }
  }

  function clearConnectSource() {
    if (activeConnectSource && activeConnectSource.circle) {
      activeConnectSource.circle.classList.remove("is-connect-source");
      activeConnectSource.circle.classList.remove("is-selected");
    }
    activeConnectSource = null;
    activeConnectGraphId = null;
    
    if (previewLineG1 && previewLineG1.parentNode) {
      previewLineG1.parentNode.removeChild(previewLineG1);
    }
    if (previewLineG2 && previewLineG2.parentNode) {
      previewLineG2.parentNode.removeChild(previewLineG2);
    }
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
    stopAutoplay();
    currentIteration = 0;
    iterationLabel.textContent = `Iteration ${currentIteration}`;
    hideBanner();
    clearLogs();
    
    selectedNode = null;
    selectedGraphId = null;
    clearConnectSource();
    
    customEditPanel.style.display = "none";
    growingControls.style.display = "none";
    editMode = false;
    isTerminated = false;
    
    colorMap = {};
    usedColorsCount = 0;

    // Set explanation text
    if (presetExplanation) {
      presetExplanation.innerHTML = presetExplanations[presetName] || "";
    }

    if (presetName === "stacked-gon-growing") {
      growingControls.style.display = "block";
      growingParamLabel.textContent = "Parameter n:";
      inputRangeN.min = 3;
      inputRangeN.max = 25;
      inputNumberN.min = 3;
      inputNumberN.max = 25;
      const val = parseInt(inputNumberN.value) || 4;
      inputRangeN.value = val;
      inputNumberN.value = val;
      updateGrowingCount();

      G1 = createStackedGonPreset(val, 1);
      G2 = createStackedGonPreset(val, 2);
      appendLog(`Loaded Stacked Gons (n=${val}, ${2 * val + 4} vertices) preset. Adjust n below to watch the graphs grow.`, true);
    } else if (presetName === "isomorphic-cycles-growing") {
      growingControls.style.display = "block";
      growingParamLabel.textContent = "Vertices V:";
      inputRangeN.min = 3;
      inputRangeN.max = 60;
      inputNumberN.min = 3;
      inputNumberN.max = 60;
      const val = parseInt(inputNumberN.value) || 8;
      inputRangeN.value = val;
      inputNumberN.value = val;
      updateGrowingCount();

      G1 = createIsomorphicCycles(val, true);
      G2 = createIsomorphicCycles(val, false);
      appendLog(`Loaded Isomorphic Cycles (V=${val}) preset. Adjust V below to watch the graphs grow.`, true);
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
      appendLog("Loaded Custom graph layout. Click empty space to add a node; click a node to select it, then click another node to draw/remove an edge.", true);
    }

    g1NodeCount.textContent = `${G1.vertices.length} nodes`;
    g2NodeCount.textContent = `${G2.vertices.length} nodes`;

    // Compute degrees for initial labels
    computeInitialDegrees(G1);
    computeInitialDegrees(G2);
    
    // Create actual SVG DOM elements
    createSVGNodes(G1, svgG1, "G1");
    createSVGNodes(G2, svgG2, "G2");
    
    updateSVGPositions(G1, "G1");
    updateSVGPositions(G2, "G2");
    
    // Draw initial color partitioning table
    updatePartitionList();
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
      // Rotate Graph 1 slightly relative to Graph 2 so they don't overlay exactly
      if (shuffleLayout) {
        angle += Math.PI / V;
      }
      vertices.push({
        id: i,
        label: 0,
        x: cx + R * Math.cos(angle),
        y: cy + R * Math.sin(angle),
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

    const startX = 50;
    const endX = 400;
    const ySpine = cy + 40;
    const yBranch = cy - 60;

    for (let i = 0; i < 10; i++) {
      let x, y;
      if (i < 8) {
        // Spine nodes: 0 to 7
        x = startX + i * ((endX - startX) / 7);
        y = ySpine;
      } else if (i === 8) {
        // Branch 1
        const spineAttachedIndex = type === 1 ? 1 : 2;
        x = startX + spineAttachedIndex * ((endX - startX) / 7);
        y = yBranch;
      } else if (i === 9) {
        // Branch 2
        const spineAttachedIndex = type === 1 ? 6 : 5;
        x = startX + spineAttachedIndex * ((endX - startX) / 7);
        y = yBranch;
      }

      vertices.push({
        id: i,
        label: 0,
        x: x,
        y: y,
        vx: 0,
        vy: 0,
        isDragging: false
      });
    }

    // Spine edges
    for (let i = 0; i < 7; i++) {
      edges.push({ source: i, target: i + 1 });
    }

    if (type === 1) {
      edges.push({ source: 1, target: 8 });
      edges.push({ source: 6, target: 9 });
    } else {
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
      if (vG1.circle) vG1.circle.style.fill = vG1.color;

      vG2.label = hash2;
      vG2.color = getLabelColor(hash2);
      if (vG2.circle) vG2.circle.style.fill = vG2.color;

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
      circle.style.fill = v.color;

      // Click and Drag event triggers
      circle.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        v.isDragging = true;
        selectedNode = v;
        selectedGraphId = graphId;
        dragStartPos = { x: e.clientX, y: e.clientY };
        hasMovedSignificant = false;
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

        if (activeConnectSource && activeConnectSource.id === v.id && activeConnectGraphId === graphId) {
          v.circle.classList.add("is-connect-source");
        } else {
          v.circle.classList.remove("is-connect-source");
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

  // Drag and click-to-connect mouse handlers
  document.addEventListener("mousemove", (e) => {
    if (selectedNode && selectedNode.isDragging) {
      const bounds = selectedGraphId === "G1" ? canvasG1El.getBoundingClientRect() : canvasG2El.getBoundingClientRect();
      const nx = e.clientX - bounds.left;
      const ny = e.clientY - bounds.top;
      
      const dx = e.clientX - dragStartPos.x;
      const dy = e.clientY - dragStartPos.y;
      if (Math.sqrt(dx*dx + dy*dy) > 5) {
        hasMovedSignificant = true;
      }
      
      selectedNode.x = Math.max(15, Math.min(width - 15, nx));
      selectedNode.y = Math.max(15, Math.min(height - 15, ny));
      
      // Update coordinates dynamically (no physics loop)
      updateSVGPositions(selectedGraphId === "G1" ? G1 : G2, selectedGraphId);
    }
    
    // Update active connect preview line
    if (editMode && activeConnectSource) {
      const bounds = activeConnectGraphId === "G1" ? canvasG1El.getBoundingClientRect() : canvasG2El.getBoundingClientRect();
      const mx = e.clientX - bounds.left;
      const my = e.clientY - bounds.top;
      updatePreviewLine(mx, my);
    }
  });

  document.addEventListener("mouseup", (e) => {
    if (selectedNode) {
      selectedNode.isDragging = false;
      const targetGraphId = selectedGraphId;
      
      // Handle click logic (minimal movement)
      if (editMode && !hasMovedSignificant) {
        if (activeConnectSource && activeConnectGraphId === targetGraphId) {
          if (activeConnectSource.id === selectedNode.id) {
            // Clicked same node again -> toggle off
            clearConnectSource();
          } else {
            // Clicked a different node in the same graph -> connect them
            const graph = targetGraphId === "G1" ? G1 : G2;
            const sourceNode = activeConnectSource;
            const targetNode = selectedNode;
            
            // Check if edge already exists
            const exists = graph.edges.some(edge => 
              (edge.source === sourceNode.id && edge.target === targetNode.id) ||
              (edge.source === targetNode.id && edge.target === sourceNode.id)
            );
            
            if (!exists) {
              graph.edges.push({ source: sourceNode.id, target: targetNode.id });
              appendLog(`Created edge between ${sourceNode.id} and ${targetNode.id} in ${targetGraphId}.`);
            } else {
              // Toggle edge: delete if already exists
              graph.edges = graph.edges.filter(edge => 
                !((edge.source === sourceNode.id && edge.target === targetNode.id) ||
                  (edge.source === targetNode.id && edge.target === sourceNode.id))
              );
              appendLog(`Removed edge between ${sourceNode.id} and ${targetNode.id} in ${targetGraphId}.`);
            }
            
            // Recompute counts and degrees
            g1NodeCount.textContent = `${G1.vertices.length} nodes`;
            g2NodeCount.textContent = `${G2.vertices.length} nodes`;
            computeInitialDegrees(G1);
            computeInitialDegrees(G2);
            updatePartitionList();
            
            // Recreate DOM nodes with new edge
            createSVGNodes(graph, targetGraphId === "G1" ? svgG1 : svgG2, targetGraphId);
            clearConnectSource();
          }
        } else {
          // Select as source
          activeConnectSource = selectedNode;
          activeConnectGraphId = targetGraphId;
          updateSVGPositions(targetGraphId === "G1" ? G1 : G2, targetGraphId);
          appendLog(`Selected Node ${activeConnectSource.id} (G${targetGraphId === "G1" ? "1" : "2"}). Click another node to connect/disconnect them.`);
        }
      }
      
      selectedNode = null;
      selectedGraphId = null;
    } else {
      // Clicked outside on background/empty space -> clear selection
      if (editMode && e.target && (e.target.tagName === "svg" || e.target.id === "wlLayout" || e.target.className === "wl-canvas")) {
        clearConnectSource();
      }
    }
  });

  // Custom node placement clicks (only on empty background)
  canvasG1El.addEventListener("click", (e) => {
    if (!editMode) return;
    if (e.target !== svgG1) return; // Must click empty SVG background
    
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
    updateSVGPositions(G1, "G1");
    clearConnectSource();
  });

  canvasG2El.addEventListener("click", (e) => {
    if (!editMode) return;
    if (e.target !== svgG2) return; // Must click empty SVG background
    
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
    updateSVGPositions(G2, "G2");
    clearConnectSource();
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
    if (isAutoPlaying) {
      stopAutoplay();
      return;
    }
    // If the test already ended, auto-reset first then start playing
    if (isTerminated) {
      loadPreset(presetSelect.value);
    }
    startAutoplay();
  });

  btnReset.addEventListener("click", () => {
    stopAutoplay();
    loadPreset(presetSelect.value);
  });

  presetSelect.addEventListener("change", (e) => {
    loadPreset(e.target.value);
  });


  function updateGrowingCount() {
    const val = parseInt(inputNumberN.value) || 3;
    const preset = presetSelect.value;
    if (preset === "stacked-gon-growing") {
      const vCount = 2 * val + 4;
      growingVerticesCount.textContent = `Total vertices: ${vCount}`;
    } else if (preset === "isomorphic-cycles-growing") {
      growingVerticesCount.textContent = `Total vertices: ${val}`;
    }
  }

  function handleGrowingParamChange(val) {
    inputRangeN.value = val;
    inputNumberN.value = val;
    updateGrowingCount();
    
    const preset = presetSelect.value;
    if (preset === "stacked-gon-growing") {
      G1 = createStackedGonPreset(val, 1);
      G2 = createStackedGonPreset(val, 2);
      appendLog(`Regenerated Stacked Gons with n = ${val} (${2 * val + 4} vertices).`, true);
    } else if (preset === "isomorphic-cycles-growing") {
      G1 = createIsomorphicCycles(val, true);
      G2 = createIsomorphicCycles(val, false);
      appendLog(`Regenerated Isomorphic Cycles with V = ${val} vertices.`, true);
    }
    
    // Reset iteration state
    currentIteration = 0;
    iterationLabel.textContent = `Iteration ${currentIteration}`;
    hideBanner();
    isTerminated = false;
    colorMap = {};
    usedColorsCount = 0;
    
    g1NodeCount.textContent = `${G1.vertices.length} nodes`;
    g2NodeCount.textContent = `${G2.vertices.length} nodes`;
    computeInitialDegrees(G1);
    computeInitialDegrees(G2);
    createSVGNodes(G1, svgG1, "G1");
    createSVGNodes(G2, svgG2, "G2");
    updateSVGPositions(G1, "G1");
    updateSVGPositions(G2, "G2");
    updatePartitionList();
  }

  inputRangeN.addEventListener("input", (e) => {
    handleGrowingParamChange(parseInt(e.target.value));
  });

  inputNumberN.addEventListener("change", (e) => {
    let val = parseInt(e.target.value) || 3;
    const min = parseInt(e.target.min);
    const max = parseInt(e.target.max);
    if (val < min) val = min;
    if (val > max) val = max;
    handleGrowingParamChange(val);
  });

  btnClearG1.addEventListener("click", () => {
    G1 = { vertices: [], edges: [] };
    g1NodeCount.textContent = "0 nodes";
    computeInitialDegrees(G1);
    updatePartitionList();
    createSVGNodes(G1, svgG1, "G1");
    updateSVGPositions(G1, "G1");
    clearConnectSource();
  });

  btnClearG2.addEventListener("click", () => {
    G2 = { vertices: [], edges: [] };
    g2NodeCount.textContent = "0 nodes";
    computeInitialDegrees(G2);
    updatePartitionList();
    createSVGNodes(G2, svgG2, "G2");
    updateSVGPositions(G2, "G2");
    clearConnectSource();
  });

  // Initialize page load
  loadPreset("stacked-gon-growing");
});
