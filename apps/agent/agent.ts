import { GoogleGenAI } from '@google/genai';
import { SYSTEM_PROMPT } from './sytemPrompt';
import { allTools } from './tools/toolSchema';
import { toolCall } from './tools/toolDefintion';

const ai = new GoogleGenAI({});

export async function runAgent(query: string, res?: any) {
  let toolToRun: any[] = [];
  const messgeHistory: any[] = [];
  const userQuery = {
    type: 'user_input',
    content: [
      {
        text: query,
        type: 'text',
      },
    ],
  };
  messgeHistory.push(userQuery);
  while (1) {
    const stream = await ai.interactions.create({
      model: 'gemini-3.5-flash',
      input: messgeHistory,
      stream: true,
      tools: allTools,
      system_instruction: SYSTEM_PROMPT,
    });
    // let counter = 0;
    let flagToStop = false;
    for await (const event of stream) {
      // console.log('[Respnse', ++counter, ']', event);
      if (event.event_type === 'step.start' && event.step.type === 'function_call') {
        const name = event.step.name as keyof typeof toolCall;
        toolToRun.push({ name, id: event.step.id });
        res.write(`data: ${JSON.stringify({ type: 'tool_call', name })}\n\n`);
      }
      if (event.event_type === 'step.delta' && event.delta.type === 'arguments_delta') {
        const toolDetail = toolToRun.pop();
        if (!event.delta.arguments) {
          continue;
        }
        const parseArg = JSON.parse(event.delta.arguments);
        const { comand } = parseArg;
        const toolResult = await toolCall[toolDetail.name as keyof typeof toolCall](comand);
        const toolResponse = {
          call_id: toolDetail.id,
          is_error: toolResult.includes('ERROR') ? true : false,
          name: toolDetail.name,
          result: toolResult,
          type: 'function_result',
        };
        messgeHistory.push(toolResponse);
        res.write(
          `data: ${JSON.stringify({ type: 'tool_result', name: toolDetail.name, toolResult, comand })}\n\n`,
        );
      }
      if (event.event_type === 'step.delta' && event.delta.type === 'text') {
        console.log('[ASSISTANT]', event.delta.text);
        res.write(`data: ${JSON.stringify({ type: 'text', text: event.delta.text })}\n\n`);
      }
      if (event.event_type === 'interaction.completed') {
        // TODO : write logic of compaction and summarization as got details about it here

        if (event.interaction.status === 'requires_action') {
          res.write(`data: ${JSON.stringify({ type: 'running' })}\n\n`);
          continue;
        }
        // completed | failed | cancelled | incomplete
        flagToStop = true;
        res.end();
        break;
      }
    }
    if (flagToStop) break;
  }
}
