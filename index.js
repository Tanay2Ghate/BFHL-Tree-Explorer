const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// ── YOUR CREDENTIALS (UPDATE THESE) ───────────────────────────────
const USER_ID = "yourname_ddmmyyyy";        // e.g. tanay_01012003
const EMAIL_ID = "your.email@srmist.edu.in";
const ROLL_NUMBER = "your_roll_number";
// ─────────────────────────────────────────────────────────────────

// Root route (fixes "Cannot GET /")
app.get("/", (req, res) => {
  res.send("BFHL API is running 🚀");
});

const VALID_EDGE = /^[A-Z]->[A-Z]$/;

// ── Parse & Validate ─────────────────────────────────────────────
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
      invalidEntries.push(raw);
      continue;
    }

    if (seenEdges.has(entry)) {
      if (!duplicateEdges.includes(entry)) {
        duplicateEdges.push(entry);
      }
    } else {
      seenEdges.add(entry);
      validEdges.push([parent, child]);
    }
  }

  return { invalidEntries, duplicateEdges, validEdges };
}

// ── Build Hierarchies ────────────────────────────────────────────
function buildHierarchies(validEdges) {
  const allNodes = new Set();
  const childrenMap = {};
  const parentOf = {};

  for (const [p, c] of validEdges) {
    allNodes.add(p);
    allNodes.add(c);

    if (!childrenMap[p]) childrenMap[p] = [];

    if (parentOf[c] === undefined) {
      parentOf[c] = p;
      childrenMap[p].push(c);
    }
  }

  // Find connected components
  const visited = new Set();
  const components = [];

  function dfsComponent(node, comp) {
    visited.add(node);
    comp.add(node);

    for (const c of childrenMap[node] || []) {
      if (!visited.has(c)) dfsComponent(c, comp);
    }

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
    const roots = [...comp].filter(
      (n) => parentOf[n] === undefined || !comp.has(parentOf[n])
    );

    function hasCycle(startNodes) {
      const color = {};
      let cycle = false;

      function dfs(n) {
        if (cycle) return;
        color[n] = 1;

        for (const c of childrenMap[n] || []) {
          if (!comp.has(c)) continue;
          if (color[c] === 1) {
            cycle = true;
            return;
          }
          if (!color[c]) dfs(c);
        }

        color[n] = 2;
      }

      for (const n of startNodes) {
        if (!color[n]) dfs(n);
      }

      return cycle;
    }

    const cycleDetected = hasCycle(roots.length ? roots : [...comp]);

    if (cycleDetected) {
      const root = [...comp].sort()[0];
      hierarchies.push({ root, tree: {}, has_cycle: true });
    } else {
      function buildTree(node) {
        const obj = {};
        for (const c of childrenMap[node] || []) {
          if (comp.has(c)) obj[c] = buildTree(c);
        }
        return obj;
      }

      function calcDepth(node) {
        const children = (childrenMap[node] || []).filter((c) =>
          comp.has(c)
        );
        if (!children.length) return 1;
        return 1 + Math.max(...children.map(calcDepth));
      }

      for (const root of roots) {
        const tree = { [root]: buildTree(root) };
        const depth = calcDepth(root);
        hierarchies.push({ root, tree, depth });
      }
    }
  }

  return hierarchies;
}

// ── Summary ──────────────────────────────────────────────────────
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

// ── API ROUTE ────────────────────────────────────────────────────
app.post("/bfhl", (req, res) => {
  const { data } = req.body;

  if (!Array.isArray(data)) {
    return res.status(400).json({ error: "data must be an array" });
  }

  const { invalidEntries, duplicateEdges, validEdges } = parseData(data);
  const hierarchies = buildHierarchies(validEdges);
  const summary = buildSummary(hierarchies);

  res.json({
    user_id: USER_ID,
    email_id: EMAIL_ID,
    college_roll_number: ROLL_NUMBER,
    hierarchies,
    invalid_entries: invalidEntries,
    duplicate_edges: duplicateEdges,
    summary,
  });
});

// ✅ IMPORTANT FOR VERCEL
module.exports = app;
