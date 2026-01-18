/**
 * Graph of Thoughts Controller (v4.0)
 *
 * Complete implementation of Graph of Thoughts framework with:
 * - All 5 GoT operations: Generate, Aggregate, Score, Prune, Refine
 * - Database persistence for nodes and operations
 * - Session-aware state management
 * - Export/import functionality
 * - Visualization data export
 */

import Database from 'better-sqlite3';
import path from 'path';
import { ResearchPath, PathGenerationOptions, AggregationResult, PathScore, ResearchStep } from './types.js';
import { getDB } from '../state/db.js';

/**
 * Predefined path templates for different research strategies
 */
const PATH_TEMPLATES = {
  academic: {
    focus: 'Academic Research',
    query_pattern: '{topic} academic papers research {year}',
    sources: ['scholar.google.com', 'arxiv.org', 'researchgate.net'],
    weight: 0.3
  },
  industry: {
    focus: 'Industry Practices',
    query_pattern: '{topic} industry report case study',
    sources: ['mckinsey.com', 'gartner.com', 'hbr.org', 'techcrunch.com'],
    weight: 0.25
  },
  policy: {
    focus: 'Policy & Governance',
    query_pattern: '{topic} policy regulation governance',
    sources: ['gov.uk', 'europa.eu', 'congress.gov', 'oecd.org'],
    weight: 0.2
  },
  technical: {
    focus: 'Technical Implementation',
    query_pattern: '{topic} technical implementation tutorial',
    sources: ['github.com', 'stackoverflow.com', 'dev.to', 'medium.com'],
    weight: 0.15
  },
  news: {
    focus: 'Current Events',
    query_pattern: '{topic} news {year}',
    sources: ['reuters.com', 'bbc.com', 'nytimes.com', 'washingtonpost.com'],
    weight: 0.1
  }
};

/**
 * Query depth qualifiers for refinement
 */
const DEPTH_QUALIFIERS = [
  'detailed analysis of',
  'in-depth study on',
  'comprehensive review of',
  'advanced concepts in',
  'critical examination of',
  'systematic investigation of',
  'thorough evaluation of'
];

/**
 * Extracted fact type definition
 */
interface ExtractedFact {
  statement: string;
  source?: string;
  confidence?: number;
  entity?: string;
  attribute?: string;
  value?: any;
}

/**
 * Theme detection result
 */
interface Theme {
  name: string;
  keywords: string[];
  outputs: string[];
}

/**
 * Visualization data structure
 */
export interface GraphVisualization {
  nodes: Array<{
    id: string;
    label: string;
    type: string;
    score?: number;
    status: string;
    focus?: string;
  }>;
  edges: Array<{
    from: string;
    to: string;
    label?: string;
    type: string;
  }>;
  metadata: {
    sessionId: string;
    totalPaths: number;
    generatedAt: string;
  };
}

export class GraphController {
  private paths: Map<string, ResearchPath>;
  private pathCounter: number;
  private history: Array<{ iteration: number; action: string; result: any; timestamp: string }>;
  private sessionId: string;
  private db: Database.Database;

