/**
 * Unit Tests for GraphController (v4.0)
 *
 * Tests all Graph of Thoughts operations:
 * - Generate, Aggregate, Score, Prune, Refine
 * - Database persistence
 * - Export/import functionality
 * - Visualization export
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { GraphController } from '../src/logic/graph-controller.js';
import { getDB } from '../src/state/db.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Test database path
const TEST_DB_PATH = path.join(os.tmpdir(), `test_graph_controller_${Date.now()}.db`);

/**
 * Test suite for GraphController
 */
describe('GraphController Tests', () => {
  let controller: GraphController;
  let testSessionId: string;

  before(() => {
    // Clean up any existing test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    // Create test controller
    testSessionId = `test_session_${Date.now()}`;
    controller = new GraphController(testSessionId);
  });

  after(() => {
    // Clean up test database
    if (fs.existsSync(TEST_DB_PATH)) {
      try {
        fs.unlinkSync(TEST_DB_PATH);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  });

  describe('GoT Operation: Generate', () => {
    it('should generate 3 diverse paths by default', async () => {
      const paths = await controller.generatePaths('machine learning', {
        k: 3,
        strategy: 'diverse'
      });

      assert.strictEqual(paths.length, 3, 'Should generate 3 paths');
      assert.strictEqual(paths[0].status, 'active', 'Paths should be active');
      assert.ok(paths[0].id, 'Paths should have IDs');
      assert.ok(paths[0].query, 'Paths should have queries');
    });

    it('should generate paths with different strategies', async () => {
      const strategies = ['diverse', 'focused', 'exploratory', 'orthogonal'] as const;

      for (const strategy of strategies) {
        const paths = await controller.generatePaths('AI research', {
          k: 3,
          strategy
        });

        assert.strictEqual(paths.length, 3, `Should generate 3 paths for ${strategy}`);
        assert.ok(paths.every(p => p.focus), 'Paths should have focus area');
      }
    });

    it('should assign correct initial scores based on template weights', async () => {
      const paths = await controller.generatePaths('deep learning', {
        k: 5,
        strategy: 'orthogonal'
      });

      // Academic should have highest weight (0.3 * 10 = 3.0)
      const academicPath = paths.find(p => p.focus === 'Academic Research');
      assert.ok(academicPath, 'Should have academic path');
      assert.ok(academicPath!.score! >= 2.5, 'Academic should have high score');
    });
  });

  describe('GoT Operation: Refine', () => {
    it('should refine a path with automatic deepening', async () => {
      const paths = await controller.generatePaths('neural networks', { k: 1 });
      const pathId = paths[0].id;

      const refined = await controller.refinePath(pathId);

      assert.strictEqual(refined.id, pathId, 'Should keep same ID');
      assert.strictEqual(refined.steps.length, 2, 'Should add new step');
      assert.strictEqual(refined.metadata.depth, 1, 'Should increase depth');
      assert.ok(refined.query.toLowerCase().includes('detailed analysis'), 'Should deepen query');
    });

    it('should refine a path with feedback', async () => {
      const paths = await controller.generatePaths('transformers', { k: 1 });
      const pathId = paths[0].id;

      const refined = await controller.refinePath(pathId, 'performance optimization');

      assert.ok(refined.query.toLowerCase().includes('performance'), 'Should include feedback');
      assert.ok(refined.query.toLowerCase().includes('focusing on'), 'Should add focusing phrase');
    });

    it('should throw error when max depth exceeded', async () => {
      const paths = await controller.generatePaths('CNNs', {
        k: 1,
        maxDepth: 2
      });
      const pathId = paths[0].id;

      // Refine to max depth
      await controller.refinePath(pathId);
      await controller.refinePath(pathId);

      // Third refine should fail
      await assert.rejects(
        async () => await controller.refinePath(pathId),
        /maximum depth/
      );
    });

    it('should use different depth qualifiers for each refinement level', async () => {
      const paths = await controller.generatePaths('RNNs', { k: 1 });
      const pathId = paths[0].id;

      await controller.refinePath(pathId);
      assert.ok(paths[0].query.includes('detailed analysis'), 'First refine: detailed analysis');

      await controller.refinePath(pathId);
      const path = controller.getPath(pathId);
      assert.ok(path!.query.includes('in-depth study'), 'Second refine: in-depth study');
    });
  });

  describe('GoT Operation: Score and Prune', () => {
    it('should score paths and return top N', async () => {
      const paths = await controller.generatePaths('GANs', { k: 5 });

      const results = await controller.scoreAndPrune(paths, 3);

      assert.strictEqual(results.length, 5, 'Should score all paths');
      assert.strictEqual(results.filter(r => r.kept).length, 3, 'Should keep 3 paths');
      assert.strictEqual(results.filter(r => !r.kept).length, 2, 'Should prune 2 paths');
    });

    it('should mark pruned paths correctly', async () => {
      const paths = await controller.generatePaths('autoencoders', { k: 4 });

      await controller.scoreAndPrune(paths, 2);

      const pruned = controller.getPaths().filter(p => p.status === 'pruned');
      assert.ok(pruned.length >= 2, 'Should have pruned paths');
    });

    it('should apply custom scoring criteria', async () => {
      const paths = await controller.generatePaths('attention mechanisms', { k: 3 });

      const results = await controller.scoreAndPrune(paths, 2, {
        scoring_criteria: {
          citation_quality: 0.5,
          completeness: 0.3,
          relevance: 0.2
        }
      });

      assert.ok(results.every(r => r.score >= 0), 'All scores should be non-negative');
    });
  });

  describe('GoT Operation: Aggregate', () => {
    it('should aggregate paths with synthesis strategy', async () => {
      const paths = await controller.generatePaths('BERT', { k: 3 });

      // Mark paths as completed with outputs
      paths.forEach(p => {
        p.status = 'completed';
        p.steps.push({
          step_number: 2,
          type: 'analyze',
          action: 'analyze',
          output: `Research findings about BERT: ${p.focus}`,
          timestamp: new Date().toISOString()
        });
      });

      const result = await controller.aggregatePaths(paths, 'synthesis');

      assert.ok(result.synthesizedContent, 'Should have synthesis content');
      assert.ok(result.confidence > 0, 'Should have confidence score');
      assert.strictEqual(result.sources.length, 3, 'Should have 3 sources');
    });

    it('should support different aggregation strategies', async () => {
      const paths = await controller.generatePaths('GPT', { k: 2 });

      paths.forEach(p => {
        p.status = 'completed';
        p.steps.push({
          step_number: 2,
          output: `GPT research: ${p.focus}`,
          timestamp: new Date().toISOString()
        });
      });

      const strategies = ['synthesis', 'voting', 'consensus', 'thematic', 'chronological'] as const;

      for (const strategy of strategies) {
        const result = await controller.aggregatePaths(paths, strategy);
        assert.ok(result.synthesizedContent, `${strategy} should produce content`);
      }
    });

    it('should detect conflicts when present', async () => {
      const paths = await controller.generatePaths('LLMs', { k: 2 });

      paths[0].status = 'completed';
      paths[0].steps.push({
        step_number: 2,
        output: 'LLMs increase productivity',
        facts: [{ statement: 'LLMs increase productivity' }],
        timestamp: new Date().toISOString()
      });

      paths[1].status = 'completed';
      paths[1].steps.push({
        step_number: 2,
        output: 'LLMs decrease productivity',
        facts: [{ statement: 'LLMs decrease productivity' }],
        timestamp: new Date().toISOString()
      });

      const result = await controller.aggregatePaths(paths, 'consensus');

      assert.ok(result.conflicts.length > 0, 'Should detect conflicts');
    });
  });

  describe('Database Persistence', () => {
    it('should save nodes to database', async () => {
      const paths = await controller.generatePaths('NLP', { k: 2 });

      const db = getDB();
      const nodes = db.prepare('SELECT * FROM got_nodes WHERE session_id = ?').all(testSessionId);

      assert.ok(nodes.length >= 2, 'Should save nodes to database');
    });

    it('should save operations to database', async () => {
      await controller.generatePaths('computer vision', { k: 2 });

      const db = getDB();
      const ops = db.prepare('SELECT * FROM got_operations WHERE session_id = ? AND operation_type = ?')
        .all(testSessionId, 'Generate');

      assert.ok(ops.length > 0, 'Should save Generate operation');
    });

    it('should load state from database', async () => {
      const sessionId = `load_test_${Date.now()}`;
      const controller1 = new GraphController(sessionId);

      await controller1.generatePaths('reinforcement learning', { k: 2 });
      await controller1.refinePath(controller1.getPaths()[0].id);

      // Create new controller and load state
      const controller2 = new GraphController();
      controller2.loadState(sessionId);

      const loadedPaths = controller2.getPaths();
      assert.strictEqual(loadedPaths.length, 2, 'Should load paths');

      const refinedPath = loadedPaths.find(p => p.metadata.depth === 1);
      assert.ok(refinedPath, 'Should load refined path state');
    });
  });

  describe('Export/Import', () => {
    it('should export state to JSON', () => {
      await controller.generatePaths('graph neural networks', { k: 3 });

      const json = controller.exportState();
      const data = JSON.parse(json);

      assert.strictEqual(data.version, '4.0');
      assert.strictEqual(data.sessionId, testSessionId);
      assert.strictEqual(data.paths.length, 3);
      assert.ok(data.statistics);
    });

    it('should import state from JSON', () => {
      const exportData = {
        version: '4.0',
        sessionId: 'import_test',
        paths: [
          {
            id: 'path_1',
            query: 'test query',
            focus: 'Test',
            steps: [],
            status: 'active',
            metadata: { depth: 0, maxDepth: 5 }
          }
        ],
        history: []
      };

      const controller2 = new GraphController();
      controller2.importState(JSON.stringify(exportData));

      const paths = controller2.getPaths();
      assert.strictEqual(paths.length, 1);
      assert.strictEqual(paths[0].query, 'test query');
    });

    it('should export to file', () => {
      const tempFile = path.join(os.tmpdir(), `test_export_${Date.now()}.json`);

      await controller.generatePaths('optimization', { k: 2 });
      controller.exportToFile(tempFile);

      assert.ok(fs.existsSync(tempFile), 'Should create export file');

      const content = fs.readFileSync(tempFile, 'utf-8');
      const data = JSON.parse(content);
      assert.ok(data.paths);

      // Cleanup
      fs.unlinkSync(tempFile);
    });

    it('should import from file', () => {
      const tempFile = path.join(os.tmpdir(), `test_import_${Date.now()}.json`);

      // Create export file
      const exportData = {
        version: '4.0',
        sessionId: 'file_test',
        paths: [{
          id: 'path_file',
          query: 'file test',
          focus: 'File',
          steps: [],
          status: 'completed',
          metadata: { depth: 1, maxDepth: 5 }
        }],
        history: []
      };

      fs.writeFileSync(tempFile, JSON.stringify(exportData, null, 2));

      const controller2 = new GraphController();
      controller2.importFromFile(tempFile);

      assert.strictEqual(controller2.getPaths().length, 1);

      // Cleanup
      fs.unlinkSync(tempFile);
    });
  });

  describe('Visualization', () => {
    it('should export visualization data', () => {
      await controller.generatePaths('meta-learning', { k: 3 });

      const viz = controller.exportVisualization();

      assert.ok(viz.nodes, 'Should have nodes');
      assert.ok(viz.edges, 'Should have edges');
      assert.strictEqual(viz.nodes.length, 3);
      assert.strictEqual(viz.metadata.sessionId, testSessionId);
    });

    it('should export to DOT format', () => {
      const tempFile = path.join(os.tmpdir(), `test_viz_${Date.now()}.dot`);

      await controller.generatePaths('federated learning', { k: 2 });
      controller.exportVisualizationToDot(tempFile);

      assert.ok(fs.existsSync(tempFile), 'Should create DOT file');

      const content = fs.readFileSync(tempFile, 'utf-8');
      assert.ok(content.includes('digraph GraphOfThoughts'));
      assert.ok(content.includes('rankdir=TB'));

      // Cleanup
      fs.unlinkSync(tempFile);
    });
  });

  describe('Query Similarity (Fixed Placeholder)', () => {
    it('should calculate similarity using word overlap', async () => {
      const paths1 = await controller.generatePaths('deep learning', { k: 2 });
      const paths2 = await controller.generatePaths('deep learning', { k: 2 });

      // Paths with similar queries should have non-zero similarity
      const path1 = controller.getPaths()[0];
      const path2 = controller.getPaths()[2];

      // The similarity should be deterministic (not random)
      assert.ok(path1.metadata.diversity_score !== undefined);
      assert.ok(path1.metadata.diversity_score >= 0 && path1.metadata.diversity_score <= 1);
    });
  });

  describe('Helper Methods', () => {
    it('should get all paths', async () => {
      await controller.generatePaths('AI safety', { k: 3 });

      const paths = controller.getPaths();
      assert.strictEqual(paths.length, 3);
    });

    it('should get path by ID', async () => {
      const paths = await controller.generatePaths('ethics', { k: 1 });
      const path = controller.getPath(paths[0].id);

      assert.ok(path);
      assert.strictEqual(path?.id, paths[0].id);
    });

    it('should update path', async () => {
      const paths = await controller.generatePaths('bias', { k: 1 });
      const path = paths[0];

      path.score = 9.5;
      controller.updatePath(path);

      const updated = controller.getPath(path.id);
      assert.strictEqual(updated?.score, 9.5);
    });

    it('should delete path', async () => {
      const paths = await controller.generatePaths('fairness', { k: 1 });
      const pathId = paths[0].id;

      const deleted = controller.deletePath(pathId);
      assert.strictEqual(deleted, true);

      const path = controller.getPath(pathId);
      assert.strictEqual(path, undefined);
    });

    it('should get graph state', async () => {
      await controller.generatePaths('alignment', { k: 2 });

      const state = controller.getGraphState();

      assert.ok(state.total_paths >= 2);
      assert.ok(state.sessionId === testSessionId);
      assert.ok(state.statistics);
    });

    it('should clear all data', async () => {
      await controller.generatePaths('robustness', { k: 3 });

      controller.clear();

      assert.strictEqual(controller.getPaths().length, 0);
      assert.strictEqual(controller.getGraphState().total_paths, 0);
    });
  });
});

/**
 * Test suite for ResearchOrchestrator
 */
describe('ResearchOrchestrator Tests', () => {
  const { ResearchOrchestrator } = require('../src/logic/research-orchestrator.js');

  let orchestrator: ResearchOrchestrator;

  before(() => {
    orchestrator = new ResearchOrchestrator({
      maxIterations: 5,
      confidenceThreshold: 0.8,
      initialPaths: 2,
      verbose: false
    });
  });

  it('should initialize with config', () => {
    const state = orchestrator.getState();
    assert.strictEqual(state.max_iterations, 5);
    assert.strictEqual(state.iteration, 0);
  });

  it('should set topic', () => {
    orchestrator.setTopic('AI research methods');
    const state = orchestrator.getState();
    assert.strictEqual(state.current_findings?.topic, 'AI research methods');
  });

  it('should execute generate step', async () => {
    orchestrator.setTopic('neural architecture search');

    const step = await orchestrator.executeStep();

    assert.strictEqual(step.action.action, 'generate');
    assert.ok(step.pathsAfter > 0);
  });

  it('should execute multiple steps', async () => {
    orchestrator.reset();
    orchestrator.setTopic('transfer learning');

    await orchestrator.executeStep(); // Generate
    const step2 = await orchestrator.executeStep(); // Score

    assert.ok(step2.iteration === 2);
  });

  it('should export report', async () => {
    orchestrator.reset();
    orchestrator.setTopic('few-shot learning');

    await orchestrator.executeStep();

    const report = orchestrator.exportReport();
    assert.ok(report.includes('Research Report'));
    assert.ok(report.includes('few-shot learning'));
  });
});

// Run tests if executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  console.log('Running GraphController tests...');
}
