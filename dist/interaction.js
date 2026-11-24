import {classifyQuestion} from './model.js';

// The pointing target and the spoken intent may arrive in either order.
export function resolveInteraction(question, target, outcome, expectedPart) {
  const intent = classifyQuestion(question);
  if (intent === 'next') return 'next';
  if (intent === 'unknown') return 'unknown';
  if (outcome !== 'normal') return 'retry';
  if (!target) return 'await-target';
  if (intent === 'compare' || target !== expectedPart) return 'compare';
  return 'where';
}
