export type AgentCategory = 'intelligence' | 'creation' | 'coordination' | 'execution';

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

export const CATEGORIES: CategoryDefinition[] = [
  { id: 'intelligence', name: 'Intelligence', code: 'A-01', subtitle: 'Observe / Analyze', accent: '#a9baff' },
  { id: 'creation', name: 'Creation', code: 'A-02', subtitle: 'Design / Build', accent: '#ccbaff' },
  { id: 'coordination', name: 'Coordination', code: 'A-03', subtitle: 'Organize / Plan', accent: '#90ddc6' },
  { id: 'execution', name: 'Execution', code: 'A-04', subtitle: 'Operate / Verify', accent: '#ffd5a0' },
];

export const AGENTS: Agent[] = [
  { id: 'scout', name: 'Scout', designation: 'INT-01', category: 'intelligence', description: 'Finds relevant information and brings it into focus.', capabilities: ['Research', 'Discovery', 'Source mapping'] },
  { id: 'analyst', name: 'Analyst', designation: 'INT-02', category: 'intelligence', description: 'Examines information to surface patterns and insights.', capabilities: ['Analysis', 'Comparison', 'Explanation'] },
  { id: 'researcher', name: 'Researcher', designation: 'INT-03', category: 'intelligence', description: 'Investigates detailed questions and organizes evidence.', capabilities: ['Investigation', 'Evidence', 'Summaries'] },
  { id: 'auditor', name: 'Auditor', designation: 'INT-04', category: 'intelligence', description: 'Reviews plans and work for gaps and inconsistencies.', capabilities: ['Review', 'Quality checks', 'Risk flags'] },
  { id: 'synthesist', name: 'Synthesist', designation: 'INT-05', category: 'intelligence', description: 'Combines scattered findings into a coherent picture.', capabilities: ['Synthesis', 'Briefings', 'Reporting'] },
  { id: 'pathfinder', name: 'Pathfinder', designation: 'INT-06', category: 'intelligence', description: 'Explores alternative solutions to difficult problems.', capabilities: ['Options', 'Tradeoffs', 'Exploration'] },

  { id: 'architect', name: 'Architect', designation: 'CRT-01', category: 'creation', description: 'Maps the structure of a new feature or system.', capabilities: ['System design', 'Architecture', 'Specifications'] },
  { id: 'builder', name: 'Builder', designation: 'CRT-02', category: 'creation', description: 'Turns approved ideas and requirements into implementations.', capabilities: ['Implementation', 'Code', 'Components'] },
  { id: 'designer', name: 'Designer', designation: 'CRT-03', category: 'creation', description: 'Shapes thoughtful interfaces and visual experiences.', capabilities: ['UI design', 'Interaction', 'Prototyping'] },
  { id: 'writer', name: 'Writer', designation: 'CRT-04', category: 'creation', description: 'Drafts clear, useful written material.', capabilities: ['Writing', 'Documentation', 'Editing'] },
  { id: 'prototyper', name: 'Prototyper', designation: 'CRT-05', category: 'creation', description: 'Explores concepts using lightweight early versions.', capabilities: ['Concepting', 'Mockups', 'Iteration'] },
  { id: 'refiner', name: 'Refiner', designation: 'CRT-06', category: 'creation', description: 'Improves an existing solution through focused iteration.', capabilities: ['Polish', 'Refactoring', 'Simplification'] },

  { id: 'planner', name: 'Planner', designation: 'CRD-01', category: 'coordination', description: 'Breaks large objectives into achievable milestones.', capabilities: ['Planning', 'Milestones', 'Prioritization'] },
  { id: 'navigator', name: 'Navigator', designation: 'CRD-02', category: 'coordination', description: 'Finds the next actionable route through a project.', capabilities: ['Roadmaps', 'Sequencing', 'Decisions'] },
  { id: 'scheduler', name: 'Scheduler', designation: 'CRD-03', category: 'coordination', description: 'Helps structure timelines and upcoming work.', capabilities: ['Scheduling', 'Timelines', 'Planning'] },
  { id: 'organizer', name: 'Organizer', designation: 'CRD-04', category: 'coordination', description: 'Sorts tasks and scattered material into useful systems.', capabilities: ['Organization', 'Tagging', 'Clustering'] },
  { id: 'strategist', name: 'Strategist', designation: 'CRD-05', category: 'coordination', description: 'Weighs priorities, dependencies and outcomes.', capabilities: ['Strategy', 'Tradeoffs', 'Priorities'] },
  { id: 'dispatcher', name: 'Dispatcher', designation: 'CRD-06', category: 'coordination', description: 'Routes work toward the right specialized agent.', capabilities: ['Delegation', 'Task routing', 'Handoffs'] },

  { id: 'operator', name: 'Operator', designation: 'EXE-01', category: 'execution', description: 'Coordinates approved work with permitted tools.', capabilities: ['Operations', 'Tool coordination', 'Approvals'] },
  { id: 'monitor', name: 'Monitor', designation: 'EXE-02', category: 'execution', description: 'Watches task status and reports meaningful changes.', capabilities: ['Monitoring', 'Alerts', 'Status'] },
  { id: 'integrator', name: 'Integrator', designation: 'EXE-03', category: 'execution', description: 'Connects compatible steps and systems together.', capabilities: ['Integrations', 'Workflows', 'Connections'] },
  { id: 'tester', name: 'Tester', designation: 'EXE-04', category: 'execution', description: 'Runs approved checks and identifies issues.', capabilities: ['Testing', 'Validation', 'Bug reports'] },
  { id: 'reporter', name: 'Reporter', designation: 'EXE-05', category: 'execution', description: 'Turns mission outcomes into readable updates.', capabilities: ['Reports', 'Updates', 'Summaries'] },
  { id: 'maintainer', name: 'Maintainer', designation: 'EXE-06', category: 'execution', description: 'Helps keep authorized systems organized and reliable.', capabilities: ['Maintenance', 'Review', 'Follow-up'] },
];

export function getAgentsForCategory(category: AgentCategory): Agent[] {
  return AGENTS.filter((agent) => agent.category === category);
}
