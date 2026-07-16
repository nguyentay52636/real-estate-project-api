import viewingService from '#modules/property/services/viewingService.js';
import { asyncHandler } from '#shared/http/asyncHandler.js';

const viewingsController = {
  getAllViewings: asyncHandler(async (req, res) => {
    const viewings = await viewingService.getAllViewings();
    return res.status(200).json(viewings);
  }),

  getViewingById: asyncHandler(async (req, res) => {
    const viewing = await viewingService.getViewingById(req.params.id);
    return res.status(200).json(viewing);
  }),

  createViewing: asyncHandler(async (req, res) => {
    const created = await viewingService.createViewing(req.body);
    return res.status(201).json({
      message: 'Created view successfully ',
      savedViewing: created,
    });
  }),

  updateViewing: asyncHandler(async (req, res) => {
    const updated = await viewingService.updateViewing(req.params.id, req.body);
    return res.status(200).json(updated);
  }),

  deleteViewing: asyncHandler(async (req, res) => {
    const deleted = await viewingService.deleteViewing(req.params.id);
    return res.status(200).json({
      message: 'Delete viewing successfully',
      viewing: deleted,
    });
  }),
};

export default viewingsController;
