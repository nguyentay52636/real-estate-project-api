// controllers/messageController.js
import TinNhan from '#models/Message.js';
import PhongChat from '#models/ChatRoom.js';
import ThongBao from '#models/Notification.js';

function getAuthUserId(req, res) {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: 'Bạn chưa đăng nhập' });
    return null;
  }
  return userId;
}

const checkRoomAccess = async (roomId, userId) => {
  const room = await PhongChat.findById(roomId);
  if (!room) {
    throw new Error('Không tìm thấy phòng chat');
  }
  const member = room.thanhVien.find(m => m.nguoiDung.toString() === userId.toString());
  if (!member || member.trangThai !== 'active') {
    throw new Error('Người dùng không thuộc phòng chat');
  }
  return member;
};

const getMessages = async (req, res) => {
  const { roomId } = req.params;
  const userId = getAuthUserId(req, res);
  if (!userId) return;

  try {
    await checkRoomAccess(roomId, userId);

    const messages = await TinNhan.find({ roomId })
      .populate('nguoiGuiId')
      .populate('roomId')
      .populate('phanHoiTinNhan.nguoiGuiId')
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    if (error.message === 'Không tìm thấy phòng chat') {
      return res.status(404).json({ message: error.message });
    }
    if (error.message === 'Người dùng không thuộc phòng chat') {
      return res.status(403).json({ message: error.message });
    }
    res.status(500).json({ message: 'Lỗi lấy tin nhắn', error: error.message });
  }
};

const createMessageHandler = async (req, res) => {
  try {
    const { roomId, noiDung, tapTin, phanHoiTinNhan, loaiTinNhan } = req.body;
    const nguoiGuiId = getAuthUserId(req, res);
    if (!nguoiGuiId) return;

    if (!roomId || !nguoiGuiId || (!noiDung && !tapTin && loaiTinNhan !== 'system')) {
      return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
    }

    const room = await PhongChat.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Không tìm thấy phòng chat' });
    }

    await checkRoomAccess(roomId, nguoiGuiId);

    const validTypes = ['text', 'image', 'cuoc_goi', 'system'];
    if (loaiTinNhan && !validTypes.includes(loaiTinNhan)) {
      return res.status(400).json({ message: 'Loại tin nhắn không hợp lệ: ' + validTypes.join(', ') });
    }

    let phanHoiData = null;
    if (phanHoiTinNhan) {
      const replyMessage = await TinNhan.findById(phanHoiTinNhan);
      if (!replyMessage) {
        return res.status(400).json({ message: 'Tin nhắn trả lời không hợp lệ' });
      }
      phanHoiData = {
        _id: replyMessage._id,
        noiDung: replyMessage.noiDung,
        nguoiGuiId: replyMessage.nguoiGuiId,
      };
    }

    const messageData = {
      roomId,
      nguoiGuiId,
      noiDung: noiDung || '',
      tapTin: tapTin || [],
      phanHoiTinNhan: phanHoiData,
      loaiTinNhan: loaiTinNhan || 'text',
      daDoc: [nguoiGuiId], // Người gửi tự động đánh dấu đã đọc
      trangThai: 'sent',
    };

    const newMessage = await TinNhan.create(messageData);
    await PhongChat.findByIdAndUpdate(roomId, {
      $push: { tinNhan: newMessage._id },
      tinNhanCuoi: newMessage._id,
    });

    // Tạo thông báo cho các thành viên khác
    const otherMembers = room.thanhVien.filter(m => m.nguoiDung.toString() !== nguoiGuiId && m.trangThai === 'active');
    for (const member of otherMembers) {
      await ThongBao.create({
        nguoiNhan: member.nguoiDung,
        loai: 'new_message',
        noiDung: `Tin nhắn mới trong phòng ${room.tenPhong || 'chat riêng'}`,
        roomId,
        tinNhanId: newMessage._id,
      });
    }

    const populatedMessage = await TinNhan.findById(newMessage._id)
      .populate('nguoiGuiId', 'hoTen avatar')
      .populate('roomId', 'tenPhong loaiPhong')
      .populate('phanHoiTinNhan.nguoiGuiId', 'hoTen');

    res.status(201).json(populatedMessage);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tạo tin nhắn', error: error.message });
  }
};

