import express, { type Request, type Response } from 'express';
import { runAgent } from './agent';

const app = express();
app.use(express.json());

app.post('/chat/:projectId', (req: Request, res: Response) => {
  // AS POD STARTED get all the previosu chats from db
  const { projectId } = req.params;
  const { query } = req.body;
  if (!projectId && !query) {
    return res.status(400).json({
      msg: 'please provide valid projectId and query',
    });
  }

  // send server sent event
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders(); // flush the headers to establish SSE with client
  runAgent(query, res);

  // If client closes connection, stop sending events
  res.on('close', () => {
    console.log('client dropped me');
    // may be write a way to drop the ai agent or no need to do that
    res.end();
  });
});

app.listen(8000);
