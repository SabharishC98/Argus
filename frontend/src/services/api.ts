// API service — typed fetch client for all ShadowLens REST endpoints

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function req<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  risk_level: string;
  risk_score: number;
  properties: Record<string, unknown>;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: string;
  weight: number;
  properties?: Record<string, unknown>;
}

export interface DiscoveredPath {
  found: boolean;
  source_id: string;
  target_id: string;
  hop_count: number;
  path_node_ids: string[];
  path_node_labels: string[];
  relationships: string[];
  summary: string;
}

export interface TimelineEvent {
  step_number: number;
  timestamp: string;
  tool_called: string;
  purpose: string;
  evidence_collected: string;
  conclusion: string;
  data_snapshot?: Record<string, unknown>;
}

export interface InvestigationSummary {
  investigation_id: string;
  query: string;
  target_entity?: string;
  status: string;
  risk_level?: string;
  risk_score?: number;
  steps_count: number;
  created_at: string;
  completed_at?: string;
}

export interface InvestigationDetail {
  investigation_id: string;
  query: string;
  target_entity?: string;
  status: string;
  current_step: number;
  visited_entities: string[];
  discovered_paths: DiscoveredPath[];
  evidence: Array<{
    id: string;
    type: string;
    description: string;
    entities_involved: string[];
    confidence: number;
  }>;
  tool_calls: Array<{
    step: number;
    tool: string;
    arguments: Record<string, unknown>;
    success: boolean;
    error?: string;
  }>;
  risk_score?: number;
  risk_level?: string;
  decision?: string;
  uncertainty_state?: string;
  recommended_next_step?: string;
  severity_escalation?: {
    initial: string;
    escalated: string;
    original_severity?: string;
    escalated_severity?: string;
    discovered_capability: string;
    affected_target: string;
    path: string[];
    reason: string;
  };
  actions_taken: Array<{
    action_id: string;
    action_type: string;
    target_entity_id: string;
    status: string;
    summary: string;
    verification_hash: string;
    simulation: boolean;
    receipt?: Record<string, unknown>;
  }>;
  pending_actions?: ActionReceipt[];
  timeline: TimelineEvent[];
  explanation?: {
    investigation_id: string;
    target_entity?: string;
    risk_level: string;
    risk_score: number;
    decision: string;
    path_summary?: string;
    evidence_chain: string[];
    actions_executed: Array<Record<string, unknown>>;
    severity_escalation?: Record<string, unknown>;
    uncertainty_state?: string;
    executive_summary: string;
  };
  created_at: string;
  completed_at?: string;
}