const createCallMessage = async (req, res) => {
  try {
    const { roomId, loai, trangThai, thoiLuong, thanhVien } = req.body;
    const nguoiGuiId = getAuthUserId(req, res);
    if (!nguoiGuiId) return;

    if (!roomId || !loai) {
      return res.status(400).json({ message: 'Thiếu thông tin bắt buộc (roomId, loai)' });
    }

    const room = await PhongChat.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Không tìm thấy phòng chat' });
    }

    await checkRoomAccess(roomId, nguoiGuiId);

    const validCallTypes = ['audio', 'video'];
    if (!validCallTypes.includes(loai)) {
      return res.status(400).json({ message: 'Loại cuộc gọi không hợp lệ: ' + validCallTypes.join(', ') });
    }

    const validCallStatuses = ['missed', 'ended', 'declined', 'ongoing'];
    if (trangThai && !validCallStatuses.includes(trangThai)) {
      return res.status(400).json({ message: 'Trạng thái cuộc gọi không hợp lệ: ' + validCallStatuses.join(', ') });
    }

    const messageData = {
      roomId,
      nguoiGuiId,
      noiDung: `Cuộc gọi ${loai} đã ${trangThai || 'kết thúc'}`,
      loaiTinNhan: 'cuoc_goi',
      cuocGoi: {
        loai,
        trangThai: trangThai || 'ended',
        thoiLuong: thoiLuong || 0,
        thanhVien: thanhVien || [],
      },
      daDoc: [nguoiGuiId],
      trangThai: 'sent',
    };

    const newMessage = await TinNhan.create(messageData);
    await PhongChat.findByIdAndUpdate(roomId, {
      $push: { tinNhan: newMessage._id },
      tinNhanCuoi: newMessage._id,
    });

    const populatedMessage = await TinNhan.findById(newMessage._id)
      .populate('nguoiGuiId', 'hoTen avatar')
      .populate('roomId', 'tenPhong loaiPhong');

    res.status(201).json(populatedMessage);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tạo tin nhắn cuộc gọi', error: error.message });
  }
};

const updateMessageHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { noiDungMoi, tapTin } = req.body;
    const userId = getAuthUserId(req, res);
    if (!userId) return;

    const message = await TinNhan.findById(id);
    if (!message) {
      return res.status(404).json({ message: 'Không tìm thấy tin nhắn' });
    }

    if (message.nguoiGuiId.toString() !== userId) {
      return res.status(403).json({ message: 'Không có quyền chỉnh sửa tin nhắn' });
    }

    const updateData = { trangThai: 'edited' };
    if (noiDungMoi) updateData.noiDung = noiDungMoi;
    if (tapTin) updateData.tapTin = tapTin;

    const updated = await TinNhan.findByIdAndUpdate(id, updateData, { new: true })
      .populate('nguoiGuiId', 'hoTen avatar')
      .populate('roomId', 'tenPhong loaiPhong')
      .populate('phanHoiTinNhan.nguoiGuiId', 'hoTen');

    res.json(updated);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'ID tin nhắn không hợp lệ' });
    }
    res.status(500).json({ message: 'Lỗi cập nhật tin nhắn', error: error.message });
  }
};

const deleteMessageHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getAuthUserId(req, res);
    if (!userId) return;

    const message = await TinNhan.findById(id);
    if (!message) {
      return res.status(404).json({ message: 'Không tìm thấy tin nhắn' });
    }

    if (message.nguoiGuiId.toString() !== userId) {
      return res.status(403).json({ message: 'Không có quyền xóa tin nhắn' });
    }

    const deleted = await TinNhan.findByIdAndUpdate(
      id,
      { noiDung: '[deleted]', trangThai: 'deleted' },
      { new: true }
    )
      .populate('nguoiGuiId', 'hoTen avatar')
      .populate('roomId', 'tenPhong loaiPhong');

    res.json(deleted);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'ID tin nhắn không hợp lệ' });
    }
    res.status(500).json({ message: 'Lỗi xóa tin nhắn', error: error.message });
  }
};

const recallMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getAuthUserId(req, res);
    if (!userId) return;

    const message = await TinNhan.findById(id);
    if (!message) {
      return res.status(404).json({ message: 'Không tìm thấy tin nhắn' });
    }

    if (message.nguoiGuiId.toString() !== userId) {
      return res.status(403).json({ message: 'Không có quyền thu hồi tin nhắn' });
    }

    const updated = await TinNhan.findByIdAndUpdate(
      id,
      { noiDung: '[Tin nhắn đã được thu hồi]', trangThai: 'recalled' },
      { new: true }
    )
      .populate('nguoiGuiId', 'hoTen avatar')
      .populate('roomId', 'tenPhong loaiPhong');

    res.json(updated);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'ID tin nhắn không hợp lệ' });
    }
    res.status(500).json({ message: 'Lỗi thu hồi tin nhắn', error: error.message });
  }
};

const markMessageAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getAuthUserId(req, res);
    if (!userId) return;

    const message = await TinNhan.findById(id);
    if (!message) {
      return res.status(404).json({ message: 'Không tìm thấy tin nhắn' });
    }

    if (!message.daDoc.includes(userId)) {
      message.daDoc.push(userId);
      await message.save();
    }

    const updated = await TinNhan.findById(id)
      .populate('nguoiGuiId', 'hoTen avatar')
      .populate('roomId', 'tenPhong loaiPhong');

    res.json(updated);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'ID tin nhắn không hợp lệ' });
    }
    res.status(500).json({ message: 'Lỗi đánh dấu tin nhắn đã đọc', error: error.message });
  }
};

const searchMessages = async (req, res) => {
  const { roomId, keyword, startDate, endDate } = req.query;
  const userId = getAuthUserId(req, res);
  if (!userId) return;

  try {
    await checkRoomAccess(roomId, userId);

    const query = { roomId };
    if (keyword) {
      query.noiDung = { $regex: keyword, $options: 'i' };
    }
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const messages = await TinNhan.find(query)
      .populate('nguoiGuiId', 'hoTen avatar')
      .populate('roomId', 'tenPhong loaiPhong')
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tìm kiếm tin nhắn', error: error.message });
  }
};

