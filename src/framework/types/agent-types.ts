// Tipos compartilhados entre agentes

export interface AgentContext {
  featureId: string;
  iteration: number;
  previousArtifacts: Record<string, any>;
  metadata: {
    startedAt: Date;
    requestedBy: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
  };
}

export interface AgentResult<T> {
  success: boolean;
  agentId: string;
  output?: T;
  error?: string;
  nextAgent: string | null;
  artifactPath: string;
  metadata: {
    duration: number;
    timestamp: string;
    iteration: number;
  };
}

export interface BaseAgentInput {
  context: AgentContext;
}

// Agent 1: Analyzer
export interface FeatureRequest {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  requestedBy: string;
}

export interface FeatureAnalysis {
  featureId: string;
  timestamp: string;
  analyzer: {
    agentVersion: string;
    analysisDate: string;
  };
  feature: {
    title: string;
    description: string;
    category: string;
    priority: string;
    businessValue: string;
  };
  requirements: {
    functional: Array<{
      id: string;
      description: string;
      priority: string;
    }>;
    nonFunctional: Array<{
      id: string;
      type: string;
      description: string;
    }>;
  };
  impact: {
    modules: string[];
    databases: string[];
    externalServices: string[];
    estimatedComplexity: string;
  };
  dependencies: Array<{
    type: string;
    name: string;
    action: string;
  }>;
  risks: Array<{
    description: string;
    severity: string;
    mitigation: string;
  }>;
  nextAgent: string;
}

// Agent 2: Planner
export interface ExecutionPlan {
  planId: string;
  featureId: string;
  timestamp: string;
  planner: {
    agentVersion: string;
    planningDate: string;
  };
  architecture: {
    approach: string;
    patterns: string[];
    components: Array<{
      name: string;
      type: string;
      action: string;
      technology: string;
    }>;
  };
  phases: Array<{
    phaseId: string;
    name: string;
    order: number;
    estimatedHours: number;
    components: string[];
    dependencies?: string[];
  }>;
  acceptanceCriteria: Array<{
    id: string;
    description: string;
    type: string;
    testable: boolean;
  }>;
  estimatedTotalHours: number;
  nextAgent: string;
}

// Agent 3: Task Creator
export interface TaskSet {
  taskSetId: string;
  featureId: string;
  planId: string;
  timestamp: string;
  creator: {
    agentVersion: string;
    creationDate: string;
  };
  summary: {
    totalTasks: number;
    byCategory: Record<string, number>;
    byPriority: Record<string, number>;
  };
  tasks: Array<{
    taskId: string;
    phaseId: string;
    title: string;
    description: string;
    category: string;
    priority: string;
    estimatedHours: number;
    dependencies: string[];
    files: string[];
    dod: string[];
    technicalDetails?: Record<string, any>;
  }>;
  executionOrder: string[];
  nextAgent: string;
}

// Agent 4: Executor
export interface ExecutionReport {
  executionId: string;
  taskSetId: string;
  timestamp: string;
  executor: {
    agentVersion: string;
    executionDate: string;
    iteration: number;
  };
  refinementContext: {
    isRefinement: boolean;
    previousExecutionId: string | null;
    refinementActionsApplied: string[];
  };
  summary: {
    totalTasks: number;
    completed: number;
    failed: number;
    skipped: number;
    totalDuration: string;
  };
  taskExecutions: Array<{
    taskId: string;
    status: string;
    startTime: string;
    endTime: string;
    duration: string;
    changes: Array<{
      file: string;
      action: string;
      linesAdded: number;
      description: string;
    }>;
    testsRun?: {
      unit: { total: number; passed: number; failed: number };
    };
    dodCompliance: {
      total: number;
      completed: number;
      items: Array<{ description: string; status: string }>;
    };
    commits: Array<{ hash: string; message: string }>;
  }>;
  codeMetrics: {
    filesCreated: number;
    filesModified: number;
    totalLinesAdded: number;
    totalLinesDeleted: number;
    testCoverage: {
      overall: number;
      statements: number;
      branches: number;
      functions: number;
      lines: number;
    };
  };
  issues: any[];
  warnings: any[];
  nextAgent: string;
}

