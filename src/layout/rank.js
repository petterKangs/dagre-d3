dagre.layout.rank = function() {
  // External configuration
  var
    // Level 1: log time spent
    debugLevel = 0;

  var self = {};

  self.debugLevel = function(x) {
    if (!arguments.length) return debugLevel;
    debugLevel = x;
    return self;
  }

  self.run = function(g) {
    var timer = createTimer();

    initRank(g);
    components(g).forEach(function(cmpt) {
      var subgraph = g.subgraph(cmpt);
      feasibleTree(subgraph);
      normalize(subgraph);
    });

    if (debugLevel >= 1) {
      console.log("Rank phase time: " + timer.elapsedString());
    }
  };

  return self;

  function initRank(g) {
    var minRank = {};
    var pq = priorityQueue();

    g.nodes().forEach(function(u) {
      pq.add(u, g.inEdges(u).length);
      minRank[u] = 0;
    });

    while (pq.size() > 0) {
      var minId = pq.min();
      if (pq.priority(minId) > 0) {
        throw new Error("Input graph is not acyclic: " + g.toString());
      }
      pq.removeMin();

      var rank = minRank[minId];
      g.node(minId).rank = rank;

      g.outEdges(minId).forEach(function(e) {
        var target = g.target(e);
        minRank[target] = Math.max(minRank[target], rank + (g.edge(e).minLen || 1));
        pq.decrease(target, pq.priority(target) - 1);
      });
    }
  }

  function feasibleTree(g) {
    // Precompute minimum lengths for each directed edge
    var minLen = {};
    g.edges().forEach(function(e) {
      var id = incidenceId(g.source(e), g.target(e));
      minLen[id] = Math.max(minLen[id] || 1, g.edge(e).minLen || 1);
    });

    var tree = dagre.util.prim(g, function(u, v) {
      return Math.abs(g.node(u).rank - g.node(v).rank) - minLen[incidenceId(u, v)];
    });

    var visited = {};
    function dfs(u, rank) {
      visited[u] = true;
      g.node(u).rank = rank;

      tree[u].forEach(function(v) {
        if (!(v in visited)) {
          var delta = minLen[incidenceId(u, v)];
          dfs(v, rank + (g.edges(u, v).length ? delta : -delta));
        }
      });
    }

    dfs(g.nodes()[0], 0);

    return tree;
  }

  function normalize(g) {
    var m = min(g.nodes().map(function(u) { return g.node(u).rank; }));
    g.nodes().forEach(function(u) { g.node(u).rank -= m; });
  }

  /*
   * This id can be used to group (in an undirected manner) multi-edges
   * incident on the same two nodes.
   */
  function incidenceId(u, v) {
    return u < v ?  u.length + ":" + u + "-" + v : v.length + ":" + v + "-" + u;
  }
}
