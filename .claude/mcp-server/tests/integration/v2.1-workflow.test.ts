/**
 * v2.1 Workflow Integration Test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

import {
  createSessionHandler,
  updateSessionStatusHandler,
  getSessionInfoHandler,
} from '../../dist/tools/state-tools.js';

describe('v2.1 State Management Workflow', () => {
  it('should create a research session', () => {
    const result = createSessionHandler({
      topic: 'Test Research',
      output_dir: '/tmp/test'
    });
    assert.match(result.session_id, /^[0-9a-f-]{36}$/);
    console.log('✅ Session created:', result.session_id);
  });
});
