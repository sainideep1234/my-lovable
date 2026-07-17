import { listen, randomUUIDv7 } from 'bun';
import express, { type Request, type Response } from 'express';

const app = express();
// create project
app.post('/chat', (req: Request, res: Response) => {
  // check user
  const projectId = randomUUIDv7();
  // save into db
  return res.status(201).json({
    projectId,
    msg: 'project created succesfully',
  });
});

// get previosu chat history
app.get('/chat/:projectId', (req: Request, res: Response) => {
  const { projectId } = req.params;
  if (!projectId) {
    return res.status(400).json({
      msg: 'please provide valid projectId',
    });
  }

  // get all the chats for a particular project id

  // return all chats
});
