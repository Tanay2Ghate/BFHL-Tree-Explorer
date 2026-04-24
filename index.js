const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// ── YOUR CREDENTIALS ──────────────────────────────────────────────
const USER_ID = "johndoe_17091999";        // change to fullname_ddmmyyyy
const EMAIL_ID = "john.doe@srmist.edu.in"; // change to your college email
const ROLL_NUMBER = "RA2111003010001";      // change to your roll number
// ─────────────────────────────────────────────────────────────────

const VALID_EDGE = /^[A-Z]->[A-Z]$/;

function parseData(data) {
  const invalidEntries = [];
  const duplicateEdges = [];
  const seenEdges = new Set();
  const validEdges = [];

  for (let raw of data) {
    const entry = typeof raw === "string" ? raw.trim() : String(raw).trim();

    if (!VALID_EDGE.test(entry)) {
      invalidEntries.push(raw);
      continue;
    }

    const [parent, child] = entry.split("->");
    if (parent === child) {
      // self-loop → invalid
      invalidEntries.push(raw);
      continue;
    }

    if (seenEdges.has(entry)) {
      if (!duplicateEdges.includes(entry)) duplicateEdges.push(entry);
    } else {
      seenEdges.add(entry);
      validEdges.push([parent, child]);
    }
  }

  return { invalidEntries, duplicateEdges, validEdges };
}

function buildHierarchies(validEdges) {
  // Collect all nodes
  const allNodes = new Set();
  const childrenMap = {}; // parent -> [child, ...]
  const parentOf = {};    // child -> parent (first-wins for multi-parent)

  for (const [p, c] of validEdges) {
    allNodes.add(p);
    allNodes.add(c);
    if (!childrenMap[p]) childrenMap[p] = [];

    if (parentOf[c] === undefined) {
      // first parent wins
      parentOf[c] = p;
      childrenMap[p].push(c);
    }
    // subsequent parent edges for same child are silently discarded
  }

  // Find connected components (undirected)
  const visited = new Set();
  const components = [];

  function dfsComponent(node, comp) {
    visited.add(node);
    comp.add(node);
    const children = childrenMap[node] || [];
    for (const c of children) {
      if (!visited.has(c)) dfsComponent(c, comp);
    }
    // also walk "up" if this node is a child
    const parent = parentOf[node];
    if (parent && !visited.has(parent)) dfsComponent(parent, comp);
  }

  for (const node of allNodes) {
    if (!visited.has(node)) {
      const comp = new Set();
      dfsComponent(node, comp);
      components.push(comp);
    }
  }

  const hierarchies = [];

  for (const comp of components) {
    // Find root(s): nodes in comp that are never a child in comp
    const roots = [...comp].filter((n) => parentOf[n] === undefined || !comp.has(parentOf[n]));

    // Detect cycle using DFS
    function hasCycle(startNodes) {
      const color = {}; // 0=white,1=gray,2=black
      let cycleFound = false;

      function dfs(n) {
        if (cycleFound) return;
        color[n] = 1;
        for (const c of childrenMap[n] || []) {
          if (!comp.has(c)) continue;
          if (color[c] === 1) { cycleFound = true; return; }
          if (!color[c]) dfs(c);
        }
        color[n] = 2;
      }

      for (const n of startNodes) {
        if (!color[n]) dfs(n);
      }
      return cycleFound;
    }

    const cycleDetected = hasCycle(roots.length ? roots : [...comp]);

    if (cycleDetected) {
      // Pure cycle: use lex smallest node as root
      const root = [...comp].sort()[0];
      hierarchies.push({ root, tree: {}, has_cycle: true });
    } else {
      // Build nested tree
      function buildTree(node) {
        const obj = {};
        for (const c of childrenMap[node] || []) {
          if (comp.has(c)) obj[c] = buildTree(c);
        }
        return obj;
      }

      function calcDepth(node) {
        const children = childrenMap[node] || [];
        if (children.length === 0) return 1;
        return 1 + Math.max(...children.filter(c => comp.has(c)).map(calcDepth));
      }

      // There should be exactly one root per non-cyclic tree
      // (multiple roots means disconnected — shouldn't happen here, but handle gracefully)
      for (const root of roots) {
        const tree = { [root]: buildTree(root) };
        const depth = calcDepth(root);
        hierarchies.push({ root, tree, depth });
      }
    }
  }

  return hierarchies;
}

function buildSummary(hierarchies) {
  const nonCyclic = hierarchies.filter((h) => !h.has_cycle);
  const cyclic = hierarchies.filter((h) => h.has_cycle);

  let largestRoot = "";
  let maxDepth = -1;

  for (const h of nonCyclic) {
    if (
      h.depth > maxDepth ||
      (h.depth === maxDepth && h.root < largestRoot)
    ) {
      maxDepth = h.depth;
      largestRoot = h.root;
    }
  }

  return {
    total_trees: nonCyclic.length,
    total_cycles: cyclic.length,
    largest_tree_root: largestRoot,
  };
}

app.post("/bfhl", (req, res) => {
  const { data } = req.body;

  if (!Array.isArray(data)) {
    return res.status(400).json({ error: "data must be an array" });
  }

  const { invalidEntries, duplicateEdges, validEdges } = parseData(data);
  const hierarchies = buildHierarchies(validEdges);
  const summary = buildSummary(hierarchies);

  return res.json({
    user_id: USER_ID,
    email_id: EMAIL_ID,
    college_roll_number: ROLL_NUMBER,
    hierarchies,
    invalid_entries: invalidEntries,
    duplicate_edges: duplicateEdges,
    summary,
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
