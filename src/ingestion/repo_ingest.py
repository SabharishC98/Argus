"""
Real Repository Ingestion Engine for ShadowLens-Agent.
Performs static code analysis (AST), dependency extraction, tool detection,
route discovery, database query mapping, and OSV vulnerability enrichment.
Constructs a connected knowledge graph from any real GitHub repository or local codebase.
"""

from __future__ import annotations

import ast
import datetime
import logging
import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

from src.graph.graph_store import BaseGraphStore, get_graph_store
from src.graph.schema import EntityType, GraphEdge, GraphNode, RelationType
from src.ingestion.vuln_enricher import get_vulnerability_enricher

logger = logging.getLogger(__name__)

# Track active data source state
DATA_SOURCE_STATE: Dict[str, Any] = {
    "active_source": "seed_dataset",  # "seed_dataset" | "real_repository"
    "repo_url": None,
    "repo_name": "ShadowLens Seed Knowledge Graph",
    "analyzed_at": datetime.datetime.utcnow().isoformat() + "Z",
    "stats": {"nodes": 26, "edges": 25, "files": 4, "dependencies": 4, "vulnerabilities": 2},
}


class RepositoryIngestor:
    """Clones, parses, and converts real software repositories into connected security graphs."""

    def __init__(self, graph_store: Optional[BaseGraphStore] = None):
        self.store = graph_store or get_graph_store()
        self.enricher = get_vulnerability_enricher()

    async def ingest_repository(
        self, repo_url_or_path: str, max_files: int = 60
    ) -> Dict[str, Any]:
        """
        Main entry point for repository ingestion.
        Supports:
        - GitHub URLs: https://github.com/owner/repo
        - Local directory paths: d:/my-project or ./path
        """
        logger.info(f"Beginning repository ingestion for: {repo_url_or_path}")
        is_url = repo_url_or_path.startswith("http://") or repo_url_or_path.startswith("https://") or "github.com" in repo_url_or_path

        temp_dir = None
        repo_dir: Path

        if is_url:
            # Clone repo to D:\shadowlens_tmp — C: drive may be full
            base_tmp = Path("D:/shadowlens_tmp")
            base_tmp.mkdir(parents=True, exist_ok=True)
            temp_dir = tempfile.mkdtemp(prefix="shadowlens_repo_", dir=str(base_tmp))
            repo_dir = Path(temp_dir)
            clean_url = repo_url_or_path.strip().rstrip("/")
            if not clean_url.endswith(".git"):
                clean_url_git = clean_url + ".git"
            else:
                clean_url_git = clean_url

            repo_name = clean_url.split("/")[-1].replace(".git", "")
            logger.info(f"Cloning {clean_url_git} (shallow) to {repo_dir} on D: drive...")
            try:
                # Shallow clone depth=1 — fast and small, no history
                cmd = ["git", "clone", "--depth", "1", clean_url_git, str(repo_dir)]
                proc = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
                if proc.returncode != 0:
                    # Try without .git suffix
                    cmd2 = ["git", "clone", "--depth", "1", clean_url, str(repo_dir)]
                    proc2 = subprocess.run(cmd2, capture_output=True, text=True, timeout=120)
                    if proc2.returncode != 0:
                        raise RuntimeError(f"Git clone failed: {proc.stderr or proc2.stderr}")
            except Exception as exc:
                if temp_dir and os.path.exists(temp_dir):
                    shutil.rmtree(temp_dir, ignore_errors=True)
                raise RuntimeError(f"Could not clone repository '{repo_url_or_path}': {exc}")
        else:
            repo_dir = Path(repo_url_or_path).resolve()
            if not repo_dir.exists():
                raise FileNotFoundError(f"Local repository path '{repo_url_or_path}' does not exist.")
            repo_name = repo_dir.name

        try:
            # 1. Clear current store and reset for real repository
            if hasattr(self.store, "nodes_data"):
                self.store.nodes_data.clear()
                self.store.edges_data.clear()
                if hasattr(self.store, "g"):
                    self.store.g.clear()

            # 2. Add root Repository Node
            repo_node_id = f"repo:{repo_name.lower()}"
            self.store.add_node(
                GraphNode(
                    id=repo_node_id,
                    label=f"Repository: {repo_name}",
                    type=EntityType.REPOSITORY,
                    risk_level="SAFE",
                    risk_score=0.1,
                    properties={"url": repo_url_or_path, "local_path": str(repo_dir)},
                )
            )

            # 3. Parse Dependencies
            dependencies = self._extract_dependencies(repo_dir)
            dep_nodes: List[GraphNode] = []
            for dep in dependencies:
                dep_id = f"dep:{dep['name'].lower()}"
                dep_node = GraphNode(
                    id=dep_id,
                    label=f"{dep['name']}{'==' + dep['version'] if dep.get('version') else ''}",
                    type=EntityType.DEPENDENCY,
                    risk_level="LOW",
                    risk_score=0.2,
                    properties=dep,
                )
                self.store.add_node(dep_node)
                self.store.add_edge(
                    GraphEdge(source=repo_node_id, target=dep_id, type=RelationType.DEPENDS_ON)
                )
                dep_nodes.append(dep_node)

                # OSV Vulnerability Lookup for dependency
                vulns = await self.enricher.query_package_vulnerabilities(dep["name"], dep.get("version"))
                for v in vulns:
                    vuln_id = f"vuln:{v['id'].lower()}"
                    v_node = GraphNode(
                        id=vuln_id,
                        label=f"{v['id']}: {v.get('summary', '')[:50]}",
                        type=EntityType.VULNERABILITY,
                        risk_level=v.get("severity", "HIGH"),
                        risk_score=0.9 if v.get("severity") in ("CRITICAL", "HIGH") else 0.6,
                        properties=v,
                    )
                    self.store.add_node(v_node)
                    # Link vulnerability to dependency
                    self.store.add_edge(
                        GraphEdge(source=vuln_id, target=dep_id, type=RelationType.AFFECTS)
                    )
                    # Elevate dependency risk
                    dep_node.risk_level = v.get("severity", "HIGH")
                    dep_node.risk_score = v_node.risk_score

            # 4. Walk Code Files & Parse AST
            py_files = list(repo_dir.glob("**/*.py"))
            # Skip virtualenvs or git internals
            valid_files = [
                f for f in py_files
                if not any(part in f.parts for part in (".git", "venv", ".venv", "env", "__pycache__", "node_modules"))
            ][:max_files]

            parsed_file_nodes: List[str] = []
            func_definitions: Dict[str, str] = {}  # func_name -> func_node_id
            call_relations: List[Tuple[str, str]] = []  # (caller_func_id, called_func_name)
            endpoint_nodes: List[str] = []
            query_nodes: List[str] = []

            for f_path in valid_files:
                rel_path = f_path.relative_to(repo_dir).as_posix()
                file_id = f"file:{rel_path}"
                parsed_file_nodes.append(file_id)

                self.store.add_node(
                    GraphNode(
                        id=file_id,
                        label=rel_path,
                        type=EntityType.FILE,
                        risk_level="SAFE",
                        risk_score=0.1,
                        properties={"extension": f_path.suffix, "size_bytes": f_path.stat().st_size},
                    )
                )
                self.store.add_edge(
                    GraphEdge(source=repo_node_id, target=file_id, type=RelationType.CONTAINS)
                )

                # Link file to any imported dependencies
                try:
                    content = f_path.read_text(encoding="utf-8", errors="ignore")
                except Exception:
                    continue

                for dep in dependencies:
                    if dep["name"].lower() in content.lower():
                        dep_id = f"dep:{dep['name'].lower()}"
                        self.store.add_edge(
                            GraphEdge(source=file_id, target=dep_id, type=RelationType.IMPORTS)
                        )

                # Parse AST
                try:
                    tree = ast.parse(content, filename=str(f_path))
                except SyntaxError:
                    continue

                for node in ast.walk(tree):
                    if isinstance(node, ast.ClassDef):
                        cls_id = f"class:{rel_path}:{node.name}"
                        self.store.add_node(
                            GraphNode(
                                id=cls_id,
                                label=f"{node.name} (Class)",
                                type=EntityType.CLASS,
                                risk_level="LOW",
                                risk_score=0.2,
                                properties={"file": rel_path, "line": node.lineno},
                            )
                        )
                        self.store.add_edge(
                            GraphEdge(source=file_id, target=cls_id, type=RelationType.CONTAINS)
                        )

                    elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                        func_id = f"func:{rel_path}:{node.name}"
                        func_definitions[node.name] = func_id

                        # Check for API route decorators (@app.get, @router.post, etc.)
                        is_endpoint = False
                        endpoint_path = ""
                        for dec in node.decorator_list:
                            dec_repr = ast.unparse(dec) if hasattr(ast, "unparse") else ""
                            if any(rt in dec_repr for rt in ("get(", "post(", "put(", "delete(", "patch(", "route(")):
                                is_endpoint = True
                                match = re.search(r"['\"](/[^'\"]*)['\"]", dec_repr)
                                endpoint_path = match.group(1) if match else f"/{node.name}"

                        # Check for Tool decorators or names (@tool, tool_*, agent_*)
                        is_tool = any("tool" in (ast.unparse(d).lower() if hasattr(ast, "unparse") else "") for d in node.decorator_list) or node.name.startswith("tool_") or node.name.startswith("action_")

                        # Check for raw DB query executions
                        has_db_query = any(k in content[node.lineno:node.end_lineno if hasattr(node, 'end_lineno') and node.end_lineno else node.lineno + 15] for k in ("execute(", "query(", "SELECT ", "UPDATE ", "DELETE "))

                        func_node = GraphNode(
                            id=func_id,
                            label=f"{node.name}()",
                            type=EntityType.FUNCTION,
                            risk_level="MEDIUM" if (is_endpoint or is_tool) else "LOW",
                            risk_score=0.5 if (is_endpoint or is_tool) else 0.2,
                            properties={
                                "file": rel_path,
                                "line": node.lineno,
                                "is_tool": is_tool,
                                "is_endpoint": is_endpoint,
                            },
                        )
                        self.store.add_node(func_node)
                        self.store.add_edge(
                            GraphEdge(source=file_id, target=func_id, type=RelationType.CONTAINS)
                        )

                        if is_endpoint:
                            ep_id = f"endpoint:{rel_path}:{node.name}"
                            endpoint_nodes.append(ep_id)
                            self.store.add_node(
                                GraphNode(
                                    id=ep_id,
                                    label=f"Route: {endpoint_path or node.name}",
                                    type=EntityType.API_ENDPOINT,
                                    risk_level="MEDIUM",
                                    risk_score=0.6,
                                    properties={"path": endpoint_path, "handler": func_id},
                                )
                            )
                            self.store.add_edge(
                                GraphEdge(source=ep_id, target=func_id, type=RelationType.CALLS)
                            )

                        if has_db_query:
                            query_id = f"query:{rel_path}:{node.name}_db"
                            query_nodes.append(query_id)
                            self.store.add_node(
                                GraphNode(
                                    id=query_id,
                                    label=f"DBQuery ({node.name})",
                                    type=EntityType.DATABASE_QUERY,
                                    risk_level="HIGH",
                                    risk_score=0.8,
                                    properties={"caller": func_id},
                                )
                            )
                            self.store.add_edge(
                                GraphEdge(source=func_id, target=query_id, type=RelationType.QUERIES)
                            )

                        # Collect internal calls
                        for inner in ast.walk(node):
                            if isinstance(inner, ast.Call) and isinstance(inner.func, ast.Name):
                                if inner.func.id != node.name:
                                    call_relations.append((func_id, inner.func.id))

            # 5. Resolve Inter-Function Call Edges
            for caller_id, target_func_name in call_relations:
                if target_func_name in func_definitions:
                    callee_id = func_definitions[target_func_name]
                    if caller_id != callee_id:
                        self.store.add_edge(
                            GraphEdge(source=caller_id, target=callee_id, type=RelationType.CALLS)
                        )

            # 6. Update Data Source Metadata
            all_nodes = self.store.get_all_nodes()
            all_edges = self.store.get_all_edges()

            DATA_SOURCE_STATE["active_source"] = "real_repository"
            DATA_SOURCE_STATE["repo_url"] = repo_url_or_path
            DATA_SOURCE_STATE["repo_name"] = repo_name
            DATA_SOURCE_STATE["analyzed_at"] = datetime.datetime.utcnow().isoformat() + "Z"
            DATA_SOURCE_STATE["stats"] = {
                "nodes": len(all_nodes),
                "edges": len(all_edges),
                "files": len(parsed_file_nodes),
                "dependencies": len(dependencies),
                "endpoints": len(endpoint_nodes),
                "queries": len(query_nodes),
            }

            logger.info(f"Repository {repo_name} successfully ingested: {len(all_nodes)} nodes, {len(all_edges)} edges.")
            return {
                "success": True,
                "data_source": "real_repository",
                "repo_name": repo_name,
                "repo_url": repo_url_or_path,
                "node_count": len(all_nodes),
                "edge_count": len(all_edges),
                "files_parsed": len(parsed_file_nodes),
                "dependencies_found": len(dependencies),
                "endpoints_found": len(endpoint_nodes),
                "queries_found": len(query_nodes),
            }

        finally:
            # Cleanup temp directory if cloned
            if temp_dir and os.path.exists(temp_dir):
                shutil.rmtree(temp_dir, ignore_errors=True)

    def _extract_dependencies(self, repo_dir: Path) -> List[Dict[str, str]]:
        """Parses requirements.txt, pyproject.toml, package.json for package dependencies."""
        deps: List[Dict[str, str]] = []
        seen = set()

        # Check requirements.txt
        req_file = repo_dir / "requirements.txt"
        if req_file.exists():
            try:
                for line in req_file.read_text(encoding="utf-8", errors="ignore").splitlines():
                    line = line.strip()
                    if line and not line.startswith("#") and not line.startswith("-"):
                        parts = re.split(r"[=><~^!]", line, maxsplit=1)
                        pkg = parts[0].strip()
                        ver = parts[1].strip("=") if len(parts) > 1 else ""
                        if pkg and pkg.lower() not in seen:
                            seen.add(pkg.lower())
                            deps.append({"name": pkg, "version": ver, "file": "requirements.txt"})
            except Exception as e:
                logger.warning(f"Error parsing requirements.txt: {e}")

        # Check package.json if JS/TS
        pkg_json = repo_dir / "package.json"
        if pkg_json.exists():
            try:
                data = json.loads(pkg_json.read_text(encoding="utf-8", errors="ignore"))
                for group in ("dependencies", "devDependencies"):
                    for pkg, ver in data.get(group, {}).items():
                        if pkg.lower() not in seen:
                            seen.add(pkg.lower())
                            deps.append({"name": pkg, "version": str(ver).strip("^~"), "file": "package.json"})
            except Exception as e:
                logger.warning(f"Error parsing package.json: {e}")

        return deps


def reset_to_seed_dataset() -> Dict[str, Any]:
    """Resets the graph store back to the rich seed/demo dataset."""
    store = get_graph_store()
    if hasattr(store, "nodes_data"):
        store.nodes_data.clear()
        store.edges_data.clear()
        if hasattr(store, "g"):
            store.g.clear()

    from src.graph.seed_data import seed_security_graph
    seed_security_graph(store)

    DATA_SOURCE_STATE["active_source"] = "seed_dataset"
    DATA_SOURCE_STATE["repo_url"] = None
    DATA_SOURCE_STATE["repo_name"] = "ShadowLens Seed Knowledge Graph"
    DATA_SOURCE_STATE["analyzed_at"] = datetime.datetime.utcnow().isoformat() + "Z"
    DATA_SOURCE_STATE["stats"] = {
        "nodes": len(store.get_all_nodes()),
        "edges": len(store.get_all_edges()),
        "files": 4,
        "dependencies": 4,
        "vulnerabilities": 2,
    }

    return {
        "success": True,
        "data_source": "seed_dataset",
        "message": "Knowledge graph successfully reset to verified seed dataset.",
    }
