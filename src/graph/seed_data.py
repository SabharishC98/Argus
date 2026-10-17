"""
Seed data generator for the ShadowLens Connected Security Knowledge Graph.
Populates deterministic, rich topologies for multi-hop investigations:
- 5+ hop attack path (API Endpoint -> Controller -> Service -> Repository -> Raw SQL Query -> Production DB)
- Blast radius path (Compromised PyJWT Dependency -> Auth Core -> Handlers -> Admin & User Endpoints)
- Attack chain from Finding (Finding F-309 -> Agent Tool Caller -> Worker IAM Role -> Production S3 Bucket)
"""

from __future__ import annotations
import logging
from src.graph.graph_store import BaseGraphStore
from src.graph.schema import EntityType, GraphEdge, GraphNode, RelationType

logger = logging.getLogger(__name__)


def seed_security_graph(store: BaseGraphStore) -> None:
    logger.info("Seeding security knowledge graph...")

    # ── 1. NODES ──────────────────────────────────────────────────────────────
    nodes = [
        # Scenario 1 Nodes: Payment API to Raw SQL Injection
        GraphNode(
            id="input:user-query",
            label="User HTTP Request Payload",
            type=EntityType.USER_INPUT,
            risk_level="HIGH",
            risk_score=0.75,
            properties={"source_ip": "198.51.100.42", "sanitized": False, "contains_sql_chars": True},
        ),
        GraphNode(
            id="endpoint:payment-v1",
            label="POST /api/v1/payments/process",
            type=EntityType.API_ENDPOINT,
            risk_level="HIGH",
            risk_score=0.82,
            properties={"auth_required": True, "rate_limited": False, "framework": "FastAPI", "port": 8000},
        ),
        GraphNode(
            id="controller:payment-controller",
            label="PaymentController.process()",
            type=EntityType.CLASS,
            risk_level="MEDIUM",
            risk_score=0.60,
            properties={"file": "src/controllers/payment.py", "lines": "45-98"},
        ),
        GraphNode(
            id="service:transaction-service",
            label="TransactionService.execute()",
            type=EntityType.FUNCTION,
            risk_level="MEDIUM",
            risk_score=0.65,
            properties={"file": "src/services/transaction.py", "async": True},
        ),
        GraphNode(
            id="repo:payment-repo",
            label="PaymentRepository.find_by_filter()",
            type=EntityType.FUNCTION,
            risk_level="HIGH",
            risk_score=0.85,
            properties={"file": "src/repositories/payment.py", "pattern": "dynamic_query_builder"},
        ),
        GraphNode(
            id="query:raw-sql-executor",
            label="Raw SQLExecutor (SELECT * FROM tx WHERE id = $input)",
            type=EntityType.DATABASE_QUERY,
            risk_level="CRITICAL",
            risk_score=0.95,
            properties={"parameterized": False, "dialect": "PostgreSQL 15", "driver": "asyncpg"},
        ),
        GraphNode(
            id="db:prod-payments-db",
            label="Production Payments PostgreSQL Database",
            type=EntityType.DATABASE_QUERY,
            risk_level="CRITICAL",
            risk_score=0.98,
            properties={"cluster": "aws-rds-us-east-1", "pii_stored": True, "pci_dss": True},
        ),
        GraphNode(
            id="vuln:cve-2024-sql-injection",
            label="CVE-2024-5120: Unsanitized SQL Query Injection in Transaction Filter",
            type=EntityType.VULNERABILITY,
            risk_level="CRITICAL",
            risk_score=0.96,
            properties={"cvss": 9.8, "vector": "NETWORK", "exploit_available": True},
        ),

        # Scenario 2 Nodes: Compromised Dependency Blast Radius
        GraphNode(
            id="dep:pyjwt-vuln",
            label="pyjwt==2.4.0 (CVE-2022-29217)",
            type=EntityType.DEPENDENCY,
            risk_level="CRITICAL",
            risk_score=0.92,
            properties={"ecosystem": "PyPI", "current_version": "2.4.0", "fixed_in": "2.4.1", "cve": "CVE-2022-29217"},
        ),
        GraphNode(
            id="pkg:auth-token-core",
            label="auth-token-core (Internal Security Lib)",
            type=EntityType.FILE,
            risk_level="HIGH",
            risk_score=0.78,
            properties={"version": "1.2.0", "maintainer": "security-core-team"},
        ),
        GraphNode(
            id="file:jwt_handler.py",
            label="src/auth/jwt_handler.py",
            type=EntityType.FILE,
            risk_level="HIGH",
            risk_score=0.74,
            properties={"loc": 280, "functions": ["verify_token", "create_access_token"]},
        ),
        GraphNode(
            id="func:verify_token",
            label="verify_token(token: str) -> Claims",
            type=EntityType.FUNCTION,
            risk_level="HIGH",
            risk_score=0.84,
            properties={"algorithm": "RS256_or_HS256_insecure_fallback"},
        ),
        GraphNode(
            id="endpoint:auth-login",
            label="POST /api/v1/auth/login",
            type=EntityType.API_ENDPOINT,
            risk_level="MEDIUM",
            risk_score=0.62,
            properties={"public": True, "active_sessions_hour": 1420},
        ),
        GraphNode(
            id="endpoint:admin-portal",
            label="GET /api/v1/admin/tenants",
            type=EntityType.API_ENDPOINT,
            risk_level="CRITICAL",
            risk_score=0.94,
            properties={"role_required": "SUPER_ADMIN", "confidential": True},
        ),
        GraphNode(
            id="account:admin-root",
            label="Master Admin Root Credentials",
            type=EntityType.ACCOUNT,
            risk_level="CRITICAL",
            risk_score=0.99,
            properties={"mfa_enabled": False, "scoped_tenants": "ALL"},
        ),
        GraphNode(
            id="endpoint:api-gateway",
            label="CloudFront / Envoy API Gateway",
            type=EntityType.API_ENDPOINT,
            risk_level="MEDIUM",
            risk_score=0.55,
            properties={"domain": "api.shadowlens.internal", "waf_active": True},
        ),

        # Scenario 3 Nodes: Finding Privilege Escalation to Cloud Exfiltration
        GraphNode(
            id="finding:sec-309-priv-esc",
            label="SEC-309: Unvalidated Agent Tool Execution Privilege Escalation",
            type=EntityType.FINDING,
            risk_level="HIGH",
            risk_score=0.88,
            properties={"scanner": "ShadowLens-Observer", "status": "TRIAGED", "discovered_at": "2026-10-15T12:00:00Z"},
        ),
        GraphNode(
            id="func:execute_tool_action",
            label="ToolCallerAgent.execute_action()",
            type=EntityType.FUNCTION,
            risk_level="HIGH",
            risk_score=0.81,
            properties={"module": "src.pipeline.agents", "sandbox": False},
        ),
        GraphNode(
            id="agent:tool-caller",
            label="ShadowLens Tool-Caller Subagent",
            type=EntityType.ACCOUNT,
            risk_level="HIGH",
            risk_score=0.83,
            properties={"runtime": "LangGraph", "system_prompt_overridable": True},
        ),
        GraphNode(
            id="cloud:iam-role-worker",
            label="AWS IAM Role: AgentWorkerRole",
            type=EntityType.CLOUD_RESOURCE,
            risk_level="CRITICAL",
            risk_score=0.91,
            properties={"arn": "arn:aws:iam::123456789012:role/AgentWorkerRole", "policies": ["s3:*", "secretsmanager:Get*"]},
        ),
        GraphNode(
            id="cloud:s3-prod-customer-backups",
            label="S3 Bucket: shadowlens-prod-customer-backups-us-east-1",
            type=EntityType.CLOUD_RESOURCE,
            risk_level="CRITICAL",
            risk_score=0.99,
            properties={"encryption": "AES256", "public_access": False, "size_gb": 4500},
        ),
        GraphNode(
            id="vuln:cve-2023-iam-wildcard",
            label="CVE-2023-3801: Over-permissive IAM Wildcard in Task Execution Agent",
            type=EntityType.VULNERABILITY,
            risk_level="HIGH",
            risk_score=0.87,
            properties={"remediation": "Restrict policy to Least Privilege"},
        ),

        # Scenario 4 Nodes: Non-Obvious Graph Insight (MEDIUM -> CRITICAL Escalation)
        GraphNode(
            id="finding:sec-402-format-injection",
            label="SEC-402: Minor Template String Formatting Anomaly",
            type=EntityType.FINDING,
            risk_level="MEDIUM",
            risk_score=0.50,
            properties={"initial_severity": "MEDIUM", "scanner": "StaticCodeAnalyzer", "source": "src/agent/formatter.py"},
        ),
        GraphNode(
            id="func:format_agent_input",
            label="format_agent_input(template, payload)",
            type=EntityType.FUNCTION,
            risk_level="MEDIUM",
            risk_score=0.55,
            properties={"file": "src/agent/formatter.py", "sanitization": "partial"},
        ),
        GraphNode(
            id="service:agent_router",
            label="AgentRouter.dispatch_task()",
            type=EntityType.FUNCTION,
            risk_level="HIGH",
            risk_score=0.75,
            properties={"file": "src/agent/router.py", "evaluates_dynamic_tools": True},
        ),
        GraphNode(
            id="tool:cloud_admin_exec",
            label="Privileged Tool: CloudAdminExec",
            type=EntityType.API_ENDPOINT,
            risk_level="CRITICAL",
            risk_score=0.96,
            properties={"is_privileged_tool": True, "capabilities": ["iam:PassRole", "kms:Decrypt", "cloud:ExecuteCommand"]},
        ),
        GraphNode(
            id="cloud:kms_master_key",
            label="AWS KMS Customer Vault Master Key (arn:aws:kms:us-east-1:prod:key/vault)",
            type=EntityType.CLOUD_RESOURCE,
            risk_level="CRITICAL",
            risk_score=0.99,
            properties={"encryption": "AES_GCM_256", "customer_secrets_protected": 1250000},
        ),

        # Scenario 5 Nodes: Ambiguous Case / Insufficient Evidence (Failure Honesty)
        GraphNode(
            id="finding:sec-801-sandbox-leak",
            label="SEC-801: Unverified Memory Buffer Anomaly in Test Helper",
            type=EntityType.FINDING,
            risk_level="MEDIUM",
            risk_score=0.45,
            properties={"scanner": "ExperimentalFuzzer", "environment": "test_only", "isolated": True},
        ),
        GraphNode(
            id="func:legacy_test_helper",
            label="legacy_test_helper_alloc()",
            type=EntityType.FUNCTION,
            risk_level="LOW",
            risk_score=0.25,
            properties={"file": "tests/utils/legacy_helper.py"},
        ),
        GraphNode(
            id="file:test_helpers.py",
            label="tests/utils/legacy_helper.py",
            type=EntityType.FILE,
            risk_level="SAFE",
            risk_score=0.10,
            properties={"is_test": True},
        ),

        # General Infrastructure Nodes (Safe / Baseline)
        GraphNode(
            id="repo:shadowlens-core",
            label="GitHub: SabharishC98/ShadowLens",
            type=EntityType.REPOSITORY,
            risk_level="SAFE",
            risk_score=0.10,
            properties={"visibility": "public", "branch": "main"},
        ),
        GraphNode(
            id="file:config.py",
            label="src/pipeline/config.py",
            type=EntityType.FILE,
            risk_level="SAFE",
            risk_score=0.15,
            properties={"clean": True},
        ),
        GraphNode(
            id="dep:fastapi",
            label="fastapi==0.111.0",
            type=EntityType.DEPENDENCY,
            risk_level="SAFE",
            risk_score=0.05,
            properties={"vulnerabilities": 0},
        ),
        GraphNode(
            id="dep:networkx",
            label="networkx==3.2.1",
            type=EntityType.DEPENDENCY,
            risk_level="SAFE",
            risk_score=0.02,
            properties={"vulnerabilities": 0},
        ),
    ]

    for n in nodes:
        store.add_node(n)

    # ── 2. EDGES / RELATIONSHIPS ───────────────────────────────────────────────
    edges = [
        # Scenario 1 Edges: 5-hop path from Input to Vulnerability in DB
        GraphEdge(source="input:user-query", target="endpoint:payment-v1", type=RelationType.ACCEPTS_INPUT, weight=1.0),
        GraphEdge(source="endpoint:payment-v1", target="controller:payment-controller", type=RelationType.CALLS, weight=1.0),
        GraphEdge(source="controller:payment-controller", target="service:transaction-service", type=RelationType.CALLS, weight=1.0),
        GraphEdge(source="service:transaction-service", target="repo:payment-repo", type=RelationType.CALLS, weight=1.0),
        GraphEdge(source="repo:payment-repo", target="query:raw-sql-executor", type=RelationType.QUERIES, weight=1.0),
        GraphEdge(source="query:raw-sql-executor", target="db:prod-payments-db", type=RelationType.AFFECTS, weight=1.0),
        GraphEdge(source="query:raw-sql-executor", target="vuln:cve-2024-sql-injection", type=RelationType.RELATED_TO, weight=1.0),
        GraphEdge(source="vuln:cve-2024-sql-injection", target="db:prod-payments-db", type=RelationType.AFFECTS, weight=1.0),

        # Scenario 2 Edges: PyJWT Blast Radius
        GraphEdge(source="pkg:auth-token-core", target="dep:pyjwt-vuln", type=RelationType.DEPENDS_ON, weight=1.0),
        GraphEdge(source="file:jwt_handler.py", target="pkg:auth-token-core", type=RelationType.IMPORTS, weight=1.0),
        GraphEdge(source="file:jwt_handler.py", target="func:verify_token", type=RelationType.CONTAINS, weight=1.0),
        GraphEdge(source="func:verify_token", target="dep:pyjwt-vuln", type=RelationType.DEPENDS_ON, weight=1.0),
        GraphEdge(source="endpoint:auth-login", target="func:verify_token", type=RelationType.CALLS, weight=1.0),
        GraphEdge(source="endpoint:admin-portal", target="func:verify_token", type=RelationType.CALLS, weight=1.0),
        GraphEdge(source="endpoint:api-gateway", target="endpoint:auth-login", type=RelationType.EXPOSES, weight=1.0),
        GraphEdge(source="endpoint:api-gateway", target="endpoint:admin-portal", type=RelationType.EXPOSES, weight=1.0),
        GraphEdge(source="account:admin-root", target="endpoint:admin-portal", type=RelationType.ASSOCIATED_WITH, weight=1.0),

        # Scenario 3 Edges: Finding to IAM Cloud Exfiltration
        GraphEdge(source="finding:sec-309-priv-esc", target="func:execute_tool_action", type=RelationType.OBSERVED_IN, weight=1.0),
        GraphEdge(source="func:execute_tool_action", target="agent:tool-caller", type=RelationType.CALLS, weight=1.0),
        GraphEdge(source="agent:tool-caller", target="cloud:iam-role-worker", type=RelationType.ASSOCIATED_WITH, weight=1.0),
        GraphEdge(source="cloud:iam-role-worker", target="cloud:s3-prod-customer-backups", type=RelationType.AFFECTS, weight=1.0),
        GraphEdge(source="vuln:cve-2023-iam-wildcard", target="cloud:iam-role-worker", type=RelationType.AFFECTS, weight=1.0),
        GraphEdge(source="finding:sec-309-priv-esc", target="vuln:cve-2023-iam-wildcard", type=RelationType.RELATED_TO, weight=1.0),

        # Scenario 4 Edges: Non-Obvious Graph Insight (MEDIUM -> CRITICAL Escalation)
        GraphEdge(source="finding:sec-402-format-injection", target="func:format_agent_input", type=RelationType.OBSERVED_IN, weight=1.0),
        GraphEdge(source="func:format_agent_input", target="service:agent_router", type=RelationType.CALLS, weight=1.0),
        GraphEdge(source="service:agent_router", target="tool:cloud_admin_exec", type=RelationType.TRIGGERS, weight=1.0),
        GraphEdge(source="tool:cloud_admin_exec", target="cloud:kms_master_key", type=RelationType.AFFECTS, weight=1.0),

        # Scenario 5 Edges: Ambiguous Case / Insufficient Evidence (Disconnected Subgraph)
        GraphEdge(source="finding:sec-801-sandbox-leak", target="func:legacy_test_helper", type=RelationType.OBSERVED_IN, weight=1.0),
        GraphEdge(source="func:legacy_test_helper", target="file:test_helpers.py", type=RelationType.CONTAINS, weight=1.0),

        # Baseline edges
        GraphEdge(source="repo:shadowlens-core", target="file:config.py", type=RelationType.CONTAINS, weight=1.0),
        GraphEdge(source="repo:shadowlens-core", target="dep:fastapi", type=RelationType.DEPENDS_ON, weight=1.0),
        GraphEdge(source="repo:shadowlens-core", target="dep:networkx", type=RelationType.DEPENDS_ON, weight=1.0),
        GraphEdge(source="file:config.py", target="dep:fastapi", type=RelationType.IMPORTS, weight=1.0),
    ]

    for e in edges:
        store.add_edge(e)

    logger.info(f"Graph successfully seeded with {len(nodes)} nodes and {len(edges)} relationships.")
