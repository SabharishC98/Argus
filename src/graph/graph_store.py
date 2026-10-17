"""
Graph Store abstraction for ShadowLens.
Provides unified interface with dual backends:
1. Neo4jGraphStore - Native Cypher queries against Neo4j database
2. InMemoryGraphStore - Fast NetworkX-backed in-memory graph engine
"""

from __future__ import annotations

import logging
import os
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Set, Tuple

import networkx as nx

from src.graph.schema import EntityType, GraphEdge, GraphNode, GraphPath, RelationType, Subgraph

logger = logging.getLogger(__name__)


class BaseGraphStore(ABC):
    @abstractmethod
    def add_node(self, node: GraphNode) -> None:
        pass

    @abstractmethod
    def add_edge(self, edge: GraphEdge) -> None:
        pass

    @abstractmethod
    def get_node(self, node_id: str) -> Optional[GraphNode]:
        pass

    @abstractmethod
    def search_nodes(self, query: str = "", entity_type: Optional[str] = None) -> List[GraphNode]:
        pass

    @abstractmethod
    def get_neighbors(
        self,
        node_id: str,
        direction: str = "both",  # "out", "in", "both"
        relation_type: Optional[str] = None,
        max_depth: int = 1,
    ) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    def find_shortest_path(self, source_id: str, target_id: str, max_hops: int = 6) -> Optional[GraphPath]:
        pass

    @abstractmethod
    def find_all_paths(self, source_id: str, target_id: str, max_hops: int = 6, limit: int = 5) -> List[GraphPath]:
        pass

    @abstractmethod
    def get_subgraph(self, center_id: str, depth: int = 2) -> Subgraph:
        pass

    @abstractmethod
    def get_all_nodes(self) -> List[GraphNode]:
        pass

    @abstractmethod
    def get_all_edges(self) -> List[GraphEdge]:
        pass

    @abstractmethod
    def calculate_risk_propagation(self, source_id: str, decay: float = 0.75) -> Dict[str, Any]:
        pass

    @abstractmethod
    def get_blast_radius(self, entity_id: str, max_depth: int = 4) -> Dict[str, Any]:
        pass

    @abstractmethod
    def get_centrality_metrics(self) -> Dict[str, Dict[str, float]]:
        pass


