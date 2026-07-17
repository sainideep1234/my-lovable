import { promisify } from 'util';
import { exec as execCallback } from 'child_process';

const exec = promisify(execCallback);

async function runBashTool(comand: string) {
  try {
    const { stderr, stdout } = await exec(comand);
    if (stderr) {
      console.log(stderr);
      return JSON.stringify(stderr);
    }
    console.log(stdout);
    return JSON.stringify(stdout);
  } catch (error) {
    console.log(error);
    return JSON.stringify(`ERROR :- ${error}`);
  }
}

export const toolCall = {
  bash_tool: runBashTool,
};
