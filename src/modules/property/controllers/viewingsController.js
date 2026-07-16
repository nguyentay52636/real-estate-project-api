import viewings from '#models/ViewingSchedule.js';
import mongoose from 'mongoose';

const viewingsController = {
  // Lấy tất cả lịch xem nhà
  getAllViewings: async (req, res) => {
    try {
      const viewingsList = await viewings
        .find()
        .populate("nguoiDungId")
        .populate("batDongSanId");
      return res.status(200).json(viewingsList);
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Get all viewings failed", error: error });
    }
  },
  getViewingById: async (req, res) => {
    try {
      const { id } = req.params;
      const viewingDetails = await viewings
        .findById(id)
        .populate("nguoiDungId")
        .populate("batDongSanId");
      if (!viewingDetails)
        return res.status(404).json({ message: "Viewing not found" });
      return res.status(200).json(viewingDetails);
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Get viewing by id failed", error: error });
    }
  },

  // Tạo mới lịch xem nhà
  createViewing: async (req, res) => {
    try {
      const { nguoiDungId, batDongSanId, thoiGian, ghiChu, trangThai } =
        req.body;
      const newViewingData = new viewings({
        nguoiDungId,
        batDongSanId,
        thoiGian,
        ghiChu,
        trangThai,
      });
      const createdViewing = await newViewingData.save();
      return res
        .status(201)
        .json({
          message: "Created view successfully ",
          savedViewing: createdViewing,
        });
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Create viewing failed", error: error });
    }
  },
  // Cập nhật lịch xem nhà
  updateViewing: async (req, res) => {
    try {
      const { id } = req.params;
      const updatedViewingData = await viewings.findByIdAndUpdate(
        id,
        req.body,
        {
          new: true,
        }
      );
      if (!updatedViewingData)
        return res.status(404).json({ message: "Viewing not found" });
      return res.status(200).json(updatedViewingData);
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Update viewing failed", error: error });
    }
  },
  // Xóa lịch xem nhà
  deleteViewing: async (req, res) => {
    try {
      const { id } = req.params;
      const deletedViewingData = await viewings.findByIdAndDelete(id);
      if (!deletedViewingData)
        return res.status(404).json({ message: "Viewing not found" });
      return res.status(200).json({
        message: "Delete viewing successfully",
        viewing: deletedViewingData,
      });
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Delete viewing failed", error: error });
    }
  },
};

export default viewingsController;