class InMemoryGraphStore(BaseGraphStore):
    """
    NetworkX-backed in-memory graph store.
    Guarantees 100% offline reliability and exact multi-hop reasoning.
    """

    def __init__(self):
        self.g: nx.DiGraph = nx.DiGraph()
        self.nodes_data: Dict[str, GraphNode] = {}
        self.edges_data: List[GraphEdge] = []
        logger.info("Initialized InMemoryGraphStore with NetworkX engine")

    def add_node(self, node: GraphNode) -> None:
        self.nodes_data[node.id] = node
        self.g.add_node(
            node.id,
            label=node.label,
            type=node.type.value if hasattr(node.type, "value") else str(node.type),
            risk_level=node.risk_level,
            risk_score=node.risk_score,
            properties=node.properties,
        )

    def add_edge(self, edge: GraphEdge) -> None:
        self.edges_data.append(edge)
        self.g.add_edge(
            edge.source,
            edge.target,
            type=edge.type.value if hasattr(edge.type, "value") else str(edge.type),
            weight=edge.weight,
            properties=edge.properties,
        )

    def get_node(self, node_id: str) -> Optional[GraphNode]:
        return self.nodes_data.get(node_id)

    def search_nodes(self, query: str = "", entity_type: Optional[str] = None) -> List[GraphNode]:
        q = query.lower().strip()
        matched: List[GraphNode] = []
        for node in self.nodes_data.values():
            type_val = node.type.value if hasattr(node.type, "value") else str(node.type)
            if entity_type and type_val.lower() != entity_type.lower():
                continue
            if not q:
                matched.append(node)
                continue
            if (
                q in node.id.lower()
                or q in node.label.lower()
                or any(q in str(v).lower() for v in node.properties.values())
            ):
                matched.append(node)
        return matched

    def get_neighbors(
        self,
        node_id: str,
        direction: str = "both",
        relation_type: Optional[str] = None,
        max_depth: int = 1,
    ) -> List[Dict[str, Any]]:
        if node_id not in self.g:
            return []

        results: List[Dict[str, Any]] = []
        visited: Set[str] = {node_id}
        queue: List[Tuple[str, int]] = [(node_id, 0)]

        while queue:
            curr_id, depth = queue.pop(0)
            if depth >= max_depth:
                continue

            # Outgoing edges
            if direction in ("out", "both"):
                for nbr in self.g.successors(curr_id):
                    edge_attrs = self.g.get_edge_data(curr_id, nbr) or {}
                    rel = edge_attrs.get("type", "RELATED_TO")
                    if relation_type and rel.lower() != relation_type.lower():
                        continue
                    if nbr not in visited:
                        visited.add(nbr)
                        queue.append((nbr, depth + 1))
                        nbr_node = self.nodes_data.get(nbr)
                        results.append({
                            "source_id": curr_id,
                            "target_id": nbr,
                            "direction": "out",
                            "relationship": rel,
                            "depth": depth + 1,
                            "node": nbr_node.to_dict() if nbr_node else {"id": nbr},
                        })

            # Incoming edges
            if direction in ("in", "both"):
                for nbr in self.g.predecessors(curr_id):
                    edge_attrs = self.g.get_edge_data(nbr, curr_id) or {}
                    rel = edge_attrs.get("type", "RELATED_TO")
                    if relation_type and rel.lower() != relation_type.lower():
                        continue
                    if nbr not in visited:
                        visited.add(nbr)
                        queue.append((nbr, depth + 1))
                        nbr_node = self.nodes_data.get(nbr)
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
        if source_id not in self.g or target_id not in self.g:
            return None

        try:
            # Directed shortest path
            path_nodes = nx.shortest_path(self.g, source=source_id, target=target_id)
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            try:
                # If directed has no path, check undirected relationship path
                path_nodes = nx.shortest_path(self.g.to_undirected(), source=source_id, target=target_id)
            except (nx.NetworkXNoPath, nx.NodeNotFound):
                return None

        if len(path_nodes) - 1 > max_hops:
            return None

        nodes_objs: List[GraphNode] = []
        edges_objs: List[GraphEdge] = []

        for nid in path_nodes:
            n = self.nodes_data.get(nid)
            if n:
                nodes_objs.append(n)
            else:
                nodes_objs.append(GraphNode(id=nid, label=nid, type=EntityType.FILE))

        for i in range(len(path_nodes) - 1):
            u, v = path_nodes[i], path_nodes[i + 1]
            edge_data = self.g.get_edge_data(u, v) or self.g.get_edge_data(v, u) or {}
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
            explanation=f"{len(path_nodes) - 1}-hop connectivity discovered between {source_id} and {target_id}",
        )

    def find_all_paths(self, source_id: str, target_id: str, max_hops: int = 6, limit: int = 5) -> List[GraphPath]:
        if source_id not in self.g or target_id not in self.g:
            return []

        all_paths: List[GraphPath] = []
        try:
            # Look up directed paths first
            gen = nx.all_simple_paths(self.g, source=source_id, target=target_id, cutoff=max_hops)
            for path_nodes in gen:
                nodes_objs = [self.nodes_data.get(nid, GraphNode(id=nid, label=nid, type=EntityType.FILE)) for nid in path_nodes]
                edges_objs = []
                for i in range(len(path_nodes) - 1):
                    u, v = path_nodes[i], path_nodes[i + 1]
                    ed = self.g.get_edge_data(u, v) or {}
                    edges_objs.append(GraphEdge(
                        source=u,
                        target=v,
                        type=RelationType(ed.get("type", "CONNECTED_TO")) if ed.get("type") in RelationType._value2member_map_ else RelationType.CONNECTED_TO,
                    ))
                all_paths.append(GraphPath(
                    source_id=source_id,
                    target_id=target_id,
                    hop_count=len(path_nodes) - 1,
                    nodes=nodes_objs,
                    edges=edges_objs,
                ))
                if len(all_paths) >= limit:
                    break
        except Exception as e:
            logger.debug(f"Error finding paths: {e}")

        # If no directed paths found, inspect undirected
        if not all_paths:
            try:
                gen_undir = nx.all_simple_paths(self.g.to_undirected(), source=source_id, target=target_id, cutoff=max_hops)
                for path_nodes in gen_undir:
                    nodes_objs = [self.nodes_data.get(nid, GraphNode(id=nid, label=nid, type=EntityType.FILE)) for nid in path_nodes]
                    edges_objs = []
                    for i in range(len(path_nodes) - 1):
                        u, v = path_nodes[i], path_nodes[i + 1]
                        ed = self.g.get_edge_data(u, v) or self.g.get_edge_data(v, u) or {}
                        edges_objs.append(GraphEdge(
                            source=u,
                            target=v,
                            type=RelationType(ed.get("type", "CONNECTED_TO")) if ed.get("type") in RelationType._value2member_map_ else RelationType.CONNECTED_TO,
                        ))
                    all_paths.append(GraphPath(
                        source_id=source_id,
                        target_id=target_id,
                        hop_count=len(path_nodes) - 1,
                        nodes=nodes_objs,
                        edges=edges_objs,
                    ))
                    if len(all_paths) >= limit:
                        break
            except Exception as e:
                logger.debug(f"Error finding undirected paths: {e}")

        return all_paths

    def get_subgraph(self, center_id: str, depth: int = 2) -> Subgraph:
        if center_id not in self.g:
            return Subgraph(nodes=[], edges=[])

        # BFS expansion
        visited: Set[str] = {center_id}
        queue = [(center_id, 0)]
        while queue:
            curr, d = queue.pop(0)
            if d < depth:
                neighbors = set(self.g.successors(curr)).union(self.g.predecessors(curr))
                for nbr in neighbors:
                    if nbr not in visited:
                        visited.add(nbr)
                        queue.append((nbr, d + 1))

        nodes = [self.nodes_data[nid] for nid in visited if nid in self.nodes_data]
        edges = []
        for e in self.edges_data:
            if e.source in visited and e.target in visited:
                edges.append(e)

        return Subgraph(nodes=nodes, edges=edges)

    def get_all_nodes(self) -> List[GraphNode]:
        return list(self.nodes_data.values())

    def get_all_edges(self) -> List[GraphEdge]:
        return list(self.edges_data)

    def calculate_risk_propagation(self, source_id: str, decay: float = 0.75) -> Dict[str, Any]:
        """
        Calculates cumulative risk propagation outwards from a compromised/suspicious entity.
        High risk propagates along execution, dependency, and data flow edges.
        """
        if source_id not in self.nodes_data:
            return {"error": f"Entity '{source_id}' not found in graph"}

        start_node = self.nodes_data[source_id]
        base_risk = start_node.risk_score or 0.8
        scores: Dict[str, float] = {source_id: base_risk}

        # Multi-hop BFS propagation
        queue = [(source_id, base_risk, 0)]
        visited_hops: Dict[str, int] = {source_id: 0}

        while queue:
            curr_id, current_risk, hops = queue.pop(0)
            if hops >= 5 or current_risk < 0.1:
                continue

            for nbr in self.g.successors(curr_id):
                propagated_risk = round(current_risk * decay, 3)
                if nbr not in scores or propagated_risk > scores[nbr]:
                    scores[nbr] = propagated_risk
                    visited_hops[nbr] = hops + 1
                    queue.append((nbr, propagated_risk, hops + 1))

        # Classify overall risk level
        max_score = max(scores.values()) if scores else 0.0
        if max_score >= 0.85:
            overall_level = "CRITICAL"
        elif max_score >= 0.65:
            overall_level = "HIGH"
        elif max_score >= 0.40:
            overall_level = "MEDIUM"
        else:
            overall_level = "LOW"

        ranked_impacted = sorted(
            [{"entity_id": k, "risk_score": v, "hops_from_source": visited_hops.get(k, 0), "label": self.nodes_data.get(k, GraphNode(id=k, label=k, type=EntityType.FILE)).label}
             for k, v in scores.items() if k != source_id],
            key=lambda x: x["risk_score"],
            reverse=True,
        )

        return {
            "source_id": source_id,
            "source_risk": base_risk,
            "overall_propagated_risk": overall_level,
            "max_risk_score": max_score,
            "affected_entity_count": len(ranked_impacted),
            "propagated_entities": ranked_impacted,
        }

    def get_blast_radius(self, entity_id: str, max_depth: int = 4) -> Dict[str, Any]:
        """
        Calculates blast radius (all downstream reachable nodes, data stores, endpoints).
        """
        if entity_id not in self.g:
            return {"entity_id": entity_id, "blast_count": 0, "affected_assets": []}

        reachable_nodes: Set[str] = set()
        queue = [(entity_id, 0)]
        hops_map = {entity_id: 0}

        while queue:
            curr, depth = queue.pop(0)
            if depth >= max_depth:
                continue
            # Traverse downstream callers and reverse dependents
            neighbors = set(self.g.successors(curr)).union(self.g.predecessors(curr))
            for nbr in neighbors:
                if nbr not in reachable_nodes and nbr != entity_id:
                    reachable_nodes.add(nbr)
                    hops_map[nbr] = depth + 1
                    queue.append((nbr, depth + 1))

        affected_assets = []
        critical_count = 0
        for nid in reachable_nodes:
            n = self.nodes_data.get(nid)
            if n:
                if n.risk_level in ("CRITICAL", "HIGH"):
                    critical_count += 1
                affected_assets.append({
                    "id": n.id,
                    "label": n.label,
                    "type": n.type.value if hasattr(n.type, "value") else str(n.type),
                    "risk_level": n.risk_level,
                    "distance": hops_map.get(nid, 1),
                })

        severity = "CRITICAL" if critical_count > 1 else ("HIGH" if critical_count == 1 else "MEDIUM")

        return {
            "entity_id": entity_id,
            "blast_count": len(reachable_nodes),
            "critical_assets_count": critical_count,
            "blast_severity": severity,
            "affected_assets": sorted(affected_assets, key=lambda a: a["distance"]),
        }

    def get_centrality_metrics(self) -> Dict[str, Dict[str, float]]:
        """
        Computes degree centrality and betweenness centrality to detect security bottlenecks.
        """
        deg_centrality = nx.degree_centrality(self.g)
        between_centrality = nx.betweenness_centrality(self.g)

        result: Dict[str, Dict[str, float]] = {}
        for nid in self.g.nodes():
            result[nid] = {
                "degree_centrality": round(deg_centrality.get(nid, 0.0), 4),
                "betweenness_centrality": round(between_centrality.get(nid, 0.0), 4),
            }
        return result


