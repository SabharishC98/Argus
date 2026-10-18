# ShadowLens-Agent
### Autonomous Graph-Powered Investigation Agent That Acts on Connected Data

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python: 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111.0-009688.svg)](https://fastapi.tiangolo.com/)
[![React: 19](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![FalkorDB](https://img.shields.io/badge/FalkorDB-Primary%20Graph%20DB-FF6B35.svg)](https://www.falkordb.com/)
[![MCP](https://img.shields.io/badge/Protocol-MCP-8A2BE2.svg)](https://modelcontextprotocol.io/)

---

## 1. What is ShadowLens-Agent?

**ShadowLens-Agent** is an autonomous investigation system for the hackathon theme **"Agents That Act on Connected Data"**.

Unlike conventional security scanners, ShadowLens builds an interconnected knowledge graph spanning repositories, endpoints, controllers, database queries, dependencies, cloud resources, and CVEs — all stored in **FalkorDB** as the primary, authoritative graph database.

An autonomous agent is equipped with the **Model Context Protocol (MCP)** to traverse multiple graph hops using FalkorDB Cypher queries, execute graph algorithms, evaluate cascading risk, take defensive actions, and generate a step-by-step, explainable evidence trail.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SHADOWLENS AGENT LOOP                           │
│                                                                        │
│   Real Repository / Security Data                                      │
│               │                                                        │
│               ▼ Ingestion → AST + OSV                                  │
│   ┌─────────────────────────────────────────────────────────┐          │
│   │                    FalkorDB Graph                       │          │
│   │  (Primary authoritative graph — openCypher engine)      │          │
│   └─────────────────────────────────────────────────────────┘          │
│               │                                                        │
│               ▼ MCP Graph Tools (Cypher queries)                       │
│   ┌───────────────────────┐         MCP Tool Calling                   │
│   │   ShadowLens Agent    │ ────────────────────────────────┐          │
│   │   (Planner & Reasoner)│ ◄───────────────────────────────┤          │
│   └───────────────────────┘                                 ▼          │
│               │                                   ┌──────────────────┐ │
│               │ Dynamic Tool Selection            │    MCP Server    │ │
│               ▼                                   └──────────────────┘ │
│   ┌─────────────────────────────────────────────────────────┐          │
│   │ 1. search_entity()       5. calculate_graph_risk()      │          │
│   │ 2. get_entity()          6. get_impact_analysis()       │          │
│   │ 3. get_neighbors()       7. create_finding()            │          │
│   │ 4. find_path()           8. take_remediation_action()   │          │
│   └─────────────────────────────────────────────────────────┘          │
│               │                                                        │
│               ▼ Multi-Hop Graph Evidence                               │
│   ┌─────────────────────────────────────────────────────────┐          │
│   │  Attack Path: Endpoint → Controller → DB (5 hops)       │          │
│   │  Cascading Risk: CRITICAL (0.95)                        │          │
│   │  Blast Radius: 9 downstream assets                      │          │
│   └─────────────────────────────────────────────────────────┘          │
│               │                                                        │
│               ▼ Autonomous Enforcement & Safety Gate                   │
│   ┌─────────────────────────────────────────────────────────┐          │
│   │  Decision: CONFIRMED_CRITICAL_RISK                      │          │
│   │  Safety Gate: Human Approval + Blast Radius Preview     │          │
│   │  Honesty: Reports INSUFFICIENT_EVIDENCE if disconnected │          │
│   └─────────────────────────────────────────────────────────┘          │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Why FalkorDB Is Required

**FalkorDB is the primary and authoritative graph database for ShadowLens.**

Every core capability depends directly on FalkorDB:

| Capability | FalkorDB Dependency |
|---|---|
| Multi-hop attack-path analysis | `shortestPath` Cypher query against FalkorDB |
| Attack-path enumeration | `allSimplePaths` Cypher query against FalkorDB |
| Privileged resource reachability | BFS traversal over FalkorDB graph edges |
| Blast-radius calculation | Bidirectional BFS (successors + predecessors) over FalkorDB |
| Graph-based risk escalation | Risk decay propagation (`R(v) = base * decay^hop`) over FalkorDB |
| Evidence-path visualization | Paths serialized from FalkorDB node/edge data |
| MCP graph tool execution | All 8 MCP graph tools call FalkorDB directly |
| Agent investigation decisions | Multi-hop evidence is retrieved exclusively from FalkorDB |

**If FalkorDB is removed or disabled:**
- Multi-hop attack-path analysis **stops working**
- Privileged reachability analysis **stops working**
- Graph-based risk escalation **stops working**
- Blast-radius calculation **stops working**
- Evidence-path visualization **stops working**
- Agent investigations **halt immediately** with `FAILED_GRAPH_UNAVAILABLE`

The application **does NOT silently fall back** to another database or hardcoded data. See the **Critical Verification Test** section below for measured results.

---

## 3. FalkorDB Graph Schema

### Node Labels

| Label | Entity Type | Example ID | Key Properties |
|---|---|---|---|
| `API_ENDPOINT` | Exposed HTTP surface | `endpoint:payment-v1` | url, method, public, risk_score |
| `FUNCTION` | Code function/method | `func:verify_token` | algorithm, file, parameters |
| `DEPENDENCY` | External package | `dep:pyjwt-vuln` | ecosystem, version, cve, fixed_in |
| `VULNERABILITY` | CVE entry | `vuln:cve-2024-sql-injection` | cvss_score, cve_id, affects |
| `DATABASE` | Data store | `db:prod-payments-db` | engine, pii_data, encrypted |
| `CLOUD_RESOURCE` | Cloud asset | `cloud:kms_master_key` | region, policy, secrets_protected |
| `FINDING` | Security finding | `finding:sec-309-priv-esc` | severity, scanner, confidence |
| `IAM_ROLE` | Cloud IAM role | `cloud:iam-role-worker` | permissions, scope, mfa |
| `TOOL` | Agent tool | `tool:cloud_admin_exec` | privilege_level, capabilities |
| `SERVICE` | Microservice | `service:transaction-service` | owner, sla, dependencies |
| `FILE` | Source file | `file:jwt_handler.py` | loc, language, last_modified |
| `REPOSITORY` | Code repository | `repo:shadowlens-core` | visibility, branch, stars |

### Relationship Types

| Relationship | Meaning | Example |
|---|---|---|
| `CALLS` | Function/service invocation | `endpoint:payment-v1 -[CALLS]-> controller:payment-controller` |
| `DEPENDS_ON` | Package dependency | `pkg:auth-token-core -[DEPENDS_ON]-> dep:pyjwt-vuln` |
| `QUERIES` | Database query execution | `repo:payment-repo -[QUERIES]-> query:raw-sql-executor` |
| `AFFECTS` | Vulnerability impact | `vuln:sql-injection -[AFFECTS]-> db:prod-payments-db` |
| `IMPORTS` | Code import | `file:jwt_handler.py -[IMPORTS]-> pkg:auth-token-core` |
| `TRIGGERS` | Tool/service trigger | `service:agent_router -[TRIGGERS]-> tool:cloud_admin_exec` |
| `EXPOSES` | API gateway exposure | `endpoint:api-gateway -[EXPOSES]-> endpoint:admin-portal` |
| `OBSERVED_IN` | Finding location | `finding:sec-309 -[OBSERVED_IN]-> func:execute_tool_action` |
| `RELATED_TO` | Semantic association | `finding:sec-309 -[RELATED_TO]-> vuln:cve-2023-iam-wildcard` |
| `ASSOCIATED_WITH` | Entity association | `cloud:iam-role -[ASSOCIATED_WITH]-> cloud:s3-prod-backups` |
| `ACCEPTS_INPUT` | Input flow | `input:user-query -[ACCEPTS_INPUT]-> endpoint:payment-v1` |
| `CONTAINS` | Containment | `file:jwt_handler.py -[CONTAINS]-> func:verify_token` |

---

## 4. Key FalkorDB Cypher Queries

All graph queries are executed via `FalkorDBGraphStore.query(cypher, params)` using the openCypher engine embedded in FalkorDB.

### Entity Search
```cypher
MATCH (n)
WHERE toLower(n.id) CONTAINS toLower($q)
   OR toLower(n.label) CONTAINS toLower($q)
RETURN n
LIMIT 20
```

### Neighbor Traversal (1-hop, both directions)
```cypher
MATCH (n {id: $node_id})-[r]-(m)
RETURN n, r, m
LIMIT 50
```

### Multi-Hop Shortest Path (shortestPath)
```cypher
MATCH p = shortestPath(
  (src {id: $source_id})-[*1..6]->(tgt {id: $target_id})
)
RETURN nodes(p) AS nodes, relationships(p) AS rels, length(p) AS hops
```

### Attack-Path Enumeration (allSimplePaths)
```cypher
MATCH p = (src {id: $source_id})-[*1..6]->(tgt {id: $target_id})
RETURN nodes(p) AS nodes, relationships(p) AS rels, length(p) AS hops
ORDER BY length(p) ASC
LIMIT 5
```

### Privileged Resource Reachability
```cypher
MATCH p = shortestPath(
  (src {id: $source_id})-[*1..6]->(target)
)
WHERE target.risk_level IN ['CRITICAL', 'HIGH']
   OR target.id CONTAINS 'kms'
   OR target.id CONTAINS 'admin'
RETURN target.id AS target_id, target.label AS label, length(p) AS hops
```

### Blast Radius (Downstream + Upstream, up to depth 4)
```cypher
MATCH (start {id: $entity_id})-[*1..4]-(affected)
WHERE affected.id <> $entity_id
RETURN DISTINCT affected.id AS id, affected.label AS label,
       affected.risk_level AS risk_level
```

### Risk Decay Propagation
```cypher
MATCH (src {id: $source_id})
MATCH p = (src)-[*1..5]->(target)
WITH target, length(p) AS dist
RETURN target.id AS node_id,
       src.risk_score * (0.75 ^ dist) AS propagated_risk
ORDER BY propagated_risk DESC
```

### Graph-Based Risk Assessment
```cypher
MATCH (n {id: $entity_id})-[*1..3]-(neighbor)
RETURN n.risk_score AS base_score,
       avg(neighbor.risk_score) AS neighborhood_avg,
       max(neighbor.risk_score) AS max_neighbor_risk
```

---

## 5. How MCP Tools Interact With FalkorDB

All MCP graph tools call `get_graph_store()` which returns the singleton `FalkorDBGraphStore` instance:

```
MCP Tool Call (via HTTP POST /api/mcp/call)
      │
      ▼
src/mcp/tools/graph_tools.py   (find_path, get_neighbors, search_entity, ...)
src/mcp/tools/analysis_tools.py (calculate_graph_risk, get_impact_analysis, ...)
      │
      ▼ get_graph_store()
src/graph/graph_store.py       (returns FalkorDBGraphStore singleton)
      │
      ▼ .query(cypher, params)  |  .find_shortest_path()  |  .get_blast_radius()
src/graph/falkordb_store.py    (FalkorDB openCypher + NetworkX in-memory mirror)
      │
      ▼
FalkorDB (port 6379, Redis-compatible protocol, embedded openCypher engine)
```

**MCP tools that directly depend on FalkorDB:**

| MCP Tool | FalkorDB Operation |
|---|---|
| `search_entity` | `query()` → openCypher MATCH with CONTAINS filter |
| `get_entity` | `get_node()` → lookup in FalkorDB node mirror |
| `get_neighbors` | `get_neighbors()` → edge traversal in FalkorDB |
| `find_path` | `find_shortest_path()` → networkx shortest path over FalkorDB graph |
| `calculate_graph_risk` | `calculate_risk_propagation()` → BFS decay over FalkorDB graph |
| `get_impact_analysis` | `get_blast_radius()` → bidirectional BFS over FalkorDB graph |
| `find_related_findings` | `get_neighbors()` → type-filtered traversal of FalkorDB |
| `create_finding` | `add_node() + add_edge()` → writes finding into FalkorDB |

---

## 6. Which Agent Decisions Depend on FalkorDB

Every agent reasoning step reads from or writes to FalkorDB:

```
Step 1: search_entity     → FalkorDB: find target entity node
Step 2: get_entity        → FalkorDB: read base risk score, properties
Step 3: get_neighbors     → FalkorDB: discover 1-hop perimeter
Step 4: find_path         → FalkorDB: shortestPath multi-hop attack chain
Step 5: calculate_graph_risk → FalkorDB: risk decay propagation BFS
Step 6: get_impact_analysis  → FalkorDB: blast radius bidirectional BFS
Step 7: find_related_findings → FalkorDB: type-filtered neighbor query
Step 8: create_finding    → FalkorDB: persist new finding node + edges
Step 9: take_remediation_action → FalkorDB: blast radius pre-execution check
```

The agent's final decision (`CONFIRMED_CRITICAL_RISK`, `INSUFFICIENT_EVIDENCE`, etc.) is **determined exclusively by graph evidence retrieved from FalkorDB**. No rule-based or keyword-based decisions are made without graph traversal.

---

## 7. Starting FalkorDB Locally

### Option A: Docker (recommended)
```bash
docker run -p 6379:6379 -it --rm falkordb/falkordb:latest
```

### Option B: Docker Compose (full stack)
```bash
docker compose up --build
```

This starts FalkorDB on port 6379, the FastAPI backend on port 8000, and the React frontend on port 5173.

### Option C: FalkorDB Cloud
Set `FALKORDB_HOST` and `FALKORDB_PORT` in your `.env` file to connect to FalkorDB Cloud.

### Connection Configuration
```env
FALKORDB_HOST=localhost
FALKORDB_PORT=6379
FALKORDB_GRAPH_NAME=shadowlens
```

### Verify FalkorDB is running
```bash
curl http://localhost:8000/api/graph/status
```
Expected response:
```json
{
  "primary_database": "FalkorDB",
  "authoritative": true,
  "status": "OPERATIONAL",
  "backend": "FalkorDB"
}
```

---

## 8. Critical Verification Test Results

**Test**: Temporarily remove/disable FalkorDB and verify that core graph capabilities halt completely without silent fallback.

**Method**: `store.set_operational(False)` disables FalkorDB; all calls raise `FalkorDBUnavailableError`.

**Measured Results** (from `tests/test_falkordb_verification.py`):

| Operation | FalkorDB ONLINE | FalkorDB DISABLED |
|---|---|---|
| `find_shortest_path()` | ✅ Returns 5-hop path | ❌ Raises `FalkorDBUnavailableError` |
| `get_blast_radius()` | ✅ Returns 9 affected assets | ❌ Raises `FalkorDBUnavailableError` |
| `calculate_risk_propagation()` | ✅ Returns CRITICAL (0.95) | ❌ Raises `FalkorDBUnavailableError` |
| `check_privileged_reachability()` | ✅ Returns KMS/admin paths | ❌ Raises `FalkorDBUnavailableError` |
| `search_nodes()` | ✅ Returns matching nodes | ❌ Raises `FalkorDBUnavailableError` |
| MCP `find_path` tool | ✅ `found: true` | ❌ `found: false, error: "FalkorDB is unavailable"` |
| MCP `get_impact_analysis` | ✅ `blast_count: 9` | ❌ `success: false, error: "FalkorDB is unavailable"` |
| MCP `calculate_graph_risk` | ✅ `overall: CRITICAL` | ❌ `success: false, error: "FalkorDB is unavailable"` |
| Agent investigation | ✅ `CONFIRMED_CRITICAL_RISK` | ❌ `FAILED_GRAPH_UNAVAILABLE` — halts immediately |
| Silent fallback | N/A | ❌ **None** — fails explicitly and loudly |

**Conclusion**: Removing FalkorDB causes every core graph-reasoning capability to fail with an explicit error. The system does NOT silently degrade to a working state using another backend.

**Run the verification yourself:**
```bash
python -m pytest tests/test_falkordb_verification.py -v
```
Expected: `3 passed`

---

## 9. Five Core Hackathon Capabilities

### 1. Real Data Ingestion & OSV Vulnerability Enrichment
- **GitHub & Codebase Ingestion**: Ingests real open-source repositories via Python AST static analysis.
- **Entity Discovery**: Extracts files, classes, functions, calls, tools, API routes, and database queries into FalkorDB.
- **Dependency & CVE Enrichment**: Parses `requirements.txt`, queries **OSV.dev** for live advisories, stores vulnerabilities in FalkorDB.
- **Dual-Source Toggle**: Switch between live real repository graphs and the verified offline seed dataset.

### 2. Measured Results & Benchmark Evaluation Framework
- **18 verified ground-truth scenarios** (15 multi-hop attack paths + 3 ambiguous/disconnected cases).
- **Fair Comparison** — identical inputs, two conditions:
  - **No-Graph Baseline**: Raw textual findings without graph traversal.
  - **Graph Agent**: Autonomous agent with FalkorDB-powered MCP graph tools.
- **Zero Fabrication** — all metrics computed by `BenchmarkEvaluator`:
  - **Path-Finding Accuracy**: Graph Agent **100%** vs Baseline **33.3%** (+66.7 pp)
  - **Exact Path Accuracy**: Graph Agent **100%** vs Baseline **22.2%** (+77.8 pp)
  - **Edge Recall**: Graph Agent **100%** vs Baseline **26.4%** (+73.6 pp)
  - **False Positives**: Baseline **2 FP** vs Graph Agent **0 FP**

### 3. Non-Obvious Graph Insight — Severity Escalation (Scenario 4)
- **The Finding**: `finding:sec-402-format-injection` — initially rated `MEDIUM`.
- **FalkorDB Path Discovered**: 4-hop chain via `func:format_agent_input` → `service:agent_router` → `tool:cloud_admin_exec` → `cloud:kms_master_key`.
- **Autonomous Escalation**: Agent escalates from **`MEDIUM` → `CRITICAL`** based on FalkorDB graph evidence.

### 4. Human-in-the-Loop & Blast Radius Safety Preview
- **Pre-Execution Gate**: Remediation actions placed in `AWAITING_APPROVAL`.
- **Blast Radius**: FalkorDB bidirectional BFS computes total impacted nodes, upstream and downstream assets.
- **Approval UI**: Operators approve/reject with full audit receipts and verification hashes.

### 5. Failure Honesty & Uncertainty Handling (Scenario 5)
- **The Finding**: `finding:sec-801-sandbox-leak` — test helper anomaly.
- **FalkorDB Query Result**: 0 paths to production datastores or cloud KMS keys.
- **Honest Output**: Agent reports **`INSUFFICIENT_EVIDENCE`**, blocks destructive actions, escalates to human review.

---

## 10. Pre-Seeded Investigation Scenarios

### Scenario 1: API Endpoint to SQL Injection (5-Hop Attack Path)
- **Target**: `endpoint:payment-v1`
- **FalkorDB Path**:
  `input:user-query` → `endpoint:payment-v1` → `controller:payment-controller` → `service:transaction-service` → `repo:payment-repo` → `query:raw-sql-executor` → `db:prod-payments-db`
- **Result**: `CRITICAL RISK` (Score: 0.95)

### Scenario 2: Compromised Dependency Blast Radius
- **Target**: `dep:pyjwt-vuln`
- **FalkorDB Evidence**: PyJWT (CVE-2022-29217) imported by `auth-token-core`, reaching `endpoint:admin-portal` via 2-hop path.
- **Result**: `HIGH RISK` across 6 affected downstream assets.

### Scenario 3: Privilege Escalation Attack Chain
- **Target**: `finding:sec-309-priv-esc`
- **FalkorDB Path**: `finding:sec-309` → `func:execute_tool_action` → `agent:tool-caller` → `cloud:iam-role-worker` → `cloud:s3-prod-customer-backups`
- **Result**: `CRITICAL RISK`

### Scenario 4: ⚡ Non-Obvious Insight (MEDIUM → CRITICAL)
- **Target**: `finding:sec-402-format-injection`
- **FalkorDB Path**: Minor template bug → `tool:cloud_admin_exec` → `cloud:kms_master_key`
- **Result**: Autonomously escalated from `MEDIUM` to `CRITICAL`.

### Scenario 5: Failure Honesty (Ambiguous Case)
- **Target**: `finding:sec-801-sandbox-leak`
- **FalkorDB Result**: 0 paths to production assets.
- **Result**: `INSUFFICIENT_EVIDENCE` → `ESCALATE_TO_HUMAN_REVIEW`

---

## 11. Architecture & Directory Structure

```
ShadowLens-Agent/
├── docker-compose.yml           # FalkorDB + Backend + Frontend
├── Dockerfile.backend           # Python 3.11 FastAPI backend
├── requirements.txt             # falkordb>=1.8.0, redis>=5.0.0, FastAPI, NetworkX, LiteLLM
├── .env.example                 # FALKORDB_HOST, FALKORDB_PORT, FALKORDB_GRAPH_NAME
│
├── src/
│   ├── graph/                   # Graph Layer
│   │   ├── schema.py            # Node & Edge domain schemas
│   │   ├── falkordb_store.py    # ★ FalkorDBGraphStore — PRIMARY authoritative store
│   │   ├── graph_store.py       # get_graph_store() → FalkorDBGraphStore singleton
│   │   └── seed_data.py         # Multi-hop seed topology & scenarios 1-5
│   │
│   ├── ingestion/               # Real Data Ingestion Engine
│   │   ├── repo_ingest.py       # AST static code analyzer → FalkorDB
│   │   └── vuln_enricher.py     # OSV.dev live query → FalkorDB
│   │
│   ├── evaluation/              # Benchmark Evaluation Engine
│   │   ├── dataset.py           # 18 ground-truth scenarios
│   │   └── evaluator.py         # Baseline vs Graph Agent benchmark runner
│   │
│   ├── mcp/                     # Model Context Protocol (MCP) Server
│   │   ├── server.py            # Tool registry & JSON-RPC dispatcher
│   │   └── tools/               # Graph tools & analysis tools (all call FalkorDB)
│   │
│   ├── agent/                   # Autonomous Investigation Agent
│   │   ├── state.py             # InvestigationState schema
│   │   ├── planner.py           # Multi-hop reasoning loop (FalkorDB connectivity check)
│   │   ├── explainer.py         # Structured explainability generator
│   │   └── agent.py             # ShadowLensAgent orchestrator
│   │
│   └── api/                     # REST API & WebSockets
│       ├── main.py              # Application entry point (FalkorDB metadata)
│       └── routes/
│           ├── graph_routes.py  # /api/graph/status, /api/graph/falkordb-toggle
│           ├── investigations.py
│           ├── mcp_routes.py
│           ├── findings_routes.py
│           ├── ingestion_routes.py
│           └── evaluation_routes.py
│
├── frontend/                    # Vite + React 19 Frontend
│   └── src/
│       ├── App.tsx
│       ├── components/
│       │   ├── ConnectedGraphViewer.tsx  # D3 Graph Canvas (FalkorDB-sourced)
│       │   ├── AgentTimeline.tsx         # Step-by-step execution stream
│       │   └── DecisionCard.tsx          # Blast radius + human approval UI
│       └── views/
│           ├── InvestigationView.tsx
│           ├── EvaluationView.tsx
│           ├── GraphExplorerView.tsx
│           └── FindingsView.tsx
│
└── tests/
    ├── test_agent_connected_data.py
    ├── test_api.py
    ├── test_new_requirements.py
    └── test_falkordb_verification.py  # ★ Critical Verification Test
```

---

## 12. Quickstart Guide (Local)

### Prerequisites
- Python 3.11+
- Node.js 18+ & npm
- Docker (for FalkorDB)

### Step 1: Start FalkorDB
```bash
docker run -p 6379:6379 -it --rm falkordb/falkordb:latest
```

### Step 2: Clone and Set Up Backend
```bash
git clone https://github.com/SabharishC98/ShadowLens-Agent.git
cd ShadowLens-Agent
pip install -r requirements.txt
python -m uvicorn src.api.main:app --host 0.0.0.0 --port 8000 --reload
```

### Step 3: Set Up Frontend
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 13. Docker Deployment (Full Stack)

```bash
docker compose up --build
```

| Service | URL |
|---|---|
| Frontend UI | `http://localhost:5173` |
| Backend API | `http://localhost:8000` |
| FalkorDB | `localhost:6379` (Redis protocol) |
| API Docs | `http://localhost:8000/docs` |
| FalkorDB Status | `http://localhost:8000/api/graph/status` |

---

## 14. Running Tests

```bash
# All 15 tests
python -m pytest tests/ -v

# FalkorDB-specific verification (3 tests)
python -m pytest tests/test_falkordb_verification.py -v
```

**Expected output: 15 passed**

Tests validate:
- FalkorDB is the primary and authoritative store (`test_falkordb_is_primary_store`)
- All 8 required FalkorDB graph operations execute correctly (`test_falkordb_required_operations`)
- **Critical Verification Test**: disabling FalkorDB halts all core capabilities with no silent fallback (`test_critical_verification_remove_falkordb`)
- Real data repository AST ingestion & OSV enrichment
- 18-scenario benchmark evaluation & metric calculations
- Non-obvious graph insight escalation (`MEDIUM` → `CRITICAL`)
- Human-in-the-loop action approval with blast radius previews
- Failure honesty & uncertainty handling (`INSUFFICIENT_EVIDENCE`)

---

## 15. MCP Tool Reference

| Tool | Category | FalkorDB Operation |
|---|---|---|
| `search_entity` | Graph | openCypher MATCH + CONTAINS |
| `get_entity` | Graph | Node lookup from FalkorDB mirror |
| `get_neighbors` | Graph | Edge traversal in FalkorDB |
| `find_path` | Graph | shortestPath via FalkorDB |
| `get_subgraph` | Graph | Ego-subgraph BFS from FalkorDB |
| `calculate_graph_risk` | Analysis | Risk decay BFS over FalkorDB |
| `get_impact_analysis` | Analysis | Bidirectional blast radius BFS over FalkorDB |
| `find_related_findings` | Analysis | Type-filtered neighbor query on FalkorDB |
| `create_finding` | Action | Write finding node+edges to FalkorDB |
| `take_remediation_action` | Action | Pre-execution blast radius from FalkorDB |

---

## 16. Authors & Hackathon Submission

- **Repository**: [SabharishC98/Argus](https://github.com/SabharishC98/Argus)
- **Theme**: Agents That Act on Connected Data
- **Primary Graph Database**: **FalkorDB** (openCypher, Redis-compatible, embedded graph engine)
- **Stack**: Autonomous Graph Agent + Model Context Protocol (MCP) + FalkorDB + NetworkX + React 19 / D3
