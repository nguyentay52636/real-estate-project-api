import ViewingModel from '#models/ViewingSchedule.js';
import { AppError } from '#shared/errors/AppError.js';

export function createViewingService(deps = {}) {
  const Viewing = deps.Viewing ?? ViewingModel;

  async function getAllViewings() {
    return Viewing.find().populate('nguoiDungId').populate('batDongSanId');
  }

  async function getViewingById(id) {
    const viewing = await Viewing.findById(id)
      .populate('nguoiDungId')
      .populate('batDongSanId');
    if (!viewing) throw new AppError('Viewing not found', 404);
    return viewing;
  }

  async function createViewing(input) {
    const { nguoiDungId, batDongSanId, thoiGian, ghiChu, trangThai } = input;
    const viewing = new Viewing({ nguoiDungId, batDongSanId, thoiGian, ghiChu, trangThai });
    return viewing.save();
  }

  async function updateViewing(id, input) {
    const updated = await Viewing.findByIdAndUpdate(id, input, { new: true });
    if (!updated) throw new AppError('Viewing not found', 404);
    return updated;
  }

  async function deleteViewing(id) {
    const deleted = await Viewing.findByIdAndDelete(id);
    if (!deleted) throw new AppError('Viewing not found', 404);
    return deleted;
  }

  return { getAllViewings, getViewingById, createViewing, updateViewing, deleteViewing };
}

const viewingService = createViewingService();
export default viewingService;