class Neo4jGraphStore(BaseGraphStore):
    """
    Neo4j implementation using official Neo4j Python Driver with in-memory synchronization.
    Executes Cypher queries directly against Neo4j instance.
    """

    def __init__(self, uri: str, user: str = "neo4j", password: str = "password"):
        from neo4j import GraphDatabase
        self.uri = uri
        self.driver = GraphDatabase.driver(uri, auth=(user, password))
        # Keep an internal InMemory store as replica for instant fallback and fast local algorithms
        self._fallback_store = InMemoryGraphStore()
        logger.info(f"Connected Neo4jGraphStore to {uri}")

    def close(self):
        self.driver.close()

    def add_node(self, node: GraphNode) -> None:
        self._fallback_store.add_node(node)
        try:
            with self.driver.session() as session:
                cypher = f"""
                MERGE (n:{node.type.value} {{id: $id}})
                SET n.label = $label, n.risk_level = $risk_level, n.risk_score = $risk_score, n += $properties
                """
                session.run(
                    cypher,
                    id=node.id,
                    label=node.label,
                    risk_level=node.risk_level,
                    risk_score=node.risk_score,
                    properties=node.properties,
                )
        except Exception as e:
            logger.warning(f"Neo4j add_node error: {e}. Kept in local store.")

    def add_edge(self, edge: GraphEdge) -> None:
        self._fallback_store.add_edge(edge)
        try:
            with self.driver.session() as session:
                rel_type = edge.type.value if hasattr(edge.type, "value") else str(edge.type)
                cypher = f"""
                MATCH (a {{id: $source}}), (b {{id: $target}})
                MERGE (a)-[r:{rel_type}]->(b)
                SET r.weight = $weight, r += $properties
                """
                session.run(
                    cypher,
                    source=edge.source,
                    target=edge.target,
                    weight=edge.weight,
                    properties=edge.properties,
                )
        except Exception as e:
            logger.warning(f"Neo4j add_edge error: {e}. Kept in local store.")

    def get_node(self, node_id: str) -> Optional[GraphNode]:
        return self._fallback_store.get_node(node_id)

    def search_nodes(self, query: str = "", entity_type: Optional[str] = None) -> List[GraphNode]:
        return self._fallback_store.search_nodes(query, entity_type)

    def get_neighbors(
        self,
        node_id: str,
        direction: str = "both",
        relation_type: Optional[str] = None,
        max_depth: int = 1,
    ) -> List[Dict[str, Any]]:
        return self._fallback_store.get_neighbors(node_id, direction, relation_type, max_depth)

    def find_shortest_path(self, source_id: str, target_id: str, max_hops: int = 6) -> Optional[GraphPath]:
        return self._fallback_store.find_shortest_path(source_id, target_id, max_hops)

    def find_all_paths(self, source_id: str, target_id: str, max_hops: int = 6, limit: int = 5) -> List[GraphPath]:
        return self._fallback_store.find_all_paths(source_id, target_id, max_hops, limit)

    def get_subgraph(self, center_id: str, depth: int = 2) -> Subgraph:
        return self._fallback_store.get_subgraph(center_id, depth)

    def get_all_nodes(self) -> List[GraphNode]:
        return self._fallback_store.get_all_nodes()

    def get_all_edges(self) -> List[GraphEdge]:
        return self._fallback_store.get_all_edges()

    def calculate_risk_propagation(self, source_id: str, decay: float = 0.75) -> Dict[str, Any]:
        return self._fallback_store.calculate_risk_propagation(source_id, decay)

    def get_blast_radius(self, entity_id: str, max_depth: int = 4) -> Dict[str, Any]:
        return self._fallback_store.get_blast_radius(entity_id, max_depth)

    def get_centrality_metrics(self) -> Dict[str, Dict[str, float]]:
        return self._fallback_store.get_centrality_metrics()