const pinMessage = async (req, res) => {
  const { roomId, messageId } = req.params;
  const userId = getAuthUserId(req, res);
  if (!userId) return;

  try {
    const room = await PhongChat.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Không tìm thấy phòng chat' });
    }

    const member = room.thanhVien.find(m => m.nguoiDung.toString() === userId);
    if (!member || member.vaiTro !== 'admin') {
      return res.status(403).json({ message: 'Chỉ admin mới có thể ghim tin nhắn' });
    }

    if (!room.tinNhanGhim.includes(messageId)) {
      room.tinNhanGhim.push(messageId);
      await room.save();
    }

    res.status(200).json({ message: 'Ghim tin nhắn thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi ghim tin nhắn', error: error.message });
  }
};

const unpinMessage = async (req, res) => {
  const { roomId, messageId } = req.params;
  const userId = getAuthUserId(req, res);
  if (!userId) return;

  try {
    const room = await PhongChat.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Không tìm thấy phòng chat' });
    }

    const member = room.thanhVien.find(m => m.nguoiDung.toString() === userId);
    if (!member || member.vaiTro !== 'admin') {
      return res.status(403).json({ message: 'Chỉ admin mới có thể gỡ ghim tin nhắn' });
    }

    room.tinNhanGhim = room.tinNhanGhim.filter(id => id.toString() !== messageId);
    await room.save();

    res.status(200).json({ message: 'Gỡ ghim tin nhắn thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi gỡ ghim tin nhắn', error: error.message });
  }
};

// Helper functions for Socket.IO
const createMessage = async (data, io) => {
  const newMsg = await TinNhan.create({
    ...data,
    daDoc: data.daDoc || [data.nguoiGuiId],
    trangThai: data.trangThai || 'sent',
  });
  await PhongChat.findByIdAndUpdate(data.roomId, {
    $push: { tinNhan: newMsg._id },
    tinNhanCuoi: newMsg._id,
  });

  const populatedMsg = await TinNhan.findById(newMsg._id)
    .populate('nguoiGuiId', 'hoTen avatar')
    .populate('roomId', 'tenPhong loaiPhong');

  if (io) {
    io.to(String(data.roomId)).emit('newMessage', populatedMsg);
  }
  return newMsg;
};

const updateMessage = async (id, noiDungMoi, userId, io) => {
  const message = await TinNhan.findById(id);
  if (!message) throw new Error('Không tìm thấy tin nhắn');
  if (message.nguoiGuiId.toString() !== userId) throw new Error('Không có quyền chỉnh sửa');

  const updated = await TinNhan.findByIdAndUpdate(
    id,
    { noiDung: noiDungMoi, trangThai: 'edited' },
    { new: true }
  )
    .populate('nguoiGuiId', 'hoTen avatar')
    .populate('roomId', 'tenPhong loaiPhong');

  if (io) {
    io.to(String(updated.roomId)).emit('updatedMessage', updated);
  }
  return updated;
};

const deleteMessage = async (id, userId, io) => {
  const message = await TinNhan.findById(id);
  if (!message) throw new Error('Không tìm thấy tin nhắn');
  if (message.nguoiGuiId.toString() !== userId) throw new Error('Không có quyền xóa');

  const deleted = await TinNhan.findByIdAndUpdate(
    id,
    { noiDung: '[deleted]', trangThai: 'deleted' },
    { new: true }
  )
    .populate('nguoiGuiId', 'hoTen avatar')
    .populate('roomId', 'tenPhong loaiPhong');

  if (io) {
    io.to(String(deleted.roomId)).emit('deletedMessage', deleted);
  }
  return deleted;
};

const recallMessageSocket = async (id, userId, io) => {
  const message = await TinNhan.findById(id);
  if (!message) throw new Error('Không tìm thấy tin nhắn');
  if (message.nguoiGuiId.toString() !== userId) throw new Error('Không có quyền thu hồi');

  const updated = await TinNhan.findByIdAndUpdate(
    id,
    { noiDung: '[Tin nhắn đã được thu hồi]', trangThai: 'recalled' },
    { new: true }
  )
    .populate('nguoiGuiId', 'hoTen avatar')
    .populate('roomId', 'tenPhong loaiPhong');

  if (io) {
    io.to(String(updated.roomId)).emit('recalledMessage', updated);
  }
  return updated;
};

export { getMessages, createMessageHandler, createCallMessage, updateMessageHandler, deleteMessageHandler, recallMessage, markMessageAsRead, searchMessages, pinMessage, unpinMessage, createMessage, updateMessage, deleteMessage, recallMessageSocket };
export default { getMessages, createMessageHandler, createCallMessage, updateMessageHandler, deleteMessageHandler, recallMessage, markMessageAsRead, searchMessages, pinMessage, unpinMessage, createMessage, updateMessage, deleteMessage, recallMessageSocket };