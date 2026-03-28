import { Router, Request, Response } from 'express';
import RequestModel from '../models/Request';
import Snapshot from '../models/Snapshot';

const router = Router();

// List all requests
router.get('/', async (_req: Request, res: Response) => {
  try {
    const requests = await RequestModel.find().sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// Create request
router.post('/', async (req: Request, res: Response) => {
  try {
    const newRequest = await RequestModel.create(req.body);
    res.status(201).json(newRequest);
  } catch (err) {
    res.status(400).json({ error: 'Failed to create request' });
  }
});

// Update request
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const updated = await RequestModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: 'Request not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: 'Failed to update request' });
  }
});

// Delete request + its snapshots
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await RequestModel.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Request not found' });
    await Snapshot.deleteMany({ requestId: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete request' });
  }
});

export default router;