  constructor(sessionId?: string) {
    this.db = getDB();
    this.sessionId = sessionId || this.generateSessionId();
    this.paths = new Map();
    this.pathCounter = 0;
    this.history = [];

    // Load existing state if sessionId provided
    if (sessionId) {
      this.loadState(sessionId);
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private generatePathId(): string {
    return `path_${++this.pathCounter}_${Date.now()}`;
  }

  private logHistory(action: string, result: any): void {
    this.history.push({
      iteration: this.history.length + 1,
      action,
      result,
      timestamp: new Date().toISOString()
    });

    // Persist history to database
    this.saveHistoryToDb();
  }

  /**
   * Get the current session ID
   */
  public getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Set the session ID (for loading existing sessions)
   */
  public setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
    this.loadState(sessionId);
  }

  // ============================================================================
  // GoT Operation 1: Generate
  // ============================================================================

  /**
   * Generate k diverse research paths
   *
   * Strategy options:
   * - 'diverse': Create paths across different domains
   * - 'focused': Create paths exploring different aspects
   * - 'exploratory': Broad exploration
   * - 'orthogonal': Minimize overlap
   */
  public async generatePaths(
    query: string,
    options: PathGenerationOptions
  ): Promise<ResearchPath[]> {
    const { k = 3, strategy = 'diverse', context } = options;
    const generatedPaths: ResearchPath[] = [];

    this.logHistory('generate_paths', { query, k, strategy, context });

    const templates = this.selectTemplates(k, strategy, context);

    for (let i = 0; i < k; i++) {
      const template = templates[i % templates.length];
      const pathId = this.generatePathId();

      const subtopic = this.generateSubtopic(query, i, k);
      const searchQuery = this.customizeQuery(template.query_pattern, query, subtopic);

      const path: ResearchPath = {
        id: pathId,
        query: searchQuery,
        focus: template.focus,
        steps: [{
          step_number: 1,
          type: 'search',
          action: 'search',
          query: searchQuery,
          sources: template.sources,
          timestamp: new Date().toISOString()
        }],
        score: template.weight * 10,
        status: 'active',
        metadata: {
          depth: 0,
          maxDepth: options.maxDepth || 5,
          strategy,
          template: template.focus,
          diversity_score: this.calculateDiversity(pathId, generatedPaths)
        }
      };

      this.paths.set(pathId, path);
      generatedPaths.push(path);

      // Save to database
      this.saveNodeToDb(path, 'generated');
    }

    // Save operation to database
    this.saveOperationToDb('Generate', [], generatedPaths.map(p => p.id));

    this.logHistory('paths_generated', {
      count: generatedPaths.length,
      paths: generatedPaths.map(p => ({ id: p.id, focus: p.focus, query: p.query }))
    });

    return generatedPaths;
  }

  // ============================================================================
  // GoT Operation 2: Aggregate (with improved algorithms)
  // ============================================================================

  /**
   * Aggregate multiple paths into synthesis
   *
   * Enhanced strategies:
   * - 'synthesis': Structured narrative with themes
   * - 'voting': Majority-based filtering
   * - 'consensus': Conflict resolution
   * - 'thematic': Theme-based grouping
   * - 'chronological': Time-ordered synthesis
   */
  public async aggregatePaths(
    paths: ResearchPath[],
    strategy: string = 'synthesis'
  ): Promise<AggregationResult> {
    this.logHistory('aggregate_paths', { path_count: paths.length, strategy });

    const allOutputs = paths.flatMap(p => p.steps.filter(s => s.output).map(s => s.output!));
    const sources = paths.map(p => p.id);
    const allFacts = this.extractFacts(paths);
    const conflicts = this.detectConflicts(allFacts);

    let synthesizedContent: string;
    let confidence: number;

    switch (strategy) {
      case 'synthesis':
        synthesizedContent = this.synthesizeNarrativeStructured(allOutputs);
        confidence = this.calculateSynthesisConfidence(paths);
        break;

      case 'voting':
        synthesizedContent = this.votingAggregationImproved(allOutputs);
        confidence = this.calculateVotingConfidence(paths);
        break;

      case 'consensus':
        synthesizedContent = this.consensusAggregation(paths, conflicts);
        confidence = this.calculateConsensusConfidence(paths, conflicts);
        break;

      case 'thematic':
        synthesizedContent = this.synthesizeByTheme(allOutputs);
        confidence = this.calculateSynthesisConfidence(paths);
        break;

      case 'chronological':
        synthesizedContent = this.synthesizeChronological(paths);
        confidence = this.calculateSynthesisConfidence(paths);
        break;

      default:
        synthesizedContent = this.synthesizeNarrativeStructured(allOutputs);
        confidence = 0.7;
    }

    // Save aggregated node
    const aggregatedPath: ResearchPath = {
      id: `aggregated_${Date.now()}`,
      query: `Aggregated from ${paths.length} paths`,
      focus: 'Aggregated Research',
      steps: [{
        step_number: 1,
        type: 'synthesize',
        action: 'aggregate',
        output: synthesizedContent,
        timestamp: new Date().toISOString()
      }],
      score: confidence * 10,
      status: 'completed',
      metadata: {
        depth: 0,
        maxDepth: 1,
        strategy,
        source_paths: sources.length
      }
    };

    this.saveNodeToDb(aggregatedPath, 'aggregated');
    this.saveOperationToDb('Aggregate', sources, [aggregatedPath.id]);

    this.logHistory('aggregated', { strategy, confidence, conflict_count: conflicts.length });

    return {
      synthesizedContent,
      sources,
      confidence,
      conflicts,
      fact_count: allFacts.length
    };
  }

  // ============================================================================
  // GoT Operation 3: Score + Prune
  // ============================================================================

  /**
   * Score paths and keep top N
   */
  public async scoreAndPrune(
    paths: ResearchPath[],
    keepN: number,
    criteria?: any
  ): Promise<PathScore[]> {
    this.logHistory('score_and_prune', { input_count: paths.length, keepN, criteria });

    const scoredPaths = paths.map(path => {
      const score = this.calculatePathScore(path, criteria);
      path.score = score.total;
      return {
        path_id: path.id,
        score: score.total,
        kept: true,
        breakdown: score.breakdown
      };
    });

    scoredPaths.sort((a, b) => b.score - a.score);

    const kept = scoredPaths.slice(0, keepN);
    const pruned = scoredPaths.slice(keepN);

    pruned.forEach(scored => {
      scored.kept = false;
      const path = this.paths.get(scored.path_id);
      if (path) {
        path.status = 'pruned';
        this.paths.set(path.id, path);
        this.saveNodeToDb(path, 'pruned');
      }
    });

    this.saveOperationToDb('Score', paths.map(p => p.id), kept.map(s => s.path_id));
    this.saveOperationToDb('Prune', paths.map(p => p.id), kept.map(s => s.path_id));

    this.logHistory('pruned', {
      kept: kept.length,
      pruned: pruned.length,
      top_scores: kept.slice(0, 3).map(s => ({ id: s.path_id, score: s.score }))
    });

    return scoredPaths;
  }

  // ============================================================================
  // GoT Operation 4: Refine (NEW - P0)
  // ============================================================================

  /**
   * Refine an existing research path
   *
   * This is the missing GoT operation that enables iterative improvement
   * of research paths based on feedback or deeper exploration.
   *
   * @param pathId - Path to refine
   * @param feedback - Optional feedback for refinement
   * @param depth - How many levels deeper to explore
   */
  public async refinePath(
    pathId: string,
    feedback?: string,
    depth: number = 1
  ): Promise<ResearchPath> {
    const path = this.paths.get(pathId);
    if (!path) {
      throw new Error(`Path ${pathId} not found`);
    }

    this.logHistory('refine_path', { pathId, feedback, depth });

    // Check max depth
    const currentDepth = path.metadata.depth || 0;
    const maxDepth = path.metadata.maxDepth || 5;

    if (currentDepth >= maxDepth) {
      throw new Error(`Path ${pathId} has reached maximum depth (${maxDepth})`);
    }

    // Generate refined query
    const refinedQuery = feedback
      ? this.addFeedbackToQuery(path.query, feedback)
      : this.deepenQuery(path.query, currentDepth);

    // Create new step
    const newStep: ResearchStep = {
      step_number: path.steps.length + 1,
      type: 'analyze',
      action: 'refine',
      query: refinedQuery,
      input: path.query,  // Previous query as input
      timestamp: new Date().toISOString(),
      metadata: {
        refinement_depth: currentDepth + 1,
        feedback: feedback || 'automatic_deepening'
      }
    };

    // Update path
    path.steps.push(newStep);
    path.metadata.depth = currentDepth + 1;
    path.status = 'active';
    path.query = refinedQuery;  // Update to refined query

    this.paths.set(pathId, path);
    this.saveNodeToDb(path, 'refined');
    this.saveOperationToDb('Refine', [pathId], [pathId]);

    this.logHistory('path_refined', {
      pathId,
      new_depth: path.metadata.depth,
      refinedQuery
    });

    return path;
  }

  /**
   * Add feedback to the query
   */
  private addFeedbackToQuery(query: string, feedback: string): string {
    return `${query} focusing on ${feedback}`;
  }

  /**
   * Deepen query for automatic refinement
   */
  private deepenQuery(query: string, currentDepth: number): string {
    const qualifier = DEPTH_QUALIFIERS[currentDepth % DEPTH_QUALIFIERS.length];
    return `${qualifier} ${query}`;
  }

  // ============================================================================
  // Database Persistence (P0)
  // ============================================================================

  /**
   * Save node to database
   */
  private saveNodeToDb(path: ResearchPath, nodeType: string): void {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO got_nodes (
          node_id, session_id, parent_id, node_type,
          content, summary, quality_score, status, depth
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        path.id,
        this.sessionId,
        null,
        nodeType,
        JSON.stringify(path),
        this.summarizePath(path),
        path.score || 0,
        path.status,
        path.metadata.depth || 0
      );
    } catch (error) {
      console.error('Failed to save node to database:', error);
    }
  }

