export interface AIModel {
  name: string;
  provider: 'google' | 'openai' | 'mistral';
  cost: string;
  tier: 'free' | 'pro';
  icon: string;
  description: string;
}

export const AI_MODELS: Record<string, AIModel> = {
  'gemini-2.5-flash': {
    name: 'Gemini 2.5 Flash',
    provider: 'google',
    cost: 'Free',
    tier: 'free',
    icon: '🔥',
    description: 'Fast and efficient for most tasks'
  },
  'o3-mini': {
    name: 'OpenAI o3-mini',
    provider: 'openai',
    cost: '$2.75/1M',
    tier: 'pro',
    icon: '🧠',
    description: 'Advanced reasoning for complex analysis'
  },
  'mistral-medium-2505': {
    name: 'Mistral Medium 2505',
    provider: 'mistral',
    cost: '$2.40/1M',
    tier: 'pro',
    icon: '⚡',
    description: 'Enterprise-grade performance'
  }
};

export const DEFAULT_MODEL = 'gemini-2.5-flash';

export function getModelDisplayName(modelKey: string): string {
  const model = AI_MODELS[modelKey];
  if (!model) return 'Unknown Model';
  
  const tierBadge = model.tier === 'free' ? '(Free)' : '(Pro)';
  return `${model.icon} ${model.name} ${tierBadge}`;
}
