import { Router, Request, Response } from 'express';
import Environment from '../models/Environment';

const router = Router();

// List all environments
router.get('/', async (_req: Request, res: Response) => {
  try {
    const environments = await Environment.find().sort({ name: 1 });
    res.json(environments);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch environments' });
  }
});

// Create environment
router.post('/', async (req: Request, res: Response) => {
  try {
    const environment = await Environment.create(req.body);
    res.status(201).json(environment);
  } catch (err) {
    res.status(400).json({ error: 'Failed to create environment' });
  }
});

// Update environment
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const updated = await Environment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: 'Environment not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: 'Failed to update environment' });
  }
});

// Delete environment
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await Environment.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Environment not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete environment' });
  }
});

export default router;
