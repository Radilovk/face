import { advisorChat, advisorStatus } from '../advisor/chat.js';

export async function handleAdvisorStatus(env) {
  return advisorStatus(env);
}

export async function handleAdvisorChat(request, env) {
  const body = await request.json().catch(() => ({}));
  return advisorChat(env, {
    domain: body.domain,
    message: body.message,
    history: body.history,
  });
}
