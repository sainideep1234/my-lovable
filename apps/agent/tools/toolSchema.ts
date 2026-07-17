const bashTool = {
  type: 'function',
  name: 'bash_tool',
  description: 'Tool to execute bash comand',
  parameters: {
    type: 'object',
    properties: {
      comand: {
        type: 'string',
        description: 'comand to execute in terminal',
      },
    },
    required: ['comand'],
  },
};

export const allTools: any[] = [bashTool];
