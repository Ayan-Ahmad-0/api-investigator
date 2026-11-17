export type EndpointStatus = 'healthy' | 'degraded' | 'failing';
export type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low';
export type IncidentStatus = 'open' | 'investigating' | 'identified' | 'monitoring' | 'resolved' | 'inconclusive';
export type InvestigationStatus = 'queued' | 'running' | 'completed' | 'failed' | 'inconclusive';
export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface Project {
  id: string;
  name: string;
  slug: string;
  organization_id: string;
  environment: 'production' | 'staging' | 'development';
  created_at: string;
}

export interface ApiKey {
  id: string;
  project_id: string;
  name: string;
  masked_key: string;
  created_at: string;
  last_used_at?: string;
}

export interface Endpoint {
  id: string;
  project_id: string;
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  interval_seconds: number;
  timeout_seconds: number;
  expected_status: number;
  status: EndpointStatus;
  last_status_code: number;
  last_latency_ms: number;
  uptime_percentage: number;
  last_checked_at: string;
  environment: string;
  headers?: Record<string, string>;
  created_at: string;
}

export interface CheckResult {
  id: string;
  endpoint_id: string;
  status_code: number;
  latency_ms: number;
  is_success: boolean;
  error_message?: string;
  timestamp: string;
}

export interface Incident {
  id: string;
  project_id: string;
  title: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  affected_endpoint_id: string;
  affected_endpoint_name: string;
  affected_route: string;
  started_at: string;
  resolved_at?: string;
  duration_minutes?: number;
  error_rate: number;
  impact_summary: string;
  dna_fingerprint?: string;
  investigation_status?: InvestigationStatus;
}

export interface IncidentTimelineEvent {
  id: string;
  incident_id: string;
  timestamp: string;
  type: 'spike_detected' | 'alert_sent' | 'investigation_started' | 'deployment_correlated' | 'status_changed' | 'mitigation_applied';
  title: string;
  description: string;
  metadata?: Record<string, any>;
}

export interface Hypothesis {
  id: string;
  title: string;
  probability: number; // 0 to 1
  is_primary: boolean;
  explanation: string;
  supporting_evidence: string[];
  contradicting_evidence: string[];
}

export interface Investigation {
  id: string;
  incident_id: string;
  status: InvestigationStatus;
  started_at: string;
  completed_at?: string;
  summary: string;
  confidence_score: number; // 0 to 100
  confidence_level: ConfidenceLevel;
  confidence_explanation: string;
  hypotheses: Hypothesis[];
  facts: string[];
  unknowns: string[];
  verification_steps: string[];
  tool_audit_trail: {
    step: number;
    tool_name: string;
    description: string;
    timestamp: string;
    status: 'success' | 'warn' | 'info';
  }[];
}

export interface FailureReproduction {
  id: string;
  incident_id: string;
  endpoint_id: string;
  method: string;
  safe_url: string;
  sanitized_headers: Record<string, string>;
  sanitized_query_params: Record<string, string>;
  sanitized_body?: string;
  response_status: number;
  safe_response_body?: string;
  curl_command: string;
  timestamp: string;
  trace_id: string;
  app_version: string;
  diff_vs_successful?: {
    header_diffs: { header: string; failed_value: string; successful_value: string }[];
    body_diffs: { field: string; failed_value: string; successful_value: string }[];
    status_diff: { failed: number; successful: number };
    latency_diff_ms: { failed: number; successful: number };
    version_diff: { failed: string; successful: string };
  };
}

export interface SimilarIncidentMatch {
  incident_id: string;
  title: string;
  resolved_at: string;
  similarity_score: number; // e.g. 92%
  signature: string;
  verified_resolution: string;
  applicability_assessment: string;
}

export interface FailureDNA {
  id: string;
  fingerprint_hash: string;
  exception_class: string;
  normalized_message: string;
  top_stack_frames: string[];
  endpoint_pattern: string;
  similar_incidents: SimilarIncidentMatch[];
}

export interface AnalyticsOverview {
  total_checks: number;
  average_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
  error_rate_percentage: number;
  healthy_endpoints_count: number;
  degraded_endpoints_count: number;
  failing_endpoints_count: number;
  active_incidents_count: number;
  top_failing_endpoints: {
    endpoint_name: string;
    route: string;
    error_count: number;
    error_rate: number;
  }[];
  latency_trend: {
    timestamp: string;
    p50: number;
    p95: number;
    p99: number;
  }[];
  error_rate_trend: {
    timestamp: string;
    error_rate: number;
  }[];
}