  /**
   * Save operation to database
   */
  private saveOperationToDb(
    operationType: string,
    inputNodes: string[],
    outputNodes?: string[]
  ): void {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO got_operations (
          operation_id, session_id, operation_type,
          input_nodes, output_nodes
        ) VALUES (?, ?, ?, ?, ?)
      `);

      stmt.run(
        `op_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        this.sessionId,
        operationType,
        JSON.stringify(inputNodes),
        JSON.stringify(outputNodes || [])
      );
    } catch (error) {
      console.error('Failed to save operation to database:', error);
    }
  }

  /**
   * Save history to database
   */
  private saveHistoryToDb(): void {
    try {
      // Store history as session metadata in activity_log
      const lastEntry = this.history[this.history.length - 1];
      if (!lastEntry) return;

      const stmt = this.db.prepare(`
        INSERT INTO activity_log (
          session_id, phase, event_type, message, details
        ) VALUES (?, ?, ?, ?, ?)
      `);

      stmt.run(
        this.sessionId,
        0,  // Got operations don't map to research phases
        'info',
        `GoT: ${lastEntry.action}`,
        JSON.stringify(lastEntry.result)
      );
    } catch (error) {
      console.error('Failed to save history to database:', error);
    }
  }

  /**
   * Load state from database (P0)
   */
  public loadState(sessionId: string): void {
    try {
      this.sessionId = sessionId;
      this.pathCounter = 0;
      this.paths.clear();
      this.history = [];

      // Load nodes
      const stmt = this.db.prepare(`
        SELECT * FROM got_nodes
        WHERE session_id = ?
        AND status IN ('active', 'completed', 'refined')
        ORDER BY created_at ASC
      `);

      const nodes = stmt.all(sessionId) as any[];
      for (const node of nodes) {
        const path: ResearchPath = JSON.parse(node.content);
        this.paths.set(path.id, path);
        this.pathCounter++;
      }

      // Load history
      const historyStmt = this.db.prepare(`
        SELECT * FROM activity_log
        WHERE session_id = ?
        AND message LIKE 'GoT:%'
        ORDER BY created_at ASC
      `);

      const historyEntries = historyStmt.all(sessionId) as any[];
      for (const entry of historyEntries) {
        this.history.push({
          iteration: this.history.length + 1,
          action: entry.message.replace('GoT: ', ''),
          result: JSON.parse(entry.details || '{}'),
          timestamp: entry.created_at
        });
      }

      console.log(`✅ Loaded state for session ${sessionId}: ${this.paths.size} paths, ${this.history.length} operations`);
    } catch (error) {
      console.error('Failed to load state from database:', error);
    }
  }

  // ============================================================================
  // Export/Import Functionality (P2)
  // ============================================================================

  /**
   * Export graph state to JSON
   */
  public exportState(): string {
    const exportData = {
      version: '4.0',
      sessionId: this.sessionId,
      exportedAt: new Date().toISOString(),
      statistics: {
        totalPaths: this.paths.size,
        activePaths: Array.from(this.paths.values()).filter(p => p.status === 'active').length,
        completedPaths: Array.from(this.paths.values()).filter(p => p.status === 'completed').length,
        prunedPaths: Array.from(this.paths.values()).filter(p => p.status === 'pruned').length,
        totalOperations: this.history.length
      },
      paths: Array.from(this.paths.values()),
      history: this.history
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Export graph state to file
   */
  public exportToFile(filePath: string): void {
    const fs = require('fs');
    fs.writeFileSync(filePath, this.exportState(), 'utf-8');
    console.log(`✅ Exported state to ${filePath}`);
  }

  /**
   * Import graph state from JSON
   */
  public importState(json: string): void {
    try {
      const data = JSON.parse(json);

      // Validate version
      if (data.version && !['3.1', '4.0'].includes(data.version)) {
        console.warn(`⚠️  Unknown version ${data.version}, attempting import anyway`);
      }

      // Clear current state
      this.paths.clear();
      this.history = [];

      // Import session
      if (data.sessionId) {
        this.sessionId = data.sessionId;
      }

      // Import paths
      if (data.paths) {
        for (const path of data.paths) {
          this.paths.set(path.id, path);
          this.pathCounter++;
        }
      }

      // Import history
      if (data.history) {
        this.history = data.history;
      }

      console.log(`✅ Imported state: ${this.paths.size} paths, ${this.history.length} operations`);
    } catch (error) {
      throw new Error(`Failed to import state: ${error}`);
    }
  }

  /**
   * Import graph state from file
   */
  public importFromFile(filePath: string): void {
    const fs = require('fs');
    const content = fs.readFileSync(filePath, 'utf-8');
    this.importState(content);
  }

  // ============================================================================
  // Visualization Support (P2)
  // ============================================================================

  /**
   * Export graph for visualization
   */
  public exportVisualization(): GraphVisualization {
    const nodes: GraphVisualization['nodes'] = [];
    const edges: GraphVisualization['edges'] = [];

    // Add all paths as nodes
    for (const path of this.paths.values()) {
      nodes.push({
        id: path.id,
        label: `${path.focus || 'Path'}: ${path.query.substring(0, 50)}...`,
        type: 'path',
        score: path.score,
        status: path.status,
        focus: path.focus
      });

      // Add edges from operations
      for (const entry of this.history) {
        if (entry.action === 'aggregate_paths') {
          const sources = entry.result.paths || [];
          for (const source of sources) {
            edges.push({
              from: source.id || source,
              to: path.id,
              label: 'aggregated',
              type: 'aggregate'
            });
          }
        }
      }
    }

    return {
      nodes,
      edges,
      metadata: {
        sessionId: this.sessionId,
        totalPaths: this.paths.size,
        generatedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Export visualization to file (GraphViz DOT format)
   */
  public exportVisualizationToDot(filePath: string): void {
    const viz = this.exportVisualization();
    const fs = require('fs');

    let dot = 'digraph GraphOfThoughts {\n';
    dot += '  rankdir=TB;\n';
    dot += '  node [shape=box];\n\n';

    // Add nodes
    for (const node of viz.nodes) {
      const color = this.getStatusColor(node.status);
      dot += `  "${node.id}" [label="${node.label}", fillcolor="${color}", style=filled];\n`;
    }

    // Add edges
    for (const edge of viz.edges) {
      dot += `  "${edge.from}" -> "${edge.to}" [label="${edge.label || ''}"];\n`;
    }

    dot += '}\n';

    fs.writeFileSync(filePath, dot, 'utf-8');
    console.log(`✅ Exported visualization to ${filePath}`);
  }

  private getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      active: 'lightblue',
      completed: 'lightgreen',
      pruned: 'lightgray',
      pending: 'lightyellow'
    };
    return colors[status] || 'white';
  }

  // ============================================================================
  // Improved Aggregation Algorithms (P1)
  // ============================================================================

  /**
   * Synthesize narrative with structured format
   */
  private synthesizeNarrativeStructured(outputs: string[]): string {
    if (outputs.length === 0) return '';

    return `
# Research Synthesis

## Executive Summary
This synthesis integrates findings from ${outputs.length} research outputs, providing a comprehensive analysis of the topic.

## Key Findings

${outputs.map((o, i) => `
### Finding ${i + 1}

${o}
`).join('\n---\n\n')}

## Conclusion
The integrated findings from these ${outputs.length} sources provide a multi-faceted perspective on the research topic. The convergence of evidence across different domains strengthens the validity of these conclusions.
    `.trim();
  }

  /**
   * Voting aggregation with actual majority detection
   */
  private votingAggregationImproved(outputs: string[]): string {
    if (outputs.length === 0) return '';

    // Split outputs into sentences and find common themes
    const sentences = outputs.flatMap(o => o.split(/[.!?]+/).filter(s => s.trim().length > 10));

    // Simple sentence clustering by keyword overlap
    const clusters = this.clusterSentences(sentences);
    const majorityClusters = clusters.filter(c => c.sentences.length >= Math.ceil(outputs.length / 2));

    return `
# Voting-Based Aggregation

## Majority Findings
${majorityClusters.map((cluster, i) => `
### Theme ${i + 1}: ${cluster.theme}
${cluster.sentences.slice(0, 3).join(' ')}.
`).join('\n\n')}

## Methodology
These findings represent the majority consensus across ${outputs.length} research outputs, where at least ${Math.ceil(outputs.length / 2)} sources contributed to each theme.
    `.trim();
  }

  /**
   * Thematic synthesis
   */
  private synthesizeByTheme(outputs: string[]): string {
    const themes = this.detectThemes(outputs);

    return `
# Thematic Synthesis

${themes.map(theme => `
## ${theme.name}

${theme.outputs.slice(0, 2).join('\n\n')}
`).join('\n---\n\n')}

## Summary
The analysis identified ${themes.length} primary themes across the research outputs.
    `.trim();
  }

  /**
   * Chronological synthesis
   */
  private synthesizeChronological(paths: ResearchPath[]): string {
    const sortedPaths = [...paths].sort((a, b) => {
      const timeA = new Date(a.steps[0]?.timestamp || 0).getTime();
      const timeB = new Date(b.steps[0]?.timestamp || 0).getTime();
      return timeA - timeB;
    });

    return `
# Chronological Research Evolution

${sortedPaths.map((path, i) => `
## Phase ${i + 1}: ${path.focus || 'Research Stage'}

**Query:** ${path.query}

${path.steps.filter(s => s.output).map(s => s.output).join('\n\n')}
`).join('\n---\n\n')}

## Evolution Summary
The research progressed through ${sortedPaths.length} distinct phases, each building on previous findings.
    `.trim();
  }

  // ============================================================================
  // Helper Methods (Fixed Placeholders - P0)
  // ============================================================================

  /**
   * Calculate query similarity using word overlap (FIXED - P0)
   * No longer returns random values
   */
  private calculateQuerySimilarity(pathId1: string, pathId2: string): number {
    const path1 = this.paths.get(pathId1);
    const path2 = this.paths.get(pathId2);
    if (!path1 || !path2) return 0;

    const tokenize = (text: string) => {
      const words = text.toLowerCase()
        .split(/[\s\W_]+/)
        .filter(w => w.length > 3);  // Ignore short words
      return new Set(words);
    };

    const words1 = tokenize(path1.query);
    const words2 = tokenize(path2.query);

    if (words1.size === 0 && words2.size === 0) return 1.0;
    if (words1.size === 0 || words2.size === 0) return 0.0;

    // Calculate Jaccard similarity
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return union.size > 0 ? intersection.size / union.size : 0.0;
  }

  /**
   * Select templates based on strategy
   */
  private selectTemplates(
    k: number,
    strategy: string,
    context?: any
  ): Array<{ focus: string; query_pattern: string; sources: string[]; weight: number }> {
    const templates = Object.values(PATH_TEMPLATES);

    switch (strategy) {
      case 'diverse':
        return templates.sort((a, b) => b.weight - a.weight).slice(0, Math.min(k, templates.length));

      case 'focused':
        return templates.sort((a, b) => b.weight - a.weight).slice(0, k);

      case 'exploratory':
        return [...templates].sort(() => Math.random() - 0.5).slice(0, k);

      case 'orthogonal':
        return [
          PATH_TEMPLATES.academic,
          PATH_TEMPLATES.industry,
          PATH_TEMPLATES.policy,
          PATH_TEMPLATES.technical,
          PATH_TEMPLATES.news
        ].slice(0, k);

      default:
        return templates.slice(0, k);
    }
  }

  /**
   * Generate subtopic for diversification
   */
  private generateSubtopic(query: string, index: number, total: number): string {
    const subtopics = [
      'overview and introduction',
      'technical details',
      'practical applications',
      'challenges and limitations',
      'future directions',
      'case studies',
      'best practices',
      'comparative analysis'
    ];
    return subtopics[index % subtopics.length];
  }

  /**
   * Customize query with replacements
   */
  private customizeQuery(pattern: string, topic: string, subtopic: string): string {
    const year = new Date().getFullYear();
    return pattern
      .replace('{topic}', topic)
      .replace('{subtopic}', subtopic)
      .replace('{year}', String(year));
  }

  /**
   * Calculate diversity score
   */
  private calculateDiversity(pathId: string, existingPaths: ResearchPath[]): number {
    if (existingPaths.length === 0) return 1.0;

    let overlapSum = 0;
    for (const existing of existingPaths) {
      const querySimilarity = this.calculateQuerySimilarity(pathId, existing.id);
      overlapSum += querySimilarity;
    }

    const avgOverlap = overlapSum / existingPaths.length;
    return 1.0 - avgOverlap;
  }

  /**
   * Calculate path score
   */
  private calculatePathScore(
    path: ResearchPath,
    criteria?: any
  ): { total: number; breakdown: any } {
    const weights = criteria?.scoring_criteria || {
      citation_quality: 0.3,
      completeness: 0.4,
      relevance: 0.3
    };

    let score = 0;
    const breakdown: any = {};

    const stepsScore = Math.min(path.steps.length * 10, 40);
    breakdown.steps = stepsScore;
    score += stepsScore * weights.completeness;

    const outputCount = path.steps.filter(s => s.output).length;
    const outputScore = outputCount * 20;
    breakdown.outputs = outputScore;
    score += outputScore * weights.citation_quality;

    const diversityScore = path.metadata.diversity_score || 0.5;
    const relevanceScore = diversityScore * 30;
    breakdown.relevance = relevanceScore;
    score += relevanceScore * weights.relevance;

    const normalizedScore = Math.min(score / 10, 10);

    return {
      total: Math.round(normalizedScore * 100) / 100,
      breakdown
    };
  }

  /**
   * Extract facts from paths
   */
  private extractFacts(paths: ResearchPath[]): ExtractedFact[] {
    const facts: ExtractedFact[] = [];
    for (const path of paths) {
      for (const step of path.steps) {
        if (step.facts) {
          facts.push(...step.facts);
        }
      }
    }
    return facts;
  }

  /**
   * Detect conflicts between facts
   */
  private detectConflicts(facts: ExtractedFact[]): any[] {
    const conflicts: any[] = [];

    for (let i = 0; i < facts.length; i++) {
      for (let j = i + 1; j < facts.length; j++) {
        if (this.areContradictory(facts[i], facts[j])) {
          conflicts.push({
            fact1: facts[i],
            fact2: facts[j],
            type: 'contradiction'
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Check if two facts are contradictory
   */
  private areContradictory(fact1: ExtractedFact, fact2: ExtractedFact): boolean {
    const s1 = (fact1.statement || '').toLowerCase();
    const s2 = (fact2.statement || '').toLowerCase();

    if (!s1 || !s2) return false;

    const contradictions = [
      ['yes', 'no'],
      ['true', 'false'],
      ['effective', 'ineffective'],
      ['increases', 'decreases'],
      ['supports', 'opposes'],
      ['beneficial', 'harmful'],
      ['significant', 'negligible']
    ];

    for (const [pos, neg] of contradictions) {
      if ((s1.includes(pos) && s2.includes(neg)) ||
          (s1.includes(neg) && s2.includes(pos))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Consensus aggregation with conflict resolution
   */
  private consensusAggregation(paths: ResearchPath[], conflicts: any[]): string {
    let content = paths.map(p => p.steps.map(s => s.output).join('\n')).join('\n\n---\n\n');

    if (conflicts.length > 0) {
      content += '\n\n## Conflicts Detected\n\n';
      content += conflicts.map(c => `- ${(c.fact1?.statement || c.claim1)} vs ${(c.fact2?.statement || c.claim2)}`).join('\n');
    }

    return content;
  }

  /**
   * Calculate synthesis confidence
   */
  private calculateSynthesisConfidence(paths: ResearchPath[]): number {
    const avgScore = paths.reduce((sum, p) => sum + (p.score ?? 0), 0) / paths.length;
    const pathCount = paths.length;
    return Math.min((avgScore / 10) * (1 + pathCount * 0.1), 1.0);
  }

  /**
   * Calculate voting confidence
   */
  private calculateVotingConfidence(paths: ResearchPath[]): number {
    const agreementThreshold = paths.length * 0.6;
    return agreementThreshold / paths.length;
  }

  /**
   * Calculate consensus confidence
   */
  private calculateConsensusConfidence(paths: ResearchPath[], conflicts: any[]): number {
    const baseConfidence = this.calculateSynthesisConfidence(paths);
    const conflictPenalty = conflicts.length * 0.05;
    return Math.max(baseConfidence - conflictPenalty, 0.3);
  }

  /**
   * Detect themes in outputs
   */
  private detectThemes(outputs: string[]): Theme[] {
    const keywords = [
      'performance', 'security', 'scalability', 'usability',
      'cost', 'reliability', 'maintainability', 'efficiency'
    ];

    const themes: Theme[] = [];

    for (const keyword of keywords) {
      const matching = outputs.filter(o => o.toLowerCase().includes(keyword));
      if (matching.length >= 2) {
        themes.push({
          name: keyword.charAt(0).toUpperCase() + keyword.slice(1),
          keywords: [keyword],
          outputs: matching
        });
      }
    }

    return themes.sort((a, b) => b.outputs.length - a.outputs.length);
  }

  /**
   * Cluster sentences by keyword overlap
   */
  private clusterSentences(sentences: string[]): Array<{ theme: string; sentences: string[] }> {
    const clusters: Array<{ theme: string; sentences: string[] }> = [];
    const used = new Set<number>();

    for (let i = 0; i < sentences.length; i++) {
      if (used.has(i)) continue;

      const cluster = [sentences[i]];
      used.add(i);

      // Find similar sentences
      for (let j = i + 1; j < sentences.length; j++) {
        if (used.has(j)) continue;

        const similarity = this.calculateSentenceSimilarity(sentences[i], sentences[j]);
        if (similarity > 0.3) {
          cluster.push(sentences[j]);
          used.add(j);
        }
      }

      const theme = this.extractTheme(cluster[0]);
      clusters.push({ theme, sentences: cluster });
    }

    return clusters;
  }

  /**
   * Calculate sentence similarity
   */
  private calculateSentenceSimilarity(s1: string, s2: string): number {
    const words1 = new Set(s1.toLowerCase().split(/\s+/));
    const words2 = new Set(s2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Extract theme from sentence
   */
  private extractTheme(sentence: string): string {
    const words = sentence.split(/\s+/).filter(w => w.length > 5);
    return words[0]?.charAt(0).toUpperCase() + words[0]?.slice(1) || 'General';
  }

  /**
   * Summarize path for storage
   */
  private summarizePath(path: ResearchPath): string {
    return `${path.focus || 'Research'}: ${path.query.substring(0, 100)}... (${path.steps.length} steps)`;
  }

  // ============================================================================
  // Public API Methods
  // ============================================================================

  /**
   * Get all paths
   */
  public getPaths(): ResearchPath[] {
    return Array.from(this.paths.values());
  }

  /**
   * Get path by ID
   */
  public getPath(pathId: string): ResearchPath | undefined {
    return this.paths.get(pathId);
  }

  /**
   * Update path
   */
  public updatePath(path: ResearchPath): void {
    this.paths.set(path.id, path);
    this.saveNodeToDb(path, 'updated');
  }

  /**
   * Delete path
   */
  public deletePath(pathId: string): boolean {
    const deleted = this.paths.delete(pathId);
    if (deleted) {
      try {
        this.db.prepare('DELETE FROM got_nodes WHERE node_id = ?').run(pathId);
      } catch (error) {
        console.error('Failed to delete node from database:', error);
      }
    }
    return deleted;
  }

  /**
   * Get graph state for debugging/analysis
   */
  public getGraphState(): any {
    return {
      sessionId: this.sessionId,
      total_paths: this.paths.size,
      active_paths: Array.from(this.paths.values()).filter(p => p.status === 'active').length,
      completed_paths: Array.from(this.paths.values()).filter(p => p.status === 'completed').length,
      pruned_paths: Array.from(this.paths.values()).filter(p => p.status === 'pruned').length,
      history: this.history,
      statistics: {
        total_operations: this.history.length,
        operation_types: this.getOperationTypes()
      }
    };
  }

  /**
   * Get operation type statistics
   */
  private getOperationTypes(): Record<string, number> {
    const types: Record<string, number> = {};
    for (const entry of this.history) {
      types[entry.action] = (types[entry.action] || 0) + 1;
    }
    return types;
  }

  /**
   * Clear all paths and history
   */
  public clear(): void {
    this.paths.clear();
    this.history = [];
    this.pathCounter = 0;
  }

  /**
   * Clone the controller with same session
   */
  public clone(): GraphController {
    const cloned = new GraphController(this.sessionId);
    cloned.paths = new Map(this.paths);
    cloned.pathCounter = this.pathCounter;
    cloned.history = [...this.history];
    return cloned;
  }
}
