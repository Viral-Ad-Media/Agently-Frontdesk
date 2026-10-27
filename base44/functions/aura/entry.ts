import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const TRADES = ['Plumbing', 'Electrical', 'Carpentry', 'Masonry', 'Roofing'];

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const messages = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
    const photo = typeof body.photo_url === 'string' && body.photo_url.startsWith('http') ? body.photo_url : null;
    if (messages.length === 0) return Response.json({ error: 'messages required' }, { status: 400 });

    const transcript = messages
      .map((m: { role: string; content: string }) =>
        `${m.role === 'user' ? 'Customer' : 'Aura'}: ${String(m.content || '').slice(0, 1200)}`)
      .join('\n');

    const prompt = `You are Aura, the warm, concise AI contractor-in-your-pocket for Agently Frontdesk. You help homeowners diagnose repair problems.
Rules:
- Reply in 1-3 short, spoken-friendly sentences (no markdown, no lists) in "reply".
- If the customer has described a repair problem (or attached a photo) with enough detail, also fill "diagnosis". Otherwise ask ONE clarifying question and set "diagnosis" to null.
- trade_category must be one of: ${TRADES.join(', ')}.
- severity: Minor, Moderate or Severe. Costs in USD, realistic regional rates. total_estimated_low_usd/high_usd include materials and labor.
- If is_diy_feasible is false, steps should be what to do to stay safe until the pro arrives.

EMERGENCY TRIAGE — this matters as much as the reply:
- Set "emergency" to an object with is_emergency true ONLY when there is a genuine immediate danger to life or property: gas smell or a suspected gas leak, a burst pipe flooding the home, water near live electrics, exposed live wiring, sparks, burning smells at a panel, structural collapse risk, or fire risk.
- When it is an emergency: "reason" names the danger in one short sentence; "actions" gives 3-4 immediate safety steps in order (e.g. shut off the supply, do not touch switches, evacuate); "hotline" is "112".
- For every ordinary repair (a slow drip, a stiff door, a cracked tile) set "emergency" to null. Do not cry emergency to be helpful — a false alarm costs trust.
- On an emergency, "reply" must begin by telling them to make it safe first, and the diagnosis should still describe the repair.

Conversation:
${transcript}

Respond to the latest Customer message.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      file_urls: photo ? [photo] : undefined,
      response_json_schema: {
        type: 'object',
        properties: {
          reply: { type: 'string' },
          emergency: {
            type: ['object', 'null'],
            properties: {
              is_emergency: { type: 'boolean' },
              reason: { type: 'string' },
              actions: { type: 'array', items: { type: 'string' } },
              hotline: { type: 'string' },
            },
            required: ['is_emergency'],
          },
          diagnosis: {
            type: ['object', 'null'],
            properties: {
              trade_category: { type: 'string' },
              issue_title: { type: 'string' },
              description: { type: 'string' },
              severity: { type: 'string' },
              is_diy_feasible: { type: 'boolean' },
              steps: { type: 'array', items: { type: 'string' } },
              safety_warning: { type: 'string' },
              materials: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: { item: { type: 'string' }, estimated_cost_usd: { type: 'number' } },
                },
              },
              labor_hours_estimated: { type: 'number' },
              labor_rate_per_hour_usd: { type: 'number' },
              total_estimated_low_usd: { type: 'number' },
              total_estimated_high_usd: { type: 'number' },
            },
          },
        },
        required: ['reply'],
      },
    });

    return Response.json({
      reply: result.reply,
      diagnosis: result.diagnosis || null,
      emergency: result.emergency?.is_emergency ? result.emergency : null,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}