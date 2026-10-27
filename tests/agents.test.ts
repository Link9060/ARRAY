import { describe, expect, it } from 'vitest';
import { AGENTS, ARRAY_MODELS, CATEGORIES, getAgentsForCategory, modelForSelection } from '../src/data/agents';

describe('ARRAY dual-class registry', () => {
  it('exposes six reusable workers in exactly two classes', () => {
    expect(CATEGORIES.map(category => category.id)).toEqual(['intelligence', 'operations']);
    expect(AGENTS).toHaveLength(12);
    expect(new Set(AGENTS.map(agent => agent.id)).size).toBe(12);
    expect(getAgentsForCategory('intelligence')).toHaveLength(6);
    expect(getAgentsForCategory('operations')).toHaveLength(6);
  });
  it('routes Coding to Qwen and General to Gemma without changing Intelligence', () => {
    expect(modelForSelection('operations', 'coding')).toEqual(ARRAY_MODELS.coding);
    expect(modelForSelection('operations', 'coding').id).toBe('@cf/qwen/qwen3.8-27b');
    expect(modelForSelection('operations', 'general').id).toBe('@cf/google/gemma-4-26b-a4b-it');
    expect(modelForSelection('intelligence', 'coding').id).toBe('@cf/ibm-granite/granite-4.0-h-micro');
  });
});
