import { Router, Request, Response } from 'express';
import Folder from '../models/Folder';
import RequestModel from '../models/Request';

const router = Router();

// List all folders
router.get('/', async (_req: Request, res: Response) => {
  try {
    const folders = await Folder.find().sort({ createdAt: -1 });
    res.json(folders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch folders' });
  }
});

// Create folder
router.post('/', async (req: Request, res: Response) => {
  try {
    const folder = await Folder.create({ name: req.body.name });
    res.status(201).json(folder);
  } catch (err) {
    res.status(400).json({ error: 'Failed to create folder' });
  }
});

// Update folder
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const updated = await Folder.findByIdAndUpdate(req.params.id, { name: req.body.name }, { new: true });
    if (!updated) return res.status(404).json({ error: 'Folder not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: 'Failed to update folder' });
  }
});

// Delete folder, unset folderId on its requests
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await Folder.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Folder not found' });
    await RequestModel.updateMany({ folderId: req.params.id }, { $unset: { folderId: '' } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete folder' });
  }
});

export default router;
