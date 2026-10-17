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

Unlike conventional security scanners and dashboards that emit disconnected alerts, ShadowLens builds an interconnected knowledge graph spanning repositories, endpoints, controllers, database queries, dependencies, cloud resources, and CVEs. 

It equips an autonomous agent with the **Model Context Protocol (MCP)** to traverse multiple graph hops, execute graph algorithms, evaluate cascading risk, take defensive actions, and generate a step-by-step, explainable evidence trail.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SHADOWLENS AGENT LOOP                           │
│                                                                        │
│   User Prompt / Incident Finding                                      │
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
│   └─────────────────────────────────────────────────────────┘          │
│               │                                                        │
│               ▼ Graph Evidence Discovered                              │
│   ┌─────────────────────────────────────────────────────────┐          │
│   │  Multi-Hop Attack Path (Endpoint → DB Injection)        │          │
│   │  Cascading Risk Propagation Score: CRITICAL (0.95)      │          │
│   │  Downstream Blast Radius: 6 Reachable Assets            │          │
│   └─────────────────────────────────────────────────────────┘          │
│               │                                                        │
│               ▼ Autonomous Enforcement                                 │
│   ┌─────────────────────────────────────────────────────────┐          │
│   │  Decision: CONFIRMED_CRITICAL_RISK                      │          │
│   │  Action: quarantine_endpoint() (Simulation Verified)    │          │
│   │  Explanation: Cryptographic Evidence Trail Generated    │          │
│   └─────────────────────────────────────────────────────────┘          │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Problem: Disconnected Findings

Modern security and software operations suffer from **relational blindness**:
- A static scanner reports an unvalidated parameter in an API controller (`LOW` or `MEDIUM` severity in isolation).
- A dependency scanner reports a vulnerable sub-dependency (`CVE-2022-29217`).
- An IAM scanner flags an agent role with broad cloud permissions.

Because existing security tooling views these as isolated alerts, security engineers miss the critical composite truth:
> *User input from an external endpoint flows across 5 hops through an orchestrator, service, and repository into an unsanitized SQL query against the production payments database.*

---

## 3. Solution: Connected Graph + Autonomous MCP Agent

ShadowLens models the entire architecture as a **first-class connected graph**:
- **Nodes**: `Repository`, `File`, `Class`, `Function`, `APIEndpoint`, `UserInput`, `DatabaseQuery`, `Dependency`, `Vulnerability`, `Finding`, `CloudResource`, `Account`.
- **Relationships**: `CONTAINS`, `CALLS`, `IMPORTS`, `DEPENDS_ON`, `EXPOSES`, `ACCEPTS_INPUT`, `QUERIES`, `AFFECTS`, `TRIGGERS`, `RELATED_TO`.

The agent:
1. **Discovers tools dynamically** via the Model Context Protocol (MCP).
2. **Traverses multi-hop execution and dependency chains** (2-hop, 3-hop, and 5+ hop reasoning).
3. **Executes graph algorithms** (shortest path, Dijkstra, BFS ego-graphs, blast radius, risk decay propagation, and degree/betweenness centrality).
4. **Reaches explainable decisions** backed by exact node and relationship paths.
5. **Takes autonomous defensive actions** (e.g. quarantining endpoints, revoking wildcard IAM permissions, or patching dependencies) with verifiable receipts.

---

## 4. Key Features

- **Multi-Hop Reasoning**: Traces complex, indirect vulnerability and data exfiltration paths across code, microservices, and databases.
- **Model Context Protocol (MCP)**: Implements standard MCP tools (`search_entity`, `get_entity`, `get_neighbors`, `find_path`, `calculate_graph_risk`, `get_impact_analysis`, `create_finding`, `take_remediation_action`).
- **Graph Algorithms as Agent Tools**:
  - *Shortest / Relevant Path*: Traces execution paths between suspicious entities and critical assets.
  - *Neighborhood Traversal*: N-hop ego graph perimeter discovery.
  - *Blast Radius Calculation*: Evaluates downstream assets impacted by a compromised node.
  - *Risk Propagation*: Calculates cascading risk decay along data-flow and dependency edges.
  - *Centrality Metrics*: Identifies security bottlenecks and high-exposure choke points.
- **Dual-Backend Graph Layer**:
  - Native **Neo4j** with Cypher queries.
  - Zero-dependency **InMemory NetworkX Engine** that runs offline with 100% reliability out of the box without external services.
- **Explainability by Design**: Every decision produces an executive summary, evidence points, and highlighted multi-hop paths.
- **Autonomous Remediation with Receipts**: Simulates or enforces actions (quarantine, virtual patch, permission revocation) with cryptographic verification hashes.
- **Interactive D3 Graph Canvas**: Zoom, pan, inspect node attributes, and watch animated directional flows across discovered attack paths.
- **Backward Compatibility**: Fully preserves original ShadowLens attack simulation, classifier, and trust boundary monitoring.

---

## 5. Pre-Seeded Investigation Scenarios

