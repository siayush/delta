import { Router, Request, Response } from 'express';
import Snapshot from '../models/Snapshot';

const router = Router();

// List snapshots for a request
router.get('/', async (req: Request, res: Response) => {
  try {
    const { requestId } = req.query;
    if (!requestId) return res.status(400).json({ error: 'requestId query param required' });
    const snapshots = await Snapshot.find({ requestId: requestId as string }).sort({ timestamp: -1 });
    res.json(snapshots);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch snapshots' });
  }
});

// Save new snapshot
router.post('/', async (req: Request, res: Response) => {
  try {
    const snapshot = await Snapshot.create({
      ...req.body,
      timestamp: Date.now()
    });
    res.status(201).json(snapshot);
  } catch (err: any) {
    console.error('[Snapshots] Create failed:', err.message, err.errors);
    res.status(400).json({ error: 'Failed to save snapshot', detail: err.message });
  }
});

// Delete one snapshot
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await Snapshot.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Snapshot not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete snapshot' });
  }
});

// Toggle baseline — clears previous baseline for the same request, then sets this one
router.put('/:id/baseline', async (req: Request, res: Response) => {
  try {
    const snapshot = await Snapshot.findById(req.params.id);
    if (!snapshot) return res.status(404).json({ error: 'Snapshot not found' });

    // Clear any existing baseline for this request
    await Snapshot.updateMany(
      { requestId: snapshot.requestId, isBaseline: true },
      { isBaseline: false }
    );

    // Set this snapshot as baseline
    snapshot.isBaseline = true;
    await snapshot.save();

    res.json(snapshot);
  } catch (err) {
    res.status(500).json({ error: 'Failed to set baseline' });
  }
});

export default router;