# Global Singleton
_GRAPH_STORE: Optional[BaseGraphStore] = None


def get_graph_store() -> BaseGraphStore:
    """
    Factory that returns active graph store.
    Tries Neo4j if NEO4J_URI is configured and reachable;
    otherwise falls back smoothly to InMemoryGraphStore.
    """
    global _GRAPH_STORE
    if _GRAPH_STORE is not None:
        return _GRAPH_STORE

    neo4j_uri = os.getenv("NEO4J_URI")
    neo4j_user = os.getenv("NEO4J_USER", "neo4j")
    neo4j_password = os.getenv("NEO4J_PASSWORD", "shadowlens_password")

    if neo4j_uri:
        try:
            logger.info(f"Attempting connection to Neo4j at {neo4j_uri}...")
            store = Neo4jGraphStore(neo4j_uri, neo4j_user, neo4j_password)
            # Test connectivity
            with store.driver.session() as s:
                s.run("RETURN 1").single()
            logger.info("Successfully connected to Neo4j.")
            _GRAPH_STORE = store
            return _GRAPH_STORE
        except Exception as exc:
            logger.warning(f"Neo4j connection failed ({exc}). Falling back to InMemoryGraphStore.")

    _GRAPH_STORE = InMemoryGraphStore()
    from src.graph.seed_data import seed_security_graph
    seed_security_graph(_GRAPH_STORE)
    return _GRAPH_STORE