// Agent 5: E2E Tester
export interface TestResults {
  testResultsId: string;
  executionId: string;
  timestamp: string;
  tester: {
    agentVersion: string;
    testDate: string;
  };
  environment: {
    type: string;
    database: string;
    services: string[];
  };
  testSuites: Array<{
    suiteId: string;
    name: string;
    type: string;
    status: string;
    duration: string;
    tests: Array<{
      testId: string;
      name: string;
      status: string;
      duration: string;
      assertions?: number;
      passed?: number;
      failed?: number;
      error?: string;
    }>;
    summary: {
      total: number;
      passed: number;
      failed: number;
      skipped?: number;
    };
  }>;
  acceptanceCriteriaValidation: Array<{
    criteriaId: string;
    description: string;
    status: string;
    evidence: any;
  }>;
  summary: {
    overallStatus: string;
    totalSuites: number;
    passedSuites: number;
    failedSuites: number;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    skippedTests: number;
    totalDuration: string;
    acceptanceCriteriaMet: number;
    acceptanceCriteriaTotal: number;
  };
  failures: any[];
  decision: string;
  nextAgent: string;
}

// Agent 6: Reviewer
export interface ReviewReport {
  reviewId: string;
  testResultsId: string;
  timestamp: string;
  reviewer: {
    agentVersion: string;
    reviewDate: string;
  };
  reviewCriteria: {
    codeQuality: {
      score: number;
      maxScore: number;
      status: string;
      findings: any[];
    };
    architecture: {
      score: number;
      maxScore: number;
      status: string;
      findings: any[];
    };
    security: {
      score: number;
      maxScore: number;
      status: string;
      findings: any[];
    };
    documentation: {
      score: number;
      maxScore: number;
      status: string;
      findings: any[];
    };
    performance: {
      score: number;
      maxScore: number;
      status: string;
      findings: any[];
    };
    maintainability: {
      score: number;
      maxScore: number;
      status: string;
      findings: any[];
    };
  };
  overallScore: number;
  decision: string;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  suggestions: number;
  positiveFindings: number;
  summary: {
    strengths: string[];
    improvements: string[];
  };
  recommendation: string;
  nextAgent: string;
}

// Agent 7: Refiner
export interface RefinementActions {
  refinementId: string;
  iteration: number;
  timestamp: string;
  refiner: {
    agentVersion: string;
    refinementDate: string;
  };
  triggerSource: {
    type: string;
    sourceId: string;
    reason: string;
  };
  rootCauseAnalysis: Array<{
    issueId: string;
    originalIssue: string;
    rootCause: string;
    impact: string;
    affectedComponents: string[];
  }>;
  refinementActions: Array<{
    actionId: string;
    priority: string;
    type: string;
    relatedIssue: string;
    targetTaskId: string;
    title: string;
    description: string;
    specificInstructions: string[];
    files: Array<{
      path: string;
      action: string;
      specificChanges: string;
    }>;
    acceptanceCriteria: string[];
    estimatedHours: number;
  }>;
  executionStrategy: {
    approach: string;
    order: string[];
    reasoning: string;
  };
  estimatedTotalHours: number;
  additionalNotes: string[];
  nextAgent: string;
  nextAgentContext: {
    mode: string;
    focusAreas: string[];
    previousExecutionId: string;
  };
}

// Agent 8: Deliverer
export interface DeliveryReport {
  deliveryId: string;
  featureId: string;
  reviewId: string;
  timestamp: string;
  deliverer: {
    agentVersion: string;
    deliveryDate: string;
  };
  feature: {
    name: string;
    version: string;
    status: string;
  };
  deliveryArtifacts: {
    pullRequest?: {
      number: number;
      title: string;
      url: string;
      status: string;
      mergedAt?: string;
      branch: string;
      baseBranch: string;
    };
    releaseNotes: any;
    documentation: any[];
  };
  deploymentChecklist: {
    preDeployment: any[];
    deployment: any[];
    postDeployment: any[];
  };
  metrics: {
    development: {
      totalTime: string;
      iterations: number;
      tasksCompleted: number;
      linesOfCode: number;
      testCoverage: number;
    };
    quality: {
      codeReviewScore: number;
      criticalIssues: number;
      securityIssues: number;
      performanceScore: number;
    };
  };
  stakeholderNotifications: any[];
  summary: {
    status: string;
    completionRate: number;
    quality: string;
    onTime: boolean;
    budgetCompliance: boolean;
  };
  postDeliveryActions: any[];
  completionMessage: string;
}

// Workflow State
export interface WorkflowState {
  id: string;
  featureId: string;
  currentAgent: string | null;
  status: 'running' | 'completed' | 'failed';
  iteration: number;
  maxIterations: number;
  history: Array<{
    agentId: string;
    iteration: number;
    success: boolean;
    duration: number;
    timestamp: string;
  }>;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  artifacts: Record<string, string>; // artifact name -> path
}
