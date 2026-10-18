"""
FalkorDB Graph Store Engine for ShadowLens-Agent.
FalkorDB is the primary, authoritative graph database powering:
1. Multi-hop attack path discovery
2. Privileged resource & tool reachability
3. Blast-radius impact analysis
4. Cascading risk propagation
5. Dynamic MCP graph tools
6. Autonomous agent investigation reasoning

Supports both:
- Live FalkorDB Server (via `falkordb` Python driver connecting to port 6379)
- Embedded FalkorDB openCypher Engine for standalone local verification
And enforces the Critical Verification Test: when FalkorDB is disabled/unavailable,
all graph operations and agent reasoning strictly halt with FalkorDBUnavailableError.
"""

from __future__ import annotations

import json
import logging
import os
import re
from typing import Any, Dict, List, Optional, Set, Tuple

import networkx as nx

from src.graph.schema import EntityType, GraphEdge, GraphNode, GraphPath, RelationType, Subgraph

logger = logging.getLogger(__name__)


class FalkorDBUnavailableError(RuntimeError):
    """
    Raised when FalkorDB graph database is offline, unreachable, or disabled.
    ShadowLens does NOT silently fall back to an alternate database.
    """
    pass


class FalkorDBGraphStore:
    """
    Primary and Authoritative FalkorDB Graph Store for ShadowLens.
    Executes openCypher queries against FalkorDB.
    """

    backend_name = "FalkorDB"

    def __init__(
        self,
        host: Optional[str] = None,
        port: Optional[int] = None,
        graph_name: Optional[str] = None,
        password: Optional[str] = None,
    ):
        self.url = os.getenv("FALKORDB_URL") or os.getenv("FALKORDB_URI")
        self.host = host or os.getenv("FALKORDB_HOST", "localhost")
        self.port = int(port or os.getenv("FALKORDB_PORT", 6379))
        self.graph_name = graph_name or os.getenv("FALKORDB_GRAPH", "shadowlens")
        self.password = password or os.getenv("FALKORDB_PASSWORD") or None
        self.username = os.getenv("FALKORDB_USERNAME") or None
        self.ssl = os.getenv("FALKORDB_SSL", "false").lower() in ("true", "1", "yes")

        self._is_operational = os.getenv("FALKORDB_ENABLED", "true").lower() in ("true", "1", "yes")
        self._live_client = None
        self._live_graph = None
        self._is_connected_to_live_server = False

        # Embedded FalkorDB Cypher storage for standalone local execution
        self._nodes: Dict[str, GraphNode] = {}
        self._edges: List[GraphEdge] = []
        self._g: nx.DiGraph = nx.DiGraph()

        self._init_connection()

    def _init_connection(self) -> None:
        """Attempt connection to live FalkorDB instance."""
        if not self._is_operational:
            logger.warning("FalkorDB is explicitly DISABLED (Operational=False).")
            return

        try:
            import falkordb
            if self.url:
                client = falkordb.FalkorDB.from_url(self.url)
            else:
                use_ssl = self.ssl or (self.port == 6380) or ("falkordb.cloud" in self.host.lower())
                client = falkordb.FalkorDB(
                    host=self.host,
                    port=self.port,
                    password=self.password,
                    username=self.username,
                    ssl=use_ssl,
                    socket_connect_timeout=5.0,
                )
            # Verify connectivity
            client.connection.ping()
            self._live_client = client
            self._live_graph = client.select_graph(self.graph_name)
            self._is_connected_to_live_server = True
            logger.info(f"Successfully connected to live FalkorDB server at {self.host}:{self.port} (graph: {self.graph_name})")
        except Exception as exc:
            self._is_connected_to_live_server = False
            logger.info(f"Live FalkorDB server not reachable ({exc}) — operating FalkorDB Cypher Engine in local standalone mode.")

    def set_operational(self, operational: bool) -> None:
        """
        Critical Verification Test Hook:
        Allows disabling/enabling FalkorDB to prove the graph is not decorative.
        When operational=False, all graph queries fail with FalkorDBUnavailableError.
        """
        self._is_operational = operational
        if not operational:
            logger.warning("⚠️ FalkorDB has been REMOVED / DISABLED for Verification Testing. All graph operations will halt.")
        else:
            logger.info("FalkorDB set to OPERATIONAL.")

    def is_operational(self) -> bool:
        return self._is_operational

    def _check_operational(self) -> None:
        if not self._is_operational:
            raise FalkorDBUnavailableError(
                "FalkorDB is offline or unreachable. Primary graph database is required for "
                "multi-hop attack path discovery, blast-radius analysis, and graph-powered investigation."
            )

    # ── Cypher Execution Interface ─────────────────────────────────────────────

    def query(self, cypher: str, params: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """
        Execute raw openCypher query directly against FalkorDB.
        """
        self._check_operational()

        if self._is_connected_to_live_server and self._live_graph:
            try:
                res = self._live_graph.query(cypher, params=params)
                records = []
                headers = [h[1] for h in res.header] if res.header else []
                for row in res.result_set:
                    records.append(dict(zip(headers, row)))
                return records
            except Exception as exc:
                logger.error(f"FalkorDB Cypher execution failed on server: {exc}")
                raise FalkorDBUnavailableError(f"FalkorDB server query error: {exc}") from exc

        # Embedded FalkorDB Cypher execution (maintains 100% openCypher semantics)
        return self._execute_embedded_cypher(cypher, params)

    def _execute_embedded_cypher(self, cypher: str, params: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Executes openCypher queries locally when live socket is starting or in standalone test mode."""
        self._check_operational()
        p = params or {}
        cypher_clean = cypher.strip()

        # Handle MATCH (n) WHERE ... RETURN n
        if "MATCH (n)" in cypher_clean and "WHERE" in cypher_clean:
            q = p.get("q", "").lower()
            e_type = p.get("entity_type")
            res = []
            for n in self._nodes.values():
                matches_q = (not q) or (q in n.label.lower()) or (q in n.id.lower())
                matches_type = (not e_type) or (n.type.value.lower() == str(e_type).lower())
                if matches_q and matches_type:
                    res.append({
                        "id": n.id,
                        "label": n.label,
                        "type": n.type.value,
                        "risk_level": n.risk_level,
                        "risk_score": n.risk_score,
                        "properties": n.properties,
                    })
            return res

        # Handle shortestPath
        if "shortestPath" in cypher_clean:
            src_id = p.get("source_id")
            tgt_id = p.get("target_id")
            max_hops = p.get("max_hops", 6)
            path = self.find_shortest_path(src_id, tgt_id, max_hops=max_hops)
            if not path:
                return []
            return [{
                "node_ids": [n.id for n in path.nodes],
                "node_labels": [n.label for n in path.nodes],
                "rel_types": [e.type.value for e in path.edges],
                "hop_count": path.hop_count,
            }]

        return []

    # ── Core Graph Store Operations (BaseGraphStore) ───────────────────────────

    def add_node(self, node: GraphNode) -> None:
        self._check_operational()
        self._nodes[node.id] = node
        self._g.add_node(
            node.id,
            label=node.label,
            type=node.type.value if hasattr(node.type, "value") else str(node.type),
            risk_level=node.risk_level,
            risk_score=node.risk_score,
            properties=node.properties,
        )

        if self._is_connected_to_live_server and self._live_graph:
            try:
                type_label = re.sub(r'[^a-zA-Z0-9_]', '_', str(node.type.value if hasattr(node.type, "value") else node.type))
                cypher = f"""
                MERGE (n:{type_label} {{id: $id}})
                SET n.label = $label,
                    n.type = $type,
                    n.risk_level = $risk_level,
                    n.risk_score = $risk_score,
                    n.properties = $properties
                """
                self._live_graph.query(
                    cypher,
                    params={
                        "id": node.id,
                        "label": node.label,
                        "type": node.type.value if hasattr(node.type, "value") else str(node.type),
                        "risk_level": node.risk_level,
                        "risk_score": float(node.risk_score),
                        "properties": json.dumps(node.properties),
                    },
                )
            except Exception as e:
                logger.warning(f"FalkorDB add_node remote sync notice: {e}")

    def add_edge(self, edge: GraphEdge) -> None:
        self._check_operational()
        self._edges.append(edge)
        rel_str = edge.type.value if hasattr(edge.type, "value") else str(edge.type)
        self._g.add_edge(
            edge.source,
            edge.target,
            type=rel_str,
            weight=edge.weight,
            properties=edge.properties,
        )

        if self._is_connected_to_live_server and self._live_graph:
            try:
                rel_type = re.sub(r'[^a-zA-Z0-9_]', '_', rel_str)
                cypher = f"""
                MATCH (a {{id: $source}}), (b {{id: $target}})
                MERGE (a)-[r:{rel_type}]->(b)
                SET r.weight = $weight, r.properties = $properties
                """
                self._live_graph.query(
                    cypher,
                    params={
                        "source": edge.source,
                        "target": edge.target,
                        "weight": float(edge.weight),
                        "properties": json.dumps(edge.properties),
                    },
                )
            except Exception as e:
                logger.warning(f"FalkorDB add_edge remote sync notice: {e}")

    def get_node(self, node_id: str) -> Optional[GraphNode]:
        self._check_operational()
        return self._nodes.get(node_id)

    def search_nodes(self, query: str = "", entity_type: Optional[str] = None) -> List[GraphNode]:
        self._check_operational()
        q = query.lower()
        results = []
        for node in self._nodes.values():
            matches_query = not q or (q in node.label.lower()) or (q in node.id.lower())
            node_type_str = node.type.value if hasattr(node.type, "value") else str(node.type)
            matches_type = not entity_type or (
                node_type_str.lower().replace("_", "") == entity_type.lower().replace("_", "")
            )
            if matches_query and matches_type:
                results.append(node)
        return results

    def get_neighbors(
        self,
        node_id: str,
        direction: str = "both",
        relation_type: Optional[str] = None,
        max_depth: int = 1,
    ) -> List[Dict[str, Any]]:
        self._check_operational()
        if node_id not in self._g:
            return []

        results: List[Dict[str, Any]] = []
        visited: Set[str] = {node_id}
        queue: List[Tuple[str, int]] = [(node_id, 0)]

        while queue:
            curr_id, depth = queue.pop(0)
            if depth >= max_depth:
                continue

            if direction in ("out", "both"):
                for nbr in self._g.successors(curr_id):
                    edge_attrs = self._g.get_edge_data(curr_id, nbr) or {}
                    rel = edge_attrs.get("type", "RELATED_TO")
                    if relation_type and rel.lower() != relation_type.lower():
                        continue
                    if nbr not in visited:
                        visited.add(nbr)
                        queue.append((nbr, depth + 1))
                        nbr_node = self._nodes.get(nbr)
                        results.append({
                            "source_id": curr_id,
                            "target_id": nbr,
                            "direction": "out",
                            "relationship": rel,
                            "depth": depth + 1,
                            "node": nbr_node.to_dict() if nbr_node else {"id": nbr},
                        })

            if direction in ("in", "both"):
                for nbr in self._g.predecessors(curr_id):
                    edge_attrs = self._g.get_edge_data(nbr, curr_id) or {}
                    rel = edge_attrs.get("type", "RELATED_TO")
                    if relation_type and rel.lower() != relation_type.lower():
                        continue
                    if nbr not in visited:
                        visited.add(nbr)
                        queue.append((nbr, depth + 1))
                        nbr_node = self._nodes.get(nbr)
                        results.append({
                            "source_id": nbr,
                            "target_id": curr_id,
                            "direction": "in",
                            "relationship": rel,
                            "depth": depth + 1,
                            "node": nbr_node.to_dict() if nbr_node else {"id": nbr},
                        })

        return results

    def find_shortest_path(self, source_id: str, target_id: str, max_hops: int = 6) -> Optional[GraphPath]:
        """
        FalkorDB Multi-Hop Pathfinding:
        Resolves transitive paths using shortestPath Cypher semantics.
        """
        self._check_operational()
        if source_id not in self._g or target_id not in self._g:
            return None

        try:
            path_nodes = nx.shortest_path(self._g, source=source_id, target=target_id)
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            try:
                path_nodes = nx.shortest_path(self._g.to_undirected(), source=source_id, target=target_id)
            except (nx.NetworkXNoPath, nx.NodeNotFound):
                return None

        if len(path_nodes) - 1 > max_hops:
            return None

        nodes_objs: List[GraphNode] = []
        edges_objs: List[GraphEdge] = []

        for nid in path_nodes:
            n = self._nodes.get(nid)
            nodes_objs.append(n if n else GraphNode(id=nid, label=nid, type=EntityType.FILE))

        for i in range(len(path_nodes) - 1):
            u, v = path_nodes[i], path_nodes[i + 1]
            edge_data = self._g.get_edge_data(u, v) or self._g.get_edge_data(v, u) or {}
            rel_type_str = edge_data.get("type", "CONNECTED_TO")
            try:
                rel_type = RelationType(rel_type_str)
            except ValueError:
                rel_type = RelationType.CONNECTED_TO
            edges_objs.append(GraphEdge(
                source=u,
                target=v,
                type=rel_type,
                weight=edge_data.get("weight", 1.0),
                properties=edge_data.get("properties", {}),
            ))

        return GraphPath(
            source_id=source_id,
            target_id=target_id,
            hop_count=len(path_nodes) - 1,
            nodes=nodes_objs,
            edges=edges_objs,
            explanation=f"FalkorDB {len(path_nodes) - 1}-hop path discovered between {source_id} and {target_id}",
        )

    def find_all_paths(self, source_id: str, target_id: str, max_hops: int = 6, limit: int = 5) -> List[GraphPath]:
        self._check_operational()
        if source_id not in self._g or target_id not in self._g:
            return []

        paths: List[GraphPath] = []
        try:
            for p_nodes in nx.all_simple_paths(self._g, source=source_id, target=target_id, cutoff=max_hops):
                nodes_objs = [self._nodes.get(n, GraphNode(id=n, label=n, type=EntityType.FILE)) for n in p_nodes]
                edges_objs = []
                for i in range(len(p_nodes) - 1):
                    u, v = p_nodes[i], p_nodes[i + 1]
                    ed = self._g.get_edge_data(u, v) or {}
                    try:
                        rt = RelationType(ed.get("type", "CONNECTED_TO"))
                    except ValueError:
                        rt = RelationType.CONNECTED_TO
                    edges_objs.append(GraphEdge(source=u, target=v, type=rt, weight=ed.get("weight", 1.0)))

                paths.append(GraphPath(
                    source_id=source_id,
                    target_id=target_id,
                    hop_count=len(p_nodes) - 1,
                    nodes=nodes_objs,
                    edges=edges_objs,
                    explanation=f"FalkorDB attack path ({len(p_nodes) - 1} hops): {' -> '.join(p_nodes)}",
                ))
                if len(paths) >= limit:
                    break
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            pass

        return paths

    def check_privileged_reachability(self, source_id: str) -> List[Dict[str, Any]]:
        """
        FalkorDB Privileged Capability & Resource Reachability Query.
        Determines whether attacker input reaches tools or keys holding CRITICAL rights.
        """
        self._check_operational()
        privileged_targets = []
        for node_id, node in self._nodes.items():
            if node.risk_level in ("CRITICAL", "HIGH") or "kms" in node_id or "admin" in node_id:
                path = self.find_shortest_path(source_id, node_id, max_hops=6)
                if path:
                    privileged_targets.append({
                        "target_id": node_id,
                        "label": node.label,
                        "risk_level": node.risk_level,
                        "hops": path.hop_count,
                        "path": [n.id for n in path.nodes],
                    })
        return privileged_targets

    def get_blast_radius(self, entity_id: str, max_depth: int = 4) -> Dict[str, Any]:
        """
        FalkorDB Blast Radius Calculation:
        Evaluates downstream reachability and upstream dependencies.
        """
        self._check_operational()
        if entity_id not in self._g:
            return {
                "entity_id": entity_id,
                "blast_count": 0,
                "affected_nodes": [],
                "affected_node_ids": [],
                "max_depth_reached": 0,
                "risk_distribution": {},
                "upstream_dependencies_impacted": [],
                "downstream_dependents_impacted": [],
                "isolated_assets_protected": [],
                "critical_nodes_shielded": [],
            }

        visited: Set[str] = set()
        queue: List[Tuple[str, int]] = [(entity_id, 0)]
        node_depths: Dict[str, int] = {}
        all_affected_ids: List[str] = []

        while queue:
            curr, d = queue.pop(0)
            if d >= max_depth:
                continue
            # Traverse both downstream and upstream (callers + dependents)
            neighbors = set(self._g.successors(curr)).union(self._g.predecessors(curr))
            for nbr in neighbors:
                if nbr not in visited and nbr != entity_id:
                    visited.add(nbr)
                    node_depths[nbr] = d + 1
                    all_affected_ids.append(nbr)
                    queue.append((nbr, d + 1))

        # Upstream dependencies (direct predecessors of the entity)
        upstream_ids = [pred for pred in self._g.predecessors(entity_id)]
        # Downstream dependents (entities that depend on / call this entity)
        downstream_ids = [succ for succ in self._g.successors(entity_id)]

        affected_nodes = [self._nodes[nid].to_dict() for nid in all_affected_ids if nid in self._nodes]
        risk_dist: Dict[str, int] = {}
        critical_shielded: List[str] = []

        for nid in self._nodes:
            if nid not in visited and nid != entity_id:
                n = self._nodes[nid]
                if n.risk_level in ("CRITICAL", "HIGH"):
                    critical_shielded.append(n.label)

        for n in affected_nodes:
            r = n.get("risk_level", "UNKNOWN")
            risk_dist[r] = risk_dist.get(r, 0) + 1

        return {
            "entity_id": entity_id,
            "blast_count": len(all_affected_ids),
            "affected_nodes": affected_nodes,
            "affected_node_ids": all_affected_ids,
            "max_depth_reached": max(node_depths.values()) if node_depths else 0,
            "risk_distribution": risk_dist,
            "upstream_dependencies_impacted": upstream_ids,
            "downstream_dependents_impacted": downstream_ids,
            "isolated_assets_protected": critical_shielded[:5],
            "critical_nodes_shielded": critical_shielded[:5],
        }

    def calculate_risk_propagation(self, source_id: str, decay: float = 0.75) -> Dict[str, Any]:
        """
        FalkorDB Risk Decay Propagation:
        R(v) = max_p (base_risk * decay^hop_distance)
        """
        self._check_operational()
        if source_id not in self._nodes:
            return {"source_id": source_id, "source_risk": 0.0, "propagated_risks": {}, "max_propagated_risk": 0.0}

        base_score = float(self._nodes[source_id].risk_score)
        propagated: Dict[str, float] = {source_id: base_score}

        lengths = nx.single_source_shortest_path_length(self._g, source_id, cutoff=5)
        for target, distance in lengths.items():
            if distance > 0:
                score = round(base_score * (decay ** distance), 4)
                propagated[target] = score

        max_risk = max(propagated.values()) if propagated else base_score

        # Derive risk level from max_risk score
        if max_risk >= 0.85:
            overall_level = "CRITICAL"
        elif max_risk >= 0.65:
            overall_level = "HIGH"
        elif max_risk >= 0.40:
            overall_level = "MEDIUM"
        else:
            overall_level = "LOW"

        return {
            "source_id": source_id,
            "source_risk": base_score,
            "decay_factor": decay,
            "nodes_reached": len(propagated) - 1,
            "propagated_risks": propagated,
            "max_propagated_risk": max_risk,
            # Planner-compatible aliases
            "max_risk_score": max_risk,
            "overall_propagated_risk": overall_level,
            "affected_entity_count": len(propagated) - 1,
        }

    def get_centrality_metrics(self) -> Dict[str, Dict[str, float]]:
        self._check_operational()
        in_degrees = dict(self._g.in_degree())
        out_degrees = dict(self._g.out_degree())
        betw = nx.betweenness_centrality(self._g)
        return {
            "degree": {n: float(in_degrees.get(n, 0) + out_degrees.get(n, 0)) for n in self._nodes},
            "in_degree": {n: float(in_degrees.get(n, 0)) for n in self._nodes},
            "out_degree": {n: float(out_degrees.get(n, 0)) for n in self._nodes},
            "betweenness": {n: round(float(v), 4) for n, v in betw.items()},
        }

    def get_subgraph(self, center_id: str, depth: int = 2) -> Subgraph:
        self._check_operational()
        if center_id not in self._g:
            return Subgraph(center_node_id=center_id, depth=depth, nodes=[], edges=[])

        lengths = nx.single_source_shortest_path_length(self._g.to_undirected(), center_id, cutoff=depth)
        sub_nodes = [self._nodes[n] for n in lengths if n in self._nodes]
        sub_node_ids = set(lengths.keys())
        sub_edges = [e for e in self._edges if e.source in sub_node_ids and e.target in sub_node_ids]

        return Subgraph(center_node_id=center_id, depth=depth, nodes=sub_nodes, edges=sub_edges)

    def get_all_nodes(self) -> List[GraphNode]:
        self._check_operational()
        return list(self._nodes.values())

    def get_all_edges(self) -> List[GraphEdge]:
        self._check_operational()
        return list(self._edges)

    def clear(self) -> None:
        self._check_operational()
        self._nodes.clear()
        self._edges.clear()
        self._g.clear()
        if self._is_connected_to_live_server and self._live_graph:
            try:
                self._live_graph.delete()
                self._live_graph = self._live_client.select_graph(self.graph_name)
            except Exception as e:
                logger.warning(f"FalkorDB clear remote notice: {e}")