export interface GraphOverview {
  total_nodes: number;
  total_edges: number;
  node_types: Record<string, number>;
  risk_distribution: Record<string, number>;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface InvestigationGraph {
  investigation_id: string;
  target_entity?: string;
  risk_level?: string;
  discovered_paths: DiscoveredPath[];
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface MCPTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  category: string;
}

export interface Finding {
  finding_id: string;
  title: string;
  severity: string;
  affected_entities: string[];
  description: string;
  evidence_paths?: string[][];
  status: string;
  created_at: string;
  updated_at: string;
  notes: string[];
}

export interface BlastRadiusPreview {
  target: string;
  action_type: string;
  blast_count: number;
  upstream_dependencies_impacted: string[];
  downstream_dependents_impacted: string[];
  isolated_assets_protected: string[];
  critical_nodes_shielded: string[];
}

export interface ActionReceipt {
  action_id: string;
  action_type: string;
  target_entity_id: string;
  status: string;
  simulation_mode: boolean;
  summary: string;
  details: Record<string, unknown>;
  blast_radius_preview?: BlastRadiusPreview;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  timestamp: string;
  verification_hash: string;
}

export interface IngestionStatus {
  active_source: 'seed_dataset' | 'real_repository';
  repo_url?: string | null;
  repo_name: string;
  analyzed_at: string;
  stats: {
    nodes: number;
    edges: number;
    files: number;
    dependencies: number;
    vulnerabilities: number;
  };
}

export interface IngestionResult {
  success: boolean;
  source_type: string;
  repository_url: string;
  repo_name: string;
  nodes_count: number;
  edges_count: number;
  files_parsed: number;
  dependencies_found: number;
  vulnerabilities_enriched: number;
  sample_entities: string[];
  message: string;
}

export interface ScenarioResult {
  scenario_id: string;
  title: string;
  has_ground_truth_path: boolean;
  ground_truth_hops: number;
  ground_truth_path: string[];
  baseline_path_found: boolean;
  baseline_predicted_path: string[];
  baseline_correct: boolean;
  baseline_exact_match: boolean;
  baseline_edge_recall: number;
  graph_path_found: boolean;
  graph_predicted_path: string[];
  graph_correct: boolean;
  graph_exact_match: boolean;
  graph_edge_recall: number;
  graph_hops: number;
}

export interface BenchmarkReport {
  evaluated_at: string;
  total_scenarios: number;
  connected_scenarios: number;
  ambiguous_scenarios: number;
  baseline_path_accuracy: number;
  baseline_exact_path_accuracy: number;
  baseline_avg_edge_recall: number;
  baseline_false_positives: number;
  baseline_false_negatives: number;
  graph_path_accuracy: number;
  graph_exact_path_accuracy: number;
  graph_avg_edge_recall: number;
  graph_false_positives: number;
  graph_false_negatives: number;
  accuracy_improvement_pp: number;
  exact_match_improvement_pp: number;
  edge_recall_improvement_pp: number;
  scenarios: ScenarioResult[];
}

// Original ShadowLens types
export interface RunSummary {
  run_id: string;
  created_at: string;
  status: string;
  technique: string;
  model: string;
  task_preview: string;
  total_hops: number;
  injections_detected: number;
  propagation_rate: number;
  goal_violated: boolean;
  furthest_propagation: number;
  max_drift_score: number;
  terminal_success: boolean;
}

export interface ObserverEvent {
  event_id: string;
  run_id: string;
  timestamp: string;
  sender_node: string;
  receiver_node: string;
  hop_index: number;
  raw_message: string;
  injection_detected: boolean;
  injection_technique: string;
  injection_confidence: number;
  all_scores: Record<string, number>;
  drift_score: number;
  drift_from_baseline: string;
  goal_violated: boolean;
  goal_violation_reason?: string;
  goal_check_method?: string;
}

export interface RunDetail {
  run_id: string;
  created_at: string;
  status: string;
  original_task: string;
  technique: string;
  model: string;
  pipeline_config: Record<string, unknown>;
  attack_config?: Record<string, unknown>;
  summary: Record<string, unknown>;
  final_output: string;
  messages: Array<{ node: string; hop: number; content: string }>;
  observer_events: ObserverEvent[];
}

export interface RunRequest {
  task: string;
  technique: string;
  injection_node_index: number;
  target_goal: string;
  false_fact: string;
  hijacked_goal: string;
  malicious_tool_params: Record<string, unknown>;
  randomize_payload: boolean;
  model: string;
  pipeline_id: string;
}

export interface ExperimentRequest {
  models: string[];
  techniques: string[];
  runs_per_cell: number;
  concurrency: number;
  base_task: string;
  target_goal: string;
  hijacked_goal: string;
  false_fact: string;
}

export interface ExperimentStatus {
  experiment_id: string;
  status: string;
  total_runs: number;
  completed_runs: number;
  failed_runs: number;
  progress_pct: number;
  results_preview: Array<Record<string, unknown>>;
}

export interface HealthStatus {
  status: string;
  classifier_mode: string;
  db_connected: boolean;
  llm_providers: string[];
  version: string;
}

// ── API Methods ───────────────────────────────────────────────────────────────

export const api = {
  // Autonomous Connected Agent Investigations
  createInvestigation: (query: string, target_entity?: string, model?: string) =>
    req<InvestigationDetail>('/api/investigations', {
      method: 'POST',
      body: JSON.stringify({ query, target_entity, model }),
    }),

  getInvestigation: (id: string) => req<InvestigationDetail>(`/api/investigations/${id}`),

  listInvestigations: () => req<InvestigationSummary[]>('/api/investigations'),

  getInvestigationTimeline: (id: string) =>
    req<{ investigation_id: string; step_count: number; timeline: TimelineEvent[] }>(
      `/api/investigations/${id}/timeline`
    ),

  getInvestigationGraph: (id: string) =>
    req<InvestigationGraph>(`/api/investigations/${id}/graph`),

  // Connected Knowledge Graph
  getGraphOverview: () => req<GraphOverview>('/api/graph/overview'),

  getGraphSubgraph: (entity_id: string, depth = 2) =>
    req<{ nodes: GraphNode[]; edges: GraphEdge[] }>(
      `/api/graph/subgraph?entity_id=${encodeURIComponent(entity_id)}&depth=${depth}`
    ),

  queryGraph: (body: { algorithm: string; source_id?: string; target_id?: string; max_hops?: number; decay?: number }) =>
    req<Record<string, unknown>>('/api/graph/query', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  reseedGraph: () => req<{ status: string; message: string }>('/api/graph/seed', { method: 'POST' }),

  // Model Context Protocol (MCP)
  listMcpTools: (category?: string) =>
    req<{ count: number; tools: MCPTool[] }>(
      category ? `/api/mcp/tools?category=${category}` : '/api/mcp/tools'
    ),

  callMcpTool: (tool: string, args: Record<string, unknown> = {}) =>
    req<{ tool: string; success: boolean; data: unknown; error?: string }>('/api/mcp/call', {
      method: 'POST',
      body: JSON.stringify({ tool, arguments: args }),
    }),

  // Findings and Actions
  listFindings: () => req<Finding[]>('/api/findings'),

  createFinding: (body: { title: string; severity: string; affected_entities: string[]; description: string }) =>
    req<Record<string, unknown>>('/api/findings', { method: 'POST', body: JSON.stringify(body) }),

  listActions: () => req<ActionReceipt[]>('/api/actions'),

  approveAction: (actionId: string, approver = 'security_lead') =>
    req<{ success: boolean; action_id: string; status: string; approved_by: string; receipt: ActionReceipt }>(
      `/api/actions/${actionId}/approve`,
      { method: 'POST', body: JSON.stringify({ approver }) }
    ),

  rejectAction: (actionId: string, reason = 'Rejected by security operator') =>
    req<{ success: boolean; action_id: string; status: string; rejection_reason: string; receipt: ActionReceipt }>(
      `/api/actions/${actionId}/reject`,
      { method: 'POST', body: JSON.stringify({ reason }) }
    ),

  // Repository Ingestion & Vulnerability Enrichment
  getIngestionStatus: () => req<IngestionStatus>('/api/ingestion/status'),

  ingestRepository: (repoUrl: string, maxFiles = 60) =>
    req<IngestionResult>('/api/ingestion/repository', {
      method: 'POST',
      body: JSON.stringify({ repo_url: repoUrl, max_files: maxFiles }),
    }),

  resetSeedDataset: () =>
    req<{ success: boolean; data_source: string; message: string }>('/api/ingestion/reset-seed', {
      method: 'POST',
    }),

  // Benchmark Evaluation (Baseline vs Graph Agent)
  runEvaluation: () => req<BenchmarkReport>('/api/evaluation/run', { method: 'POST' }),

  getEvaluationResults: () => req<BenchmarkReport>('/api/evaluation/results'),

  listEvaluationScenarios: () => req<any[]>('/api/evaluation/scenarios'),

  // Original ShadowLens Runs
  listRuns: (page = 1, limit = 50, technique?: string, model?: string) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (technique) params.set('technique', technique);
    if (model) params.set('model', model);
    return req<RunSummary[]>(`/api/runs?${params}`);
  },

  getRun: (runId: string) => req<RunDetail>(`/api/runs/${runId}`),

  createRun: (body: RunRequest) =>
    req<{ run_id: string; status: string }>(`/api/runs`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  stopRun: (runId: string) => req(`/api/runs/${runId}/stop`, { method: 'POST' }),

  // Experiments
  startExperiment: (body: ExperimentRequest) =>
    req<{ experiment_id: string }>('/api/experiments', { method: 'POST', body: JSON.stringify(body) }),

  getExperiment: (id: string) => req<ExperimentStatus>(`/api/experiments/${id}`),

  exportExperiment: (id: string) => `${BASE}/api/experiments/${id}/export`,

  // Models
  listModels: () =>
    req<{ models: Array<{ provider: string; model: string; alias: string }> }>('/api/models'),

  // Health
  health: () => req<HealthStatus>('/api/health'),
};
