/**
 * Conflict Detection Tool
 *
 * Detects conflicts between facts.
 * Extracted from fact-extractor
 */

interface FactInput {
  entity: string;
  attribute: string;
  value: string;
  value_type: 'number' | 'date' | 'percentage' | 'currency' | 'text';
  source?: string;
}

interface ConflictObject {
  entity: string;
  attribute: string;
  conflict_type: 'numerical' | 'temporal' | 'scope' | 'methodological';
  severity: 'critical' | 'moderate' | 'minor';
  facts: FactInput[];
  explanation: string;
}

interface ConflictDetectInput {
  facts: FactInput[];
  tolerance?: {
    numerical_percent?: number;
  };
}

/**
 * Detect conflicts between facts
 */
export async function conflictDetect(input: ConflictDetectInput): Promise<any> {
  try {
    const conflicts = detectConflicts(input.facts, input.tolerance);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            conflicts,
            total_conflicts: conflicts.length,
            severity_summary: summarizeSeverity(conflicts),
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    throw new Error(`Conflict detection failed: ${error}`);
  }
}

/**
 * Detect conflicts between facts
 */
function detectConflicts(
  facts: FactInput[],
  tolerance?: { numerical_percent?: number }
): ConflictObject[] {
  const conflicts: ConflictObject[] = [];
  const grouped = groupFactsByEntity(facts);

  for (const [entity, entityFacts] of Object.entries(grouped)) {
    const attrGroups = groupByAttribute(entityFacts);

    for (const [attribute, attrFacts] of Object.entries(attrGroups)) {
      if (attrFacts.length > 1) {
        const conflict = checkForConflict(entity, attribute, attrFacts, tolerance);
        if (conflict) {
          conflicts.push(conflict);
        }
      }
    }
  }

  return conflicts;
}

/**
 * Group facts by entity
 */
function groupFactsByEntity(facts: FactInput[]): Record<string, FactInput[]> {
  const grouped: Record<string, FactInput[]> = {};
  for (const fact of facts) {
    if (!grouped[fact.entity]) {
      grouped[fact.entity] = [];
    }
    grouped[fact.entity].push(fact);
  }
  return grouped;
}

/**
 * Group facts by attribute
 */
function groupByAttribute(facts: FactInput[]): Record<string, FactInput[]> {
  const grouped: Record<string, FactInput[]> = {};
  for (const fact of facts) {
    if (!grouped[fact.attribute]) {
      grouped[fact.attribute] = [];
    }
    grouped[fact.attribute].push(fact);
  }
  return grouped;
}

/**
 * Check if facts conflict
 */
function checkForConflict(
  entity: string,
  attribute: string,
  facts: FactInput[],
  tolerance?: { numerical_percent?: number }
): ConflictObject | null {
  // Check for numerical conflicts
  if (facts[0].value_type === 'number' || facts[0].value_type === 'currency') {
    const values = facts.map(f => parseFloat(f.value.replace(/[^0-9.]/g, '')));
    const max = Math.max(...values);
    const min = Math.min(...values);
    const diff = ((max - min) / min) * 100;

    const threshold = tolerance?.numerical_percent || 10;
    if (diff > threshold) {
      return {
        entity,
        attribute,
        conflict_type: 'numerical',
        severity: diff > 50 ? 'critical' : diff > 20 ? 'moderate' : 'minor',
        facts,
        explanation: `Values differ by ${diff.toFixed(1)}% (${min} vs ${max})`,
      };
    }
  }

  return null;
}

/**
 * Summarize conflict severity
 */
function summarizeSeverity(conflicts: ConflictObject[]): Record<string, number> {
  const summary = { critical: 0, moderate: 0, minor: 0 };
  for (const conflict of conflicts) {
    summary[conflict.severity]++;
  }
  return summary;
}
