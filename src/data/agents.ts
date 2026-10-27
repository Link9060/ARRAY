export type AgentCategory = 'intelligence' | 'operations';
export type OperationsMode = 'general' | 'coding';

export interface Agent {
  id: string;
  name: string;
  designation: string;
  category: AgentCategory;
  description: string;
  capabilities: string[];
}

export interface CategoryDefinition {
  id: AgentCategory;
  name: string;
  code: string;
  subtitle: string;
  accent: string;
}

// These are logical mission slots, not twelve permanent model processes.
export const CATEGORIES: CategoryDefinition[] = [
  { id: 'intelligence', name: 'Intelligence', code: 'A-01', subtitle: 'Research / Plan', accent: '#a9baff' },
  { id: 'operations', name: 'Operations', code: 'A-02', subtitle: 'Build / Create', accent: '#90ddc6' },
];

const classDetails = {
  intelligence: { description: 'Researches, compares, plans and reasons about an objective.', capabilities: ['Research', 'Planning'] },
  operations: { description: 'Handles complex writing, coding guidance and creative work.', capabilities: ['Creation', 'Problem solving'] },
} as const;

export const AGENTS: Agent[] = CATEGORIES.flatMap(category =>
  Array.from({ length: 6 }, (_, index) => {
    const id = String(index + 1).padStart(2, '0');
    return {
      id: category.id + '-' + id,
      name: category.name + ' ' + id,
      designation: category.code + '-' + id,
      category: category.id,
      ...classDetails[category.id],
      capabilities: [...classDetails[category.id].capabilities],
    };
  })
);

export const ARRAY_MODELS = Object.freeze({
  intelligence: { label: 'Granite 4.0 H Micro', id: '@cf/ibm-granite/granite-4.0-h-micro' },
  general: { label: 'Gemma 4 26B A4B', id: '@cf/google/gemma-4-26b-a4b-it' },
  coding: { label: 'Qwen 3.8 27B', id: '@cf/qwen/qwen3.8-27b' },
});

export function modelForSelection(category: AgentCategory, operationsMode: OperationsMode) {
  return category === 'intelligence' ? ARRAY_MODELS.intelligence : ARRAY_MODELS[operationsMode];
}
export function getAgentsForCategory(category: AgentCategory): Agent[] {
  return AGENTS.filter(agent => agent.category === category);
}
