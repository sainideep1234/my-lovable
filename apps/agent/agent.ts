import { GoogleGenAI } from '@google/genai';
import { SYSTEM_PROMPT } from './sytemPrompt';
import { allTools } from './tools/toolSchema';
import { toolCall } from './tools/toolDefintion';
import { randomUUIDv7 } from 'bun';

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
  console.log('▸ start', query);
  while (1) {
    const stream = await ai.interactions.create({
      model: 'gemini-3.5-flash',
      input: messgeHistory,
      stream: true,
      tools: allTools,
      system_instruction: SYSTEM_PROMPT,
    });
    let flagToStop = false;
    for await (const event of stream) {
      if (event.event_type === 'step.start' && event.step.type === 'function_call') {
        const name = event.step.name as keyof typeof toolCall;
        toolToRun.push({ name, id: event.step.id });
      }
      if (event.event_type === 'step.delta' && event.delta.type === 'arguments_delta') {
        const toolDetail = toolToRun.pop();
        if (!event.delta.arguments) {
          continue;
        }
        const parseArg = JSON.parse(event.delta.arguments);
        console.log(`\n⚙ ${toolDetail.name}  ${parseArg.comand ?? JSON.stringify(parseArg)}`); res.write(`data: ${JSON.stringify({ type: 'tool_call', name: toolDetail.name, args: parseArg })}\n\n`);
        const toolResult = await runAppropriateTool(parseArg, toolDetail, res);

        const toolResponse = {
          call_id: toolDetail.id,
          is_error: toolResult.includes('ERROR') ? true : false,
          name: toolDetail.name,
          result: toolResult,
          type: 'function_result',
        };
        messgeHistory.push(toolResponse);
        console.log(`✓ result\n${toolResult || '(empty)'}`); res.write(`data: ${JSON.stringify({ type: 'tool_result', name: toolDetail.name, toolResult })}\n\n`);
      }
      if (event.event_type === 'step.delta' && event.delta.type === 'text') {
        console.log('▸ text', event.delta.text); res.write(`data: ${JSON.stringify({ type: 'text', text: event.delta.text })}\n\n`);
      }
      if (event.event_type === 'interaction.completed') {
        // TODO : write logic of compaction and summarization as got details about it here

        if (event.interaction.status === 'requires_action') {
          console.log('▸ running'); res.write(`data: ${JSON.stringify({ type: 'running' })}\n\n`);
          continue;
        }
        // completed | failed | cancelled | incomplete
        console.log('▸ done', event.interaction.status);
        flagToStop = true;
        res.end();
        break;
      }
    }
    if (flagToStop) break;
  }
}

async function runAppropriateTool(args: any, toolDetail: any, res?: any) {
  let toolResult = '';
  if (toolDetail.name == 'bash_tool') {
    toolResult = (await toolCall.bash_tool(args.comand)) as string;
  } else if (toolDetail.name === 'question_tool') {
    const correlationId = randomUUIDv7();
    const { question, options } = args;
    console.log('▸ question', question, options);
    res.write(
      `data: ${JSON.stringify({ type: 'question', questionId: correlationId, question, options })}\n\n`,
    );
    const answer = (await toolCall.question_tool(correlationId)) as string;
    console.log('▸ answer received', answer);
    toolResult = String(answer ?? '');
  }

  return toolResult;
}
