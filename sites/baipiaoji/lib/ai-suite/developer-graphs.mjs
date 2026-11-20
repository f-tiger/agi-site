import { define, string, requireValue as check, json, record } from './developer-common.mjs';

const graph = string(
  'graph',
  '有向邻接表 JSON',
  'Directed adjacency map (JSON)',
  '{"ui":["api","db"],"api":["db"],"db":[],"docs":[]}',
  6000,
  (text) => {
    const raw = json(text);
    check(record(raw), 'Enter a JSON adjacency object.');
    const g = new Map();
    function add(node) {
      check(
        typeof node === 'string' && node.length > 0 && node.length <= 40,
        'Use node names of 1 to 40 characters.',
      );
      if (!g.has(node)) g.set(node, new Set());
    }
    for (const [node, targets] of Object.entries(raw)) {
      add(node);
      check(Array.isArray(targets), 'Each node must have a list of adjacent names.');
      for (const next of targets) {
        add(next);
        g.get(node).add(next);
      }
    }
    check(
      g.size > 0 && g.size <= 40 && edgeList(g).length <= 180,
      'Use 1 to 40 nodes and at most 180 distinct edges.',
    );
    return g;
  },
);
const start = string('start', '起点名称', 'Start node', 'ui', 40);
const end = string('end', '终点名称', 'End node', 'db', 40);
function edgeList(g) {
  return [...g].flatMap(([a, ns]) => [...ns].map((b) => [a, b]));
}
function reverse(g, both = false) {
  const r = new Map([...g.keys()].map((n) => [n, new Set()]));
  for (const [a, b] of edgeList(g)) {
    r.get(b).add(a);
    if (both) r.get(a).add(b);
  }
  return r;
}
function bfs(g, start, excluded) {
  check(g.has(start), 'Node does not exist.');
  const queue = [start],
    dist = new Map([[start, 0]]),
    parent = new Map();
  for (let i = 0; i < queue.length; i++) {
    const a = queue[i];
    for (const b of g.get(a)) {
      if (dist.has(b) || excluded?.(a, b)) continue;
      dist.set(b, dist.get(a) + 1);
      parent.set(b, a);
      queue.push(b);
    }
  }
  return { dist, parent };
}
function islands(g, omit = null) {
  const groups = [],
    seen = new Set(omit === null ? [] : [omit]);
  for (const node of g.keys()) {
    if (seen.has(node)) continue;
    const group = [...bfs(g, node, (a, b) => b === omit).dist.keys()];
    for (const n of group) seen.add(n);
    groups.push(group);
  }
  return groups;
}
function layers(g) {
  const incoming = reverse(g),
    remaining = new Map([...incoming].map(([n, ns]) => [n, ns.size]));
  const result = [];
  let wave = [...remaining.keys()].filter((n) => !remaining.get(n));
  while (wave.length) {
    result.push(wave);
    const next = [];
    for (const a of wave)
      for (const b of g.get(a)) {
        remaining.set(b, remaining.get(b) - 1);
        if (!remaining.get(b)) next.push(b);
      }
    wave = next;
  }
  check(result.flat().length === g.size, 'This operation requires an acyclic directed graph.');
  return result;
}
function cycle(g) {
  const done = new Set(),
    active = new Set(),
    stack = [];
  function visit(n) {
    if (active.has(n)) return [...stack.slice(stack.indexOf(n)), n];
    if (done.has(n)) return null;
    active.add(n);
    stack.push(n);
    for (const b of g.get(n)) {
      const found = visit(b);
      if (found) return found;
    }
    stack.pop();
    active.delete(n);
    done.add(n);
    return null;
  }
  for (const n of g.keys()) {
    const found = visit(n);
    if (found) return found;
  }
  return null;
}
function partition(g) {
  const colors = new Map();
  for (const n of g.keys()) {
    if (colors.has(n)) continue;
    const q = [n];
    colors.set(n, 0);
    for (let i = 0; i < q.length; i++)
      for (const b of g.get(q[i])) {
        if (colors.get(b) === colors.get(q[i])) return { bipartite: false, conflict: [q[i], b] };
        if (!colors.has(b)) {
          colors.set(b, 1 - colors.get(q[i]));
          q.push(b);
        }
      }
  }
  return { bipartite: true, groups: [0, 1].map((c) => [...colors.keys()].filter((n) => colors.get(n) === c)) };
}
const graphExamples = {
  'cycle-witness': '{"ui":["api"],"api":["db"],"db":["api"]}',
  'strong-components': '{"ui":["api"],"api":["db"],"db":["api"]}',
  'bridge-links': '{"ui":["api"],"api":["db","docs"]}',
  'cut-vertices': '{"ui":["api"],"api":["db","docs"]}',
  'finite-diameter': '{"ui":["api"],"api":["db"],"db":["store"]}',
  'euler-trail': '{"ui":["api"],"api":["db"],"db":["ui","docs"]}',
  'shared-targets': '{"ui":["api","store"],"db":["store","docs"]}',
};
const d = (id, zh, en, desc, info, fn, extra = []) => {
  const input = graphExamples[id] ? { ...graph, sample: graphExamples[id] } : graph;
  return define('graph-' + id, zh, en, desc, info, [input, ...extra], fn);
};
export const tools = [
  d(
    'edge-list',
    '邻接表转边列表',
    'Adjacency map to edge list',
    '将有向邻接表整理成唯一边和完整节点列表。',
    'Export unique directed pairs and the full node list, including isolated nodes.',
    (g) => ({ nodes: [...g.keys()], edges: edgeList(g) }),
  ),
  d(
    'reverse-links',
    '反转有向依赖',
    'Reverse directed links',
    '交换边的起终点并保留孤立节点。',
    'Reverse every directed link while preserving isolated nodes.',
    (g) => ({ reversed: Object.fromEntries([...reverse(g)].map(([k, v]) => [k, [...v]])) }),
  ),
  d(
    'degree-profile',
    '有向节点度数',
    'Directed node degrees',
    '逐个节点报告入度、出度和直接自环。',
    'Count inbound and outbound links and identify direct self-loops for each node.',
    (g) => {
      const r = reverse(g);
      return {
        degrees: [...g].map(([node, ns]) => ({
          node,
          inbound: r.get(node).size,
          outbound: ns.size,
          selfLoop: ns.has(node),
        })),
      };
    },
  ),
  d(
    'weak-components',
    '弱连通分组',
    'Weakly connected groups',
    '将连边视为无向后找出互不相连的节点组。',
    'Find disconnected components while treating links as undirected.',
    (g) => ({ groups: islands(reverse(g, true)) }),
  ),
  d(
    'strong-components',
    '强连通分组',
    'Strongly connected groups',
    '找出在有向图中可以相互到达的节点。',
    'Partition nodes by mutual reachability along directed edges.',
    (g) => {
      const r = reverse(g),
        seen = new Set(),
        groups = [];
      for (const n of g.keys()) {
        if (seen.has(n)) continue;
        const backward = bfs(r, n).dist;
        const group = [...bfs(g, n).dist.keys()].filter((b) => backward.has(b));
        group.forEach((b) => seen.add(b));
        groups.push(group);
      }
      return { groups };
    },
  ),
  d(
    'topological-waves',
    '有向图拓扑分层',
    'Topological waves',
    '按入度归零的顺序把无环图分为若干可并行层级。',
    'Group a directed acyclic graph into successive zero-indegree waves.',
    (g) => ({ waves: layers(g) }),
  ),
  d(
    'cycle-witness',
    '定位有向环',
    'Locate a directed cycle',
    '返回构成一个闭合有向环的具体节点顺序。',
    'Return a sequence of nodes forming one directed cycle, when present.',
    (g) => ({ cycle: cycle(g) }),
  ),
  d(
    'minimum-hops',
    '最少跳数路径',
    'Minimum-hop route',
    '返回两点间最短有向路径和边数。',
    'Find a shortest directed path between two nodes and count its hops.',
    (g, a, b) => {
      check(g.has(b), 'End node does not exist.');
      const { dist, parent } = bfs(g, a);
      if (!dist.has(b)) return { path: [], hops: null };
      let n = b;
      const path = [n];
      while (n !== a) {
        n = parent.get(n);
        path.push(n);
      }
      return { path: path.reverse(), hops: dist.get(b) };
    },
    [start, end],
  ),
  d(
    'reachability-index',
    '节点可达索引',
    'Reachability index',
    '列出每个节点能够间接或直接到达的其他节点。',
    'List the other nodes each node reaches over one or more directed links.',
    (g) => ({
      reachable: Object.fromEntries(
        [...g.keys()].map((n) => [n, [...bfs(g, n).dist.keys()].filter((k) => k !== n)]),
      ),
    }),
  ),
  d(
    'transitive-reduction',
    '精简冗余有向边',
    'Reduce transitive links',
    '在无环图中移除已有替代路径的边并保留可达性。',
    'Remove edges with alternate routes while preserving reachability in a directed acyclic graph.',
    (g) => {
      layers(g);
      const retained = [],
        redundant = [];
      for (const [a, b] of edgeList(g))
        (bfs(g, a, (x, y) => x === a && y === b).dist.has(b) ? redundant : retained).push([a, b]);
      return { retained, redundant };
    },
  ),
  d(
    'bipartition',
    '检验节点二分组',
    'Test a graph bipartition',
    '忽略方向并尝试将相邻节点划入不同的两组。',
    'Treat links as undirected and attempt to assign opposite groups to neighbors.',
    (g) => partition(reverse(g, true)),
  ),
  d(
    'edge-density',
    '有向边密度',
    'Directed edge density',
    '排除自环并比较实际边数与所有有序节点对的数量。',
    'Compare distinct nonloop edges with the number of possible ordered pairs.',
    (g) => {
      const possible = g.size * (g.size - 1),
        actual = edgeList(g).filter(([a, b]) => a !== b).length;
      return { possible, actual, density: possible ? actual / possible : 0 };
    },
  ),
  d(
    'euler-trail',
    '有向边遍历可行性',
    'Directed Euler trail feasibility',
    '通过连通性和度数判断能否连续经过每条有向边一次。',
    'Use connectivity and degree balances to determine if a directed trail can traverse each edge once.',
    (g) => {
      const r = reverse(g),
        u = reverse(g, true),
        used = [...g.keys()].filter((n) => u.get(n).size);
      const delta = used.map((n) => g.get(n).size - r.get(n).size);
      const connected = !used.length || bfs(u, used[0]).dist.size === used.length;
      const circuit = delta.every((v) => v === 0);
      const open =
        delta.filter((v) => v === 1).length === 1 &&
        delta.filter((v) => v === -1).length === 1 &&
        delta.every((v) => Math.abs(v) <= 1);
      return {
        possible: connected && (circuit || open),
        form: connected && circuit ? 'circuit' : connected && open ? 'open' : 'none',
      };
    },
  ),
  d(
    'boundary-nodes',
    '识别源点和汇点',
    'Identify graph boundaries',
    '区分只有出边的源点、只有入边的汇点和孤立节点。',
    'Separate sources, sinks and isolated nodes in a directed graph.',
    (g) => {
      const r = reverse(g),
        groups = { sources: [], sinks: [], isolated: [] };
      for (const [n, adj] of g) {
        if (!adj.size && !r.get(n).size) groups.isolated.push(n);
        else if (!adj.size) groups.sinks.push(n);
        else if (!r.get(n).size) groups.sources.push(n);
      }
      return groups;
    },
  ),
  d(
    'acyclic-route-count',
    '统计无环图路径',
    'Count routes in a DAG',
    '统计起点到终点的所有有向路径，以字符串返回精确整数。',
    'Count every directed route between two nodes of an acyclic graph as an exact integer string.',
    (g, a, b) => {
      check(g.has(a) && g.has(b), 'Unknown endpoint.');
      const counts = new Map([[a, 1n]]);
      for (const n of layers(g).flat())
        for (const k of g.get(n)) counts.set(k, (counts.get(k) || 0n) + (counts.get(n) || 0n));
      return { paths: String(counts.get(b) || 0n) };
    },
    [start, end],
  ),
  d(
    'finite-diameter',
    '有向图可达直径',
    'Directed reachable diameter',
    '找出所有可达节点对中最远的最短路径距离。',
    'Find the longest shortest distance over reachable directed pairs.',
    (g) => {
      let hops = 0,
        endpoints = [];
      for (const a of g.keys())
        for (const [b, h] of bfs(g, a).dist)
          if (h > hops) {
            hops = h;
            endpoints = [a, b];
          }
      return { hops, endpoints };
    },
  ),
  d(
    'bridge-links',
    '识别无向桥边',
    'Find undirected bridges',
    '忽略方向，找出删除后会使连通分量增多的边。',
    'Ignore direction and identify links whose deletion disconnects a component.',
    (g) => {
      const u = reverse(g, true);
      const links = edgeList(u).filter(
        ([a, b]) => a < b && !bfs(u, a, (x, y) => (x === a && y === b) || (x === b && y === a)).dist.has(b),
      );
      return { bridges: links };
    },
  ),
  d(
    'cut-vertices',
    '识别无向割点',
    'Find articulation vertices',
    '忽略方向，找出删除后连通分量增多的节点。',
    'Ignore direction and find vertices whose removal increases the component count.',
    (g) => {
      const u = reverse(g, true),
        baseline = islands(u).length;
      return { cutVertices: [...u.keys()].filter((n) => islands(u, n).length > baseline) };
    },
  ),
  d(
    'shared-targets',
    '比较直接下游',
    'Compare immediate successors',
    '比较两个节点的直接后继，并列出共同和独有的后继。',
    'Compare two nodes by shared and exclusive immediate successors.',
    (g, a, b) => {
      check(g.has(a) && g.has(b), 'Unknown node.');
      const x = g.get(a),
        y = g.get(b);
      return {
        common: [...x].filter((k) => y.has(k)),
        onlyFirst: [...x].filter((k) => !y.has(k)),
        onlySecond: [...y].filter((k) => !x.has(k)),
      };
    },
    [start, end],
  ),
  d(
    'upstream-impact',
    '追踪上游影响',
    'Trace upstream impact',
    '按最短距离列出能沿有向边到达目标的所有上游节点。',
    'Find nodes that can reach a target, with their shortest upstream distances.',
    (g, target) => ({
      upstream: [...bfs(reverse(g), target).dist]
        .filter(([n]) => n !== target)
        .map(([node, hops]) => ({ node, hops })),
    }),
    [end],
  ),
];
