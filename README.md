# ShadowLens-Agent
### Autonomous Graph-Powered Investigation Agent That Acts on Connected Data

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python: 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111.0-009688.svg)](https://fastapi.tiangolo.com/)
[![React: 19](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![Neo4j](https://img.shields.io/badge/Neo4j-5.x-008CC1.svg)](https://neo4j.com/)
[![MCP](https://img.shields.io/badge/Protocol-MCP-8A2BE2.svg)](https://modelcontextprotocol.io/)

---

## 1. What is ShadowLens-Agent?

**ShadowLens-Agent** is an autonomous investigation system designed for the hackathon theme **"Agents That Act on Connected Data"**. 

Unlike conventional security scanners and dashboards that emit isolated alerts, ShadowLens builds an interconnected knowledge graph spanning repositories, endpoints, controllers, database queries, dependencies, cloud resources, and CVEs. 

It equips an autonomous agent with the **Model Context Protocol (MCP)** to traverse multiple graph hops, execute graph algorithms, evaluate cascading risk, take defensive actions, and generate a step-by-step, explainable evidence trail.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SHADOWLENS AGENT LOOP                           │
│                                                                        │
│   User Prompt / Incident Finding / Real Repository                     │
│               │                                                        │
│               ▼                                                        │
│   ┌───────────────────────┐         MCP Tool Calling                   │
│   │   ShadowLens Agent    │ ────────────────────────────────┐          │
│   │   (Planner & Reasoner)│ ◄───────────────────────────────┤          │
│   └───────────────────────┘                                 ▼          │
│               │                                   ┌──────────────────┐ │
│               │ Dynamic Tool Selection            │    MCP Server    │ │
│               ▼                                   └──────────────────┘ │
│   ┌─────────────────────────────────────────────────────────┐ │        │
│   │ 1. search_entity()       5. calculate_graph_risk()      │ │        │
│   │ 2. get_entity()          6. get_impact_analysis()       │ │        │
│   │ 3. get_neighbors()       7. create_finding()            │ │        │
│   │ 4. find_path()           8. take_remediation_action()   │ │        │
│   └─────────────────────────────────────────────────────────┘ │        │
│               │                                                        │
│               ▼ Graph Queries & Algorithms                             │
│   ┌─────────────────────────────────────────────────────────┐          │
│   │         Connected Security Knowledge Graph              │          │
│   │      (Neo4j Cypher / NetworkX InMemory Engine)          │          │
│   │      Enriched with Live AST & OSV Vulnerability Feeds   │          │
│   └─────────────────────────────────────────────────────────┘          │
│               │                                                        │
│               ▼ Graph Evidence Discovered                              │
│   ┌─────────────────────────────────────────────────────────┐          │
│   │  Multi-Hop Attack Path (Endpoint → DB / KMS Key)        │          │
│   │  Cascading Risk Propagation Score: CRITICAL (0.95)      │          │
│   │  Pre-Execution Blast Radius: Upstream / Downstream      │          │
│   └─────────────────────────────────────────────────────────┘          │
│               │                                                        │
│               ▼ Autonomous Enforcement & Safety Gate                   │
│   ┌─────────────────────────────────────────────────────────┐          │
│   │  Decision: CONFIRMED_CRITICAL_RISK                      │          │
│   │  Safety Gate: Human Approval with Blast Radius Preview  │          │
│   │  Honesty: Reports INSUFFICIENT_EVIDENCE if disconnected │          │
│   │  Explanation: Cryptographic Evidence Trail Generated    │          │
│   └─────────────────────────────────────────────────────────┘          │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Five Core Hackathon Capabilities

### 1. Real Data Ingestion & OSV Vulnerability Enrichment
- **GitHub & Codebase Ingestion**: Ingests real open-source repositories (e.g., `https://github.com/pallets/flask`) or local codebases via Python AST static analysis.
- **Entity Discovery**: Extracts files, classes, functions, calls, tools, API routes, and database queries into the connected graph.
- **Dependency & CVE Enrichment**: Parses `requirements.txt` and `package.json`, then enriches dependencies with live vulnerability advisories from the **OSV.dev** database (with local caching and offline fallback).
- **Dual-Source Toggle**: Easily switch between live real repository graphs and the verified offline seed demo dataset with 1 click.

### 2. Measured Results & Benchmark Evaluation Framework
- **Empirical Ground-Truth Dataset**: 18 independently verified ground-truth scenarios (15 multi-hop attack paths + 3 ambiguous/disconnected cases).
- **Fair Comparison**: Runs identical LLM inputs against:
  - **No-Graph Baseline**: Raw textual findings and keywords without graph traversal tools.
  - **Graph Agent**: Autonomous agent using MCP graph tools, multi-hop pathfinding, and risk algorithms.
- **Zero Fabrication**: All reported metrics are directly computed by `BenchmarkEvaluator`:
  - **Path-Finding Accuracy**: Graph Agent **100%** vs Baseline **33.3%** (+66.7 pp improvement)
  - **Exact Path Accuracy**: Graph Agent **100%** vs Baseline **22.2%** (+77.8 pp improvement)
  - **Edge Recall**: Graph Agent **100%** vs Baseline **26.4%** (+73.6 pp improvement)
  - **False Positives**: Baseline **2 FP** (fooled by keyword mentions) vs Graph Agent **0 FP**

### 3. Non-Obvious Graph Insight (Scenario 4)
- **The Finding**: `finding:sec-402-format-injection` starts as an apparently low-impact string formatting issue (`MEDIUM` severity).
- **The Graph Truth**: The agent uncovers a 4-hop execution chain:
  `finding:sec-402-format-injection` → `func:format_agent_input` → `service:agent_router` → `tool:cloud_admin_exec` → `cloud:kms_master_key`
- **Autonomous Escalation**: Because the format injection flows directly into a privileged tool holding master key decryption rights, the agent autonomously escalates the finding from **`MEDIUM` → `CRITICAL`**.

### 4. Human-in-the-Loop & Blast Radius Safety Preview
- **Pre-Execution Gate**: High-risk remediation actions (quarantine endpoint, revoke IAM permissions, isolate database) are placed in `AWAITING_APPROVAL`.
- **Pre-Execution Blast Radius**: The agent computes and displays:
  - Total impacted nodes count
  - Upstream dependencies affected
  - Downstream services impacted
  - Shielded/protected high-value assets
- **Approval Actions**: Operators can click **`[Approve & Enforce Action]`** or **`[Reject]`** directly in the UI with full audit receipts.

### 5. Failure Honesty & Uncertainty Handling (Scenario 5)
- **The Ambiguous Finding**: `finding:sec-801-sandbox-leak` occurs in an isolated test helper file.
- **Honest Traversal**: The agent probes reachability to sensitive databases and cloud KMS keys.
- **No Hallucination**: Finding 0 complete execution paths, the agent refuses to hallucinate risk and reports **`INSUFFICIENT_EVIDENCE`**.
- **Safe Escalation**: The agent sets decision to `ESCALATE_TO_HUMAN_REVIEW` and blocks destructive automated actions to avoid false-positive service disruptions.

---

## 3. Pre-Seeded Investigation Scenarios

### Scenario 1: API Endpoint to SQL Injection (5-Hop Attack Path)
- **Target**: `endpoint:payment-v1`
- **Discovered Path**:
  `input:user-query` → `endpoint:payment-v1` → `controller:payment-controller` → `service:transaction-service` → `repo:payment-repo` → `query:raw-sql-executor` → `db:prod-payments-db`
- **Result**: `CRITICAL RISK` (Score: 0.95).

### Scenario 2: Compromised Dependency Blast Radius
- **Target**: `dep:pyjwt-vuln`
- **Evidence**: PyJWT (CVE-2022-29217) is imported by `auth-token-core`, affecting `endpoint:auth-login` and `endpoint:admin-portal`.
- **Result**: `HIGH RISK` across 6 affected downstream assets.

### Scenario 3: Privilege Escalation Attack Chain
- **Target**: `finding:sec-309-priv-esc`
- **Evidence**: Subagent tool execution links to over-privileged `AgentWorkerRole` accessing S3 backups.
- **Result**: `CRITICAL RISK`.

### Scenario 4: ⚡ 2-Minute Demo: Non-Obvious Insight (MEDIUM → CRITICAL)
- **Target**: `finding:sec-402-format-injection`
- **Evidence**: Minor template bug reaches `tool:cloud_admin_exec` with decryption access to `cloud:kms_master_key`.
- **Result**: Autonomously escalated from `MEDIUM` to `CRITICAL`.

### Scenario 5: Failure Honesty (Ambiguous Case)
- **Target**: `finding:sec-801-sandbox-leak`
- **Evidence**: 0 paths connect test helper anomaly to production datastores or cloud keys.
- **Result**: `INSUFFICIENT_EVIDENCE` → `ESCALATE_TO_HUMAN_REVIEW`.

---

## 4. Architecture & Directory Structure

```
ShadowLens-Agent/
├── docker-compose.yml           # Multi-container setup (Neo4j, Backend, Frontend)
├── Dockerfile.backend           # Python 3.11 FastAPI backend
├── requirements.txt             # Backend dependencies (FastAPI, NetworkX, Neo4j, LiteLLM)
├── .env.example                 # Environment variables reference
│
├── src/
│   ├── graph/                   # Graph Layer
│   │   ├── schema.py            # Node & Edge domain schemas (GraphNode, GraphEdge, GraphPath)
│   │   ├── graph_store.py       # Dual backend: Neo4jGraphStore & InMemoryGraphStore
│   │   ├── seed_data.py         # Multi-hop seed topology & scenarios 1-5
│   │   └── algorithms/          # Shortest path, blast radius, risk decay, centrality
│   │
│   ├── ingestion/               # Real Data Ingestion Engine
│   │   ├── repo_ingest.py       # AST static code analyzer & graph constructor
│   │   └── vuln_enricher.py     # OSV.dev live query client & vulnerability normalizer
│   │
│   ├── evaluation/              # Benchmark Evaluation Engine
│   │   ├── dataset.py           # 18 ground-truth scenarios with verified paths
│   │   └── evaluator.py         # Baseline vs Graph Agent benchmark runner
│   │
│   ├── mcp/                     # Model Context Protocol (MCP) Server
│   │   ├── server.py            # Tool registry & JSON-RPC dispatcher
│   │   └── tools/               # Graph tools, analysis tools, action tools
│   │
│   ├── agent/                   # Autonomous Investigation Agent
│   │   ├── state.py             # Investigation state, escalation & uncertainty schema
│   │   ├── planner.py           # Multi-hop reasoning loop & tool selector
│   │   ├── explainer.py         # Structured explainability generator
│   │   └── agent.py             # ShadowLensAgent orchestrator
│   │
│   └── api/                     # REST API & WebSockets
│       ├── main.py              # Application entry point
│       └── routes/
│           ├── investigations.py# /api/investigations (Agent runner & streaming)
│           ├── graph_routes.py  # /api/graph (Topology & algorithms)
│           ├── mcp_routes.py    # /api/mcp (Tool schemas & calls)
│           ├── findings_routes.py# /api/findings & /api/actions (Approve/Reject)
│           ├── ingestion_routes.py# /api/ingestion (Repository ingestion & reset)
│           └── evaluation_routes.py# /api/evaluation (Benchmark execution & metrics)
│
├── frontend/                    # Vite + React 19 Frontend
│   ├── src/
│   │   ├── App.tsx              # Main navigation & runtime health
│   │   ├── components/
│   │   │   ├── ConnectedGraphViewer.tsx # Interactive D3 Graph Canvas
│   │   │   ├── AgentTimeline.tsx        # Step-by-step execution stream
│   │   │   └── DecisionCard.tsx         # Escalation card, blast radius preview & human approval
│   │   ├── views/
│   │   │   ├── InvestigationView.tsx    # Primary autonomous agent view & repo ingestion bar
│   │   │   ├── EvaluationView.tsx       # Comparative benchmark dashboard (18 scenarios)
│   │   │   ├── GraphExplorerView.tsx    # Interactive graph exploration
│   │   │   └── FindingsView.tsx         # Findings & actions ledger
│   │   └── services/api.ts      # Typed REST client
│
└── tests/                       # Automated Pytest Suite
    ├── test_agent_connected_data.py
    ├── test_api.py
    └── test_new_requirements.py # Tests for ingestion, evaluation, escalation & safety
```

---

## 5. Quickstart Guide (Local)

### Prerequisites
- Python 3.11+
- Node.js 18+ & npm

### Step 1: Clone and Set Up Backend
```bash
# Clone the repository
git clone https://github.com/SabharishC98/ShadowLens-Agent.git
cd ShadowLens-Agent

# Install Python dependencies
pip install -r requirements.txt

# Run backend API server
python -m uvicorn src.api.main:app --host 0.0.0.0 --port 8000 --reload
```
The backend initializes the graph and MCP server immediately at `http://localhost:8000`.
Visit `http://localhost:8000/docs` for the interactive Swagger UI.

### Step 2: Set Up Frontend
```bash
# In a new terminal window:
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 6. Docker Deployment

To launch the complete stack with Neo4j, Backend, and Frontend in a single command:

```bash
docker compose up --build
```

- **Frontend UI**: `http://localhost:5173`
- **Backend API**: `http://localhost:8000`
- **Neo4j Browser**: `http://localhost:7474` (User: `neo4j`, Password: `shadowlens_password`)

---

## 7. Running Tests

ShadowLens-Agent includes 12 automated unit and integration tests:

```bash
python -m pytest tests/ -v
```

All 12 test suites validate:
- Real data repository AST ingestion & OSV vulnerability enrichment
- 18-scenario benchmark evaluation execution & metric calculations
- Non-obvious graph insight escalation (`MEDIUM` → `CRITICAL`)
- Human-in-the-loop action approval & rejection with blast radius previews
- Failure honesty & uncertainty handling (`INSUFFICIENT_EVIDENCE`)
- Multi-hop path discovery (`input:user-query` → `db:prod-payments-db`)
- Downstream blast radius computation & risk propagation calculation
- MCP tool execution and input validation

---

## 8. Model Context Protocol (MCP) Tool Reference

| Tool Name | Category | Description |
|---|---|---|
| `search_entity` | Graph | Search nodes by query string or entity type |
| `get_entity` | Graph | Retrieve node attributes, metadata, and base risk score |
| `get_neighbors` | Graph | Traverse 1-to-N hops around an entity with direction filters |
| `find_path` | Graph | Multi-hop shortest path between source and target entities |
| `get_subgraph` | Graph | Extract ego-subgraph centered around an entity |
| `find_related_entities` | Graph | Query semantic connections and reverse dependencies |
| `calculate_graph_risk` | Analysis | Quantitative risk propagation decay calculation |
| `get_impact_analysis` | Analysis | Downstream blast radius and affected asset count |
| `find_related_findings` | Analysis | Query existing security findings connected to node |
| `create_finding` | Action | Log security finding and link into live knowledge graph |
| `update_finding` | Action | Update finding status (TRIAGED, MITIGATED, RESOLVED) |
| `take_remediation_action` | Action | Propose remediation with pre-execution blast radius preview |

---

## 9. Authors & Hackathon Submission

- **Repository**: [SabharishC98/ShadowLens-Agent](https://github.com/SabharishC98/ShadowLens-Agent)
- **Theme**: Agents That Act on Connected Data
- **Stack**: Autonomous Graph Agent + Model Context Protocol (MCP) + Neo4j / NetworkX + React 19 / D3
