import {
  Project,
  ApiKey,
  Endpoint,
  CheckResult,
  Incident,
  IncidentTimelineEvent,
  Investigation,
  FailureReproduction,
  FailureDNA,
  AnalyticsOverview,
} from './types';
import {
  mockProjects,
  mockApiKeys,
  mockEndpoints,
  mockChecks,
  mockIncidents,
  mockIncidentTimeline,
  mockInvestigation,
  mockFailureReproduction,
  mockFailureDNA,
  mockAnalytics,
} from './mock-data';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function fetchWithFallback<T>(url: string, options?: RequestInit, fallback?: T): Promise<T> {
  try {
    const res = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return (await res.json()) as T;
  } catch (err) {
    if (fallback !== undefined) {
      return fallback;
    }
    throw err;
  }
}

export const api = {
  // Projects
  async getProjects(): Promise<Project[]> {
    return fetchWithFallback<Project[]>('/api/v1/projects', undefined, mockProjects);
  },

  async getProject(projectId: string): Promise<Project> {
    const fallback = mockProjects.find((p) => p.id === projectId) || mockProjects[0];
    return fetchWithFallback<Project>(`/api/v1/projects/${projectId}`, undefined, fallback);
  },

  // API Keys
  async getApiKeys(projectId: string): Promise<ApiKey[]> {
    const fallback = mockApiKeys.filter((k) => k.project_id === projectId);
    return fetchWithFallback<ApiKey[]>(`/api/v1/projects/${projectId}/keys`, undefined, fallback.length ? fallback : mockApiKeys);
  },

  async createApiKey(projectId: string, name: string): Promise<ApiKey> {
    const fallback: ApiKey = {
      id: `key_${Date.now()}`,
      project_id: projectId,
      name,
      masked_key: `inv_live_${Math.random().toString(36).substring(2, 6)}****************************${Math.random().toString(36).substring(2, 6)}`,
      created_at: new Date().toISOString(),
    };
    return fetchWithFallback<ApiKey>(
      `/api/v1/projects/${projectId}/keys`,
      {
        method: 'POST',
        body: JSON.stringify({ name }),
      },
      fallback
    );
  },

  async deleteApiKey(projectId: string, keyId: string): Promise<{ success: boolean }> {
    return fetchWithFallback<{ success: boolean }>(
      `/api/v1/projects/${projectId}/keys/${keyId}`,
      { method: 'DELETE' },
      { success: true }
    );
  },

  // Endpoints & Monitors
  async getEndpoints(projectId: string): Promise<Endpoint[]> {
    const fallback = mockEndpoints.filter((e) => e.project_id === projectId);
    return fetchWithFallback<Endpoint[]>(
      `/api/v1/projects/${projectId}/endpoints`,
      undefined,
      fallback.length ? fallback : mockEndpoints
    );
  },

  async getEndpoint(endpointId: string): Promise<Endpoint> {
    const fallback = mockEndpoints.find((e) => e.id === endpointId) || mockEndpoints[0];
    return fetchWithFallback<Endpoint>(`/api/v1/endpoints/${endpointId}`, undefined, fallback);
  },

  async createEndpoint(projectId: string, data: Partial<Endpoint>): Promise<Endpoint> {
    const fallback: Endpoint = {
      id: `ep_${Date.now()}`,
      project_id: projectId,
      name: data.name || 'New Endpoint Monitor',
      url: data.url || 'https://api.example.com/health',
      method: data.method || 'GET',
      interval_seconds: data.interval_seconds || 60,
      timeout_seconds: data.timeout_seconds || 5,
      expected_status: data.expected_status || 200,
      status: 'healthy',
      last_status_code: 200,
      last_latency_ms: 120,
      uptime_percentage: 100.0,
      last_checked_at: new Date().toISOString(),
      environment: data.environment || 'production',
      headers: data.headers || {},
      created_at: new Date().toISOString(),
    };
    return fetchWithFallback<Endpoint>(
      `/api/v1/projects/${projectId}/endpoints`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      fallback
    );
  },

  async deleteEndpoint(endpointId: string): Promise<{ success: boolean }> {
    return fetchWithFallback<{ success: boolean }>(
      `/api/v1/endpoints/${endpointId}`,
      { method: 'DELETE' },
      { success: true }
    );
  },

  async getEndpointChecks(endpointId: string): Promise<CheckResult[]> {
    const fallback = mockChecks.filter((c) => c.endpoint_id === endpointId);
    return fetchWithFallback<CheckResult[]>(
      `/api/v1/monitors/${endpointId}/checks`,
      undefined,
      fallback.length ? fallback : mockChecks
    );
  },

  // Incidents
  async getIncidents(projectId: string, status?: string): Promise<Incident[]> {
    const fallback = mockIncidents.filter((inc) => {
      const matchProject = inc.project_id === projectId;
      const matchStatus = !status || status === 'all' || inc.status === status;
      return matchProject && matchStatus;
    });
    const url = `/api/v1/projects/${projectId}/incidents${status && status !== 'all' ? `?status=${status}` : ''}`;
    return fetchWithFallback<Incident[]>(url, undefined, fallback.length ? fallback : mockIncidents);
  },

  async getIncident(incidentId: string): Promise<Incident> {
    const fallback = mockIncidents.find((i) => i.id === incidentId) || mockIncidents[0];
    return fetchWithFallback<Incident>(`/api/v1/incidents/${incidentId}`, undefined, fallback);
  },

  async resolveIncident(incidentId: string, notes?: string): Promise<Incident> {
    const fallback = mockIncidents.find((i) => i.id === incidentId) || mockIncidents[0];
    const updated: Incident = {
      ...fallback,
      status: 'resolved',
      resolved_at: new Date().toISOString(),
    };
    return fetchWithFallback<Incident>(
      `/api/v1/incidents/${incidentId}/resolve`,
      {
        method: 'POST',
        body: JSON.stringify({ notes }),
      },
      updated
    );
  },

  async getIncidentTimeline(incidentId: string): Promise<IncidentTimelineEvent[]> {
    const fallback = mockIncidentTimeline.filter((t) => t.incident_id === incidentId);
    return fetchWithFallback<IncidentTimelineEvent[]>(
      `/api/v1/incidents/${incidentId}/timeline`,
      undefined,
      fallback.length ? fallback : mockIncidentTimeline
    );
  },

  // Investigation
  async getInvestigation(incidentId: string): Promise<Investigation> {
    return fetchWithFallback<Investigation>(
      `/api/v1/incidents/${incidentId}/investigations/latest`,
      undefined,
      mockInvestigation
    );
  },

  async triggerInvestigation(incidentId: string): Promise<Investigation> {
    const triggered: Investigation = {
      ...mockInvestigation,
      id: `inv_${Date.now()}`,
      incident_id: incidentId,
      status: 'completed',
      started_at: new Date().toISOString(),
    };
    return fetchWithFallback<Investigation>(
      `/api/v1/incidents/${incidentId}/investigations`,
      { method: 'POST' },
      triggered
    );
  },

  // Reproduction
  async getFailureReproduction(incidentId: string): Promise<FailureReproduction> {
    return fetchWithFallback<FailureReproduction>(
      `/api/v1/incidents/${incidentId}/reproduction`,
      undefined,
      mockFailureReproduction
    );
  },

  // Failure DNA
  async getFailureDNA(incidentId: string): Promise<FailureDNA> {
    return fetchWithFallback<FailureDNA>(
      `/api/v1/incidents/${incidentId}/dna`,
      undefined,
      mockFailureDNA
    );
  },

  // Analytics
  async getAnalytics(projectId: string): Promise<AnalyticsOverview> {
    return fetchWithFallback<AnalyticsOverview>(
      `/api/v1/projects/${projectId}/analytics/overview`,
      undefined,
      mockAnalytics
    );
  },
};