ShadowLens includes three deterministic demonstration scenarios:

### Scenario 1: API Endpoint to SQL Injection (5-Hop Attack Path)
- **Prompt**: `"Investigate suspicious API endpoint payment-v1 reaching production database"`
- **Discovered Path**:
  `input:user-query` → `endpoint:payment-v1` → `controller:payment-controller` → `service:transaction-service` → `repo:payment-repo` → `query:raw-sql-executor` → `db:prod-payments-db`
- **Result**: `CRITICAL RISK` (Score: 0.95).
- **Autonomous Action**: `quarantine_endpoint` enforced in simulation mode.

### Scenario 2: Compromised Dependency Blast Radius
- **Prompt**: `"Determine blast radius of compromised dependency dep:pyjwt-vuln"`
- **Connected Graph Evidence**: PyJWT (CVE-2022-29217) is imported by `auth-token-core`, used by `jwt_handler.py`, called by `endpoint:auth-login` and `endpoint:admin-portal`.
- **Result**: `HIGH RISK` across 6 affected downstream assets.
- **Autonomous Action**: `patch_dependency` dispatched.

### Scenario 3: Privilege Escalation Attack Chain
- **Prompt**: `"Trace privilege escalation path from finding SEC-309 to S3 customer backups"`
- **Connected Graph Evidence**: Finding F-309 links unvalidated tool execution in the subagent to an over-privileged IAM Role (`AgentWorkerRole`) with access to production S3 backups.
- **Result**: `CRITICAL RISK`.
- **Autonomous Action**: `revoke_iam_permission` dispatched.

---

## 6. Architecture & Directory Structure

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
│   │   ├── seed_data.py         # Multi-hop seed topology & scenarios
│   │   └── algorithms/          # Shortest path, blast radius, risk decay, centrality
│   │
│   ├── mcp/                     # Model Context Protocol (MCP) Server
│   │   ├── server.py            # Tool registry & JSON-RPC dispatcher
│   │   └── tools/               # Graph tools, analysis tools, action tools
│   │
│   ├── agent/                   # Autonomous Investigation Agent
│   │   ├── state.py             # Investigation state & timeline schema
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
│           ├── findings_routes.py# /api/findings & /api/actions
│           └── runs.py          # Original ShadowLens trust boundary pipeline
│
├── frontend/                    # Vite + React 19 Frontend
│   ├── Dockerfile.frontend
│   ├── src/
│   │   ├── App.tsx              # Main navigation & runtime health
│   │   ├── components/
│   │   │   ├── ConnectedGraphViewer.tsx # Interactive D3 Graph Canvas
│   │   │   ├── AgentTimeline.tsx        # Step-by-step execution stream
│   │   │   └── DecisionCard.tsx         # Risk meter, attack path & action receipts
│   │   ├── views/
│   │   │   ├── InvestigationView.tsx    # Primary autonomous agent view
│   │   │   ├── GraphExplorerView.tsx    # Interactive graph exploration
│   │   │   └── FindingsView.tsx         # Findings & actions ledger
│   │   └── services/api.ts      # Typed REST client
│
└── tests/                       # Automated Pytest Suite
    ├── test_agent_connected_data.py
    └── test_api.py
```

---

## 7. Quickstart Guide (Local)

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

## 8. Docker Deployment

To launch the complete stack with Neo4j, Backend, and Frontend in a single command:

```bash
docker compose up --build
```

- **Frontend UI**: `http://localhost:5173`
- **Backend API**: `http://localhost:8000`
- **Neo4j Browser**: `http://localhost:7474` (User: `neo4j`, Password: `shadowlens_password`)

---

## 9. Running Tests

ShadowLens-Agent includes an automated test suite covering graph algorithms, MCP tool schemas, autonomous reasoning, and API routes:

```bash
python -m pytest tests/test_agent_connected_data.py tests/test_api.py -v
```

All 7 test suites validate:
- 5-hop path discovery (`input:user-query` → `db:prod-payments-db`)
- Downstream blast radius computation
- Risk propagation calculation
- MCP tool execution and input validation
- Full autonomous agent investigation loops
- REST API endpoints and responses

---

## 10. Model Context Protocol (MCP) Tool Reference

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
| `take_remediation_action` | Action | Execute autonomous mitigation with cryptographic verification |

---

## 11. Verification & Security Disclaimers

Remediation actions taken by the autonomous agent default to **Simulation Mode** (`simulation: true`). In simulation mode, defensive operations (endpoint quarantine, rate-limiting, IAM permission revocation, virtual dependency patching) generate verifiable cryptographic action receipts and rollback records without disrupting production infrastructure.

---

## 12. Authors & Hackathon Submission

- **Repository**: [SabharishC98/ShadowLens-Agent](https://github.com/SabharishC98/ShadowLens-Agent)
- **Built for**: Agents That Act on Connected Data Hackathon 2026
- **Architecture**: Autonomous Graph Agent + Model Context Protocol (MCP) + Neo4j / NetworkX
