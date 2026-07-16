import PhongChat from '#models/ChatRoom.js';
import TinNhan from '#models/Message.js';
import { createNotification } from './notificationChatController.js';

const getAllRom = async (req, res) => {
  try {
    const rooms = await PhongChat.find()
      .populate('thanhVien.nguoiDung')
      .populate({
        path: 'nguoiTao',
        select: 'ten anhDaiDien email tenDangNhap'
      })
      .populate({
        path: 'tinNhanCuoi',
        select: 'noiDung createdAt loaiTinNhan nguoiGuiId',
        populate: {
          path: 'nguoiGuiId',
          select: 'ten anhDaiDien'
        }
      });
    res.status(200).json(rooms);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi lấy danh sách phòng chat', error: error.message });
  }
};

// Lấy danh sách phòng chat của người dùng
const getRoomsOfUser = async (req, res) => {
  const { userId } = req.params;

  try {
    const rooms = await PhongChat.find({ 'thanhVien.nguoiDung': userId, 'thanhVien.trangThai': 'active' })
      .populate({
        path: 'thanhVien.nguoiDung',
        select: 'ten anhDaiDien email tenDangNhap'
      })
      .populate({
        path: 'nguoiTao',
        select: 'ten anhDaiDien email tenDangNhap'
      })
      .populate({
        path: 'tinNhanCuoi',
        select: 'noiDung createdAt loaiTinNhan nguoiGuiId',
        populate: {
          path: 'nguoiGuiId',
          select: 'ten anhDaiDien'
        }
      })
      .sort({ updatedAt: -1 });

    res.status(200).json(rooms);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi lấy danh sách phòng chat', error: error.message });
  }
};

// Lấy thông tin chi tiết phòng chat
const getRoomById = async (req, res) => {
  const { roomId } = req.params;

  try {
    const room = await PhongChat.findById(roomId)
      .populate({
        path: 'thanhVien.nguoiDung',
        select: 'ten anhDaiDien email tenDangNhap'
      })
      .populate({
        path: 'nguoiTao',
        select: 'ten anhDaiDien email tenDangNhap'
      })
      .populate({
        path: 'tinNhan',
        populate: { 
          path: 'nguoiGuiId', 
          select: 'ten anhDaiDien' 
        },
        options: { sort: { createdAt: 1 } },
      });

    if (!room) {
      return res.status(404).json({ message: 'Không tìm thấy phòng chat' });
    }

    res.status(200).json(room);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi lấy thông tin phòng chat', error: error.message });
  }
};

// Tạo phòng chat mới
const createRoom = async (req, res) => {
  const { tenPhong, loaiPhong, thanhVien, nguoiTao, anhDaiDien } = req.body;
  if (!loaiPhong || !thanhVien?.length || !nguoiTao) {
    return res.status(400).json({ message: 'Thiếu thông tin phòng chat' });
  }

  try {
    const newRoom = await PhongChat.create({
      tenPhong,
      loaiPhong,
      thanhVien,
      nguoiTao,
      anhDaiDien: anhDaiDien || '',
      tinNhan: [],
    });

    const systemMessage = await TinNhan.create({
      roomId: newRoom._id,
      nguoiGuiId: nguoiTao,
      noiDung: `Phòng chat ${loaiPhong === 'group' ? tenPhong : 'riêng'} đã được tạo`,
      loaiTinNhan: 'system',
      daDoc: [nguoiTao],
      trangThai: 'sent',
    });

    await PhongChat.findByIdAndUpdate(newRoom._id, {
      $push: { tinNhan: systemMessage._id },
      tinNhanCuoi: systemMessage._id,
    });

    const otherMembers = thanhVien.filter(m => m.nguoiDung.toString() !== nguoiTao);
    for (const member of otherMembers) {
      if (req.io) {
        await createNotification({
          nguoiNhan: member.nguoiDung,
          loai: 'room_update',
          noiDung: `Bạn đã được thêm vào phòng ${tenPhong || 'chat riêng'}`,
          roomId: newRoom._id,
        }, req.io);
      }
    }

    const populatedRoom = await PhongChat.findById(newRoom._id)
      .populate({
        path: 'thanhVien.nguoiDung',
        select: 'ten anhDaiDien email tenDangNhap'
      })
      .populate({
        path: 'nguoiTao',
        select: 'ten anhDaiDien email tenDangNhap'
      })
      .populate({
        path: 'tinNhanCuoi',
        select: 'noiDung createdAt loaiTinNhan nguoiGuiId',
        populate: {
          path: 'nguoiGuiId',
          select: 'ten anhDaiDien'
        }
      });

    if (req.io) {
      req.io.to(newRoom._id.toString()).emit('roomCreated', populatedRoom);
    }
    res.status(201).json(populatedRoom);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tạo phòng', error: error.message });
  }
};

// Tìm hoặc tạo phòng chat riêng tư
const findOrCreatePrivateRoom = async (req, res) => {
  const { userId1, userId2 } = req.body;

  if (!userId1 || !userId2) {
    return res.status(400).json({ message: 'Thiếu thông tin userId1 hoặc userId2' });
  }

  if (userId1 === userId2) {
    return res.status(400).json({ message: 'Không thể tạo phòng chat với chính mình' });
  }

  try {
    const existingRoom = await PhongChat.findOne({
      loaiPhong: 'private',
      'thanhVien.nguoiDung': { $all: [userId1, userId2] },
      'thanhVien.trangThai': 'active',
      $where: 'this.thanhVien.length == 2',
    })
      .populate({
        path: 'thanhVien.nguoiDung',
        select: 'ten anhDaiDien email tenDangNhap'
      })
      .populate({
        path: 'nguoiTao',
        select: 'ten anhDaiDien email tenDangNhap'
      })
      .populate({
        path: 'tinNhan',
        populate: { 
          path: 'nguoiGuiId', 
          select: 'ten anhDaiDien' 
        },
        options: { sort: { createdAt: 1 } },
      });

    if (existingRoom) {
      return res.status(200).json({
        room: existingRoom,
        isNewRoom: false,
        message: 'Phòng chat đã tồn tại',
      });
    }

    const newRoom = await PhongChat.create({
      tenPhong: `Chat ${userId1} - ${userId2}`,
      loaiPhong: 'private',
      thanhVien: [
        { nguoiDung: userId1, vaiTro: 'member' },
        { nguoiDung: userId2, vaiTro: 'member' },
      ],
      nguoiTao: userId1,
      anhDaiDien: '',
      tinNhan: [],
    });

    const systemMessage = await TinNhan.create({
      roomId: newRoom._id,
      nguoiGuiId: userId1,
      noiDung: 'Phòng chat riêng đã được tạo',
      loaiTinNhan: 'system',
      daDoc: [userId1],
      trangThai: 'sent',
    });

    await PhongChat.findByIdAndUpdate(newRoom._id, {
      $push: { tinNhan: systemMessage._id },
      tinNhanCuoi: systemMessage._id,
    });

    if (req.io) {
      await createNotification({
        nguoiNhan: userId2,
        loai: 'room_update',
        noiDung: `Bạn đã được thêm vào phòng chat riêng với ${userId1}`,
        roomId: newRoom._id,
      }, req.io);
    }

    const populatedRoom = await PhongChat.findById(newRoom._id)
      .populate({
        path: 'thanhVien.nguoiDung',
        select: 'ten anhDaiDien email tenDangNhap'
      })
      .populate({
        path: 'nguoiTao',
        select: 'ten anhDaiDien email tenDangNhap'
      })
      .populate({
        path: 'tinNhanCuoi',
        select: 'noiDung createdAt loaiTinNhan nguoiGuiId',
        populate: {
          path: 'nguoiGuiId',
          select: 'ten anhDaiDien'
        }
      });

    if (req.io) {
      req.io.to(newRoom._id.toString()).emit('roomCreated', populatedRoom);
    }
    res.status(201).json({
      room: populatedRoom,
      isNewRoom: true,
      message: 'Tạo phòng chat mới thành công',
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tìm/tạo phòng chat private', error: error.message });
  }
};

// Thêm tin nhắn vào phòng chat
const addMessageToRoom = async (req, res) => {
  const { roomId } = req.params;
  const { messageId, userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: 'Thiếu thông tin userId' });
  }

  try {
    const room = await PhongChat.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Không tìm thấy phòng chat' });
    }

    const message = await TinNhan.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Không tìm thấy tin nhắn' });
    }

    if (!room.tinNhan.includes(messageId)) {
      room.tinNhan.push(messageId);
      room.tinNhanCuoi = messageId;
      await room.save();

      const otherMembers = room.thanhVien.filter(m => m.nguoiDung.toString() !== userId && m.trangThai === 'active');
      for (const member of otherMembers) {
        if (req.io) {
          await createNotification({
            nguoiNhan: member.nguoiDung,
            loai: 'new_message',
            noiDung: ``,
            roomId,
            tinNhanId: messageId,
          }, req.io);
        }
      }

      if (req.io) {
        req.io.to(roomId).emit('messageAdded', { roomId, messageId });
      }
    }

    res.status(200).json({ message: 'Thêm tin nhắn vào phòng thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi thêm tin nhắn vào phòng', error: error.message });
  }
};

// Xóa tin nhắn khỏi phòng chat
const removeMessageFromRoom = async (req, res) => {
  const { roomId, messageId } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: 'Thiếu thông tin userId' });
  }

  try {
    const room = await PhongChat.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Không tìm thấy phòng chat' });
    }

    const member = room.thanhVien.find(m => m.nguoiDung.toString() === userId.toString());
    if (!member || member.trangThai !== 'active') {
      return res.status(403).json({ message: 'Người dùng không thuộc phòng chat' });
    }

    if (member.vaiTro !== 'admin') {
      return res.status(403).json({ message: 'Chỉ admin mới có thể xóa tin nhắn khỏi phòng' });
    }

    room.tinNhan = room.tinNhan.filter(id => id.toString() !== messageId);
    if (room.tinNhanCuoi && room.tinNhanCuoi.toString() === messageId) {
      room.tinNhanCuoi = room.tinNhan.length > 0 ? room.tinNhan[room.tinNhan.length - 1] : null;
    }
    await room.save();

    if (req.io) {
      req.io.to(roomId).emit('messageRemoved', { roomId, messageId });
    }
    res.status(200).json({ message: 'Xóa tin nhắn khỏi phòng thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi xóa tin nhắn khỏi phòng', error: error.message });
  }
};

// Cập nhật thông tin phòng chat
const updateRoom = async (req, res) => {
  const { roomId } = req.params;
  const { tenPhong, anhDaiDien, thanhVien, userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: 'Thiếu thông tin userId' });
  }

  try {
    const room = await PhongChat.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Không tìm thấy phòng chat' });
    }

    const member = room.thanhVien.find(m => m.nguoiDung.toString() === userId.toString());
    if (!member || member.trangThai !== 'active') {
      return res.status(403).json({ message: 'Người dùng không thuộc phòng chat' });
    }

    if (member.vaiTro !== 'admin') {
      return res.status(403).json({ message: 'Chỉ admin mới có thể cập nhật phòng chat' });
    }

    const updateData = {};
    if (tenPhong) updateData.tenPhong = tenPhong;
    if (anhDaiDien) updateData.anhDaiDien = anhDaiDien;
    if (thanhVien) updateData.thanhVien = thanhVien;

    const updatedRoom = await PhongChat.findByIdAndUpdate(roomId, updateData, { new: true, runValidators: true })
      .populate({
        path: 'thanhVien.nguoiDung',
        select: 'ten anhDaiDien email tenDangNhap'
      })
      .populate({
        path: 'nguoiTao',
        select: 'ten anhDaiDien email tenDangNhap'
      });

    if (Object.keys(updateData).length > 0) {
      const systemMessage = await TinNhan.create({
        roomId,
        nguoiGuiId: userId,
        noiDung: 'Thông tin phòng chat đã được cập nhật',
        loaiTinNhan: 'system',
        daDoc: [userId],
        trangThai: 'sent',
      });

      await PhongChat.findByIdAndUpdate(roomId, {
        $push: { tinNhan: systemMessage._id },
        tinNhanCuoi: systemMessage._id,
      });

      const otherMembers = updatedRoom.thanhVien.filter(m => m.nguoiDung.toString() !== userId && m.trangThai === 'active');
      for (const member of otherMembers) {
        if (req.io) {
          await createNotification({
            nguoiNhan: member.nguoiDung,
            loai: 'room_update',
            noiDung: `Phòng ${tenPhong || 'chat riêng'} đã được cập nhật`,
            roomId,
          }, req.io);
        }
      }

      if (req.io) {
        req.io.to(roomId).emit('roomUpdated', updatedRoom);
      }
    }

    res.status(200).json(updatedRoom);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi cập nhật phòng chat', error: error.message });
  }
};

// Xóa phòng chat
const deleteRoom = async (req, res) => {
  const { roomId } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: 'Thiếu thông tin userId' });
  }

  try {
    const room = await PhongChat.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Không tìm thấy phòng chat' });
    }

    const member = room.thanhVien.find(m => m.nguoiDung.toString() === userId.toString());
    if (!member || member.trangThai !== 'active') {
      return res.status(403).json({ message: 'Người dùng không thuộc phòng chat' });
    }

    if (member.vaiTro !== 'admin') {
      return res.status(403).json({ message: 'Chỉ admin mới có thể xóa phòng chat' });
    }

    await TinNhan.deleteMany({ roomId });
    await PhongChat.findByIdAndDelete(roomId);

    const otherMembers = room.thanhVien.filter(m => m.nguoiDung.toString() !== userId && m.trangThai === 'active');
    for (const member of otherMembers) {
      if (req.io) {
        await createNotification({
          nguoiNhan: member.nguoiDung,
          loai: 'room_update',
          noiDung: `Phòng ${room.tenPhong || 'chat riêng'} đã bị xóa`,
          roomId,
        }, req.io);
      }
    }

    if (req.io) {
      req.io.to(roomId).emit('roomDeleted', { roomId });
    }
    res.status(200).json({ message: 'Xóa phòng thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi xóa phòng', error: error.message });
  }
};

// Tìm kiếm phòng chat
const searchRooms = async (req, res) => {
  const { keyword, userId } = req.query;

  if (!userId) {
    return res.status(400).json({ message: 'Thiếu thông tin userId' });
  }

  try {
    const query = { 'thanhVien.nguoiDung': userId, 'thanhVien.trangThai': 'active' };
    if (keyword) {
      query.tenPhong = { $regex: keyword, $options: 'i' };
    }

    const rooms = await PhongChat.find(query)
      .populate({
        path: 'thanhVien.nguoiDung',
        select: 'ten anhDaiDien email tenDangNhap'
      })
      .populate({
        path: 'nguoiTao',
        select: 'ten anhDaiDien email tenDangNhap'
      })
      .populate({
        path: 'tinNhanCuoi',
        select: 'noiDung createdAt loaiTinNhan nguoiGuiId',
        populate: {
          path: 'nguoiGuiId',
          select: 'ten anhDaiDien'
        }
      })
      .sort({ updatedAt: -1 });

    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tìm kiếm phòng chat', error: error.message });
  }
};

// Thêm thành viên vào phòng chat nhóm
const addMemberToRoom = async (req, res) => {
  const { roomId } = req.params;
  const { userId: newMemberId, adminUserId } = req.body;

  if (!adminUserId) {
    return res.status(400).json({ message: 'Thiếu thông tin adminUserId' });
  }

  try {
    const room = await PhongChat.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Không tìm thấy phòng chat' });
    }

    const member = room.thanhVien.find(m => m.nguoiDung.toString() === adminUserId.toString());
    if (!member || member.trangThai !== 'active') {
      return res.status(403).json({ message: 'Người dùng không thuộc phòng chat' });
    }

    if (room.loaiPhong !== 'group') {
      return res.status(400).json({ message: 'Chỉ có thể thêm thành viên vào phòng nhóm' });
    }
    if (member.vaiTro !== 'admin') {
      return res.status(403).json({ message: 'Chỉ admin mới có thể thêm thành viên' });
    }

    const existingMember = room.thanhVien.find(m => m.nguoiDung.toString() === newMemberId);
    if (existingMember && existingMember.trangThai === 'active') {
      return res.status(400).json({ message: 'Người dùng đã là thành viên của phòng' });
    }
    if (existingMember && existingMember.trangThai === 'left') {
      existingMember.trangThai = 'active';
    } else {
      room.thanhVien.push({ nguoiDung: newMemberId, vaiTro: 'member', trangThai: 'active' });
    }

    await room.save();

    const systemMessage = await TinNhan.create({
      roomId,
      nguoiGuiId: adminUserId,
      noiDung: `Người dùng ${newMemberId} đã được thêm vào phòng`,
      loaiTinNhan: 'system',
      daDoc: [adminUserId],
      trangThai: 'sent',
    });

    await PhongChat.findByIdAndUpdate(roomId, {
      $push: { tinNhan: systemMessage._id },
      tinNhanCuoi: systemMessage._id,
    });

    if (req.io) {
      await createNotification({
        nguoiNhan: newMemberId,
        loai: 'room_update',
        noiDung: `Bạn đã được thêm vào phòng ${room.tenPhong}`,
        roomId,
      }, req.io);
    }

    const updatedRoom = await PhongChat.findById(roomId)
      .populate({
        path: 'thanhVien.nguoiDung',
        select: 'ten anhDaiDien email tenDangNhap'
      })
      .populate({
        path: 'nguoiTao',
        select: 'ten anhDaiDien email tenDangNhap'
      });

    if (req.io) {
      req.io.to(roomId).emit('memberAdded', { roomId, newMemberId });
    }
    res.status(200).json(updatedRoom);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi thêm thành viên', error: error.message });
  }
};

// Rời phòng chat nhóm
const leaveRoom = async (req, res) => {
  const { roomId } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: 'Thiếu thông tin userId' });
  }

  try {
    const room = await PhongChat.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Không tìm thấy phòng chat' });
    }

    const member = room.thanhVien.find(m => m.nguoiDung.toString() === userId.toString());
    if (!member || member.trangThai !== 'active') {
      return res.status(403).json({ message: 'Người dùng không thuộc phòng chat' });
    }

    if (room.loaiPhong !== 'group') {
      return res.status(400).json({ message: 'Chỉ có thể rời khỏi phòng nhóm' });
    }

    if (member.vaiTro === 'admin') {
      return res.status(403).json({ message: 'Admin không thể rời phòng, hãy chuyển quyền admin trước' });
    }

    member.trangThai = 'left';
    await room.save();

    const systemMessage = await TinNhan.create({
      roomId,
      nguoiGuiId: userId,
      noiDung: `Người dùng ${userId} đã rời phòng`,
      loaiTinNhan: 'system',
      daDoc: [userId],
      trangThai: 'sent',
    });

    await PhongChat.findByIdAndUpdate(roomId, {
      $push: { tinNhan: systemMessage._id },
      tinNhanCuoi: systemMessage._id,
    });

    const otherMembers = room.thanhVien.filter(m => m.nguoiDung.toString() !== userId && m.trangThai === 'active');
    for (const member of otherMembers) {
      if (req.io) {
        await createNotification({
          nguoiNhan: member.nguoiDung,
          loai: 'room_update',
          noiDung: `Người dùng ${userId} đã rời phòng ${room.tenPhong}`,
          roomId,
        }, req.io);
      }
    }

    if (req.io) {
      req.io.to(roomId).emit('memberLeft', { roomId, userId });
    }
    res.status(200).json({ message: 'Rời phòng thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi rời phòng', error: error.message });
  }
};

// Chuyển quyền admin
const transferAdmin = async (req, res) => {
  const { roomId } = req.params;
  const { newAdminId, currentAdminId } = req.body;

  if (!currentAdminId) {
    return res.status(400).json({ message: 'Thiếu thông tin currentAdminId' });
  }

  try {
    const room = await PhongChat.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Không tìm thấy phòng chat' });
    }

    const member = room.thanhVien.find(m => m.nguoiDung.toString() === currentAdminId.toString());
    if (!member || member.trangThai !== 'active') {
      return res.status(403).json({ message: 'Người dùng không thuộc phòng chat' });
    }

    if (room.loaiPhong !== 'group') {
      return res.status(400).json({ message: 'Chỉ có thể chuyển quyền admin trong phòng nhóm' });
    }
    if (member.vaiTro !== 'admin') {
      return res.status(403).json({ message: 'Chỉ admin hiện tại mới có thể chuyển quyền' });
    }

    const newAdmin = room.thanhVien.find(m => m.nguoiDung.toString() === newAdminId && m.trangThai === 'active');
    if (!newAdmin) {
      return res.status(400).json({ message: 'Người dùng không hợp lệ hoặc không phải thành viên active' });
    }

    member.vaiTro = 'member';
    newAdmin.vaiTro = 'admin';
    await room.save();

    const systemMessage = await TinNhan.create({
      roomId,
      nguoiGuiId: currentAdminId,
      noiDung: `Quyền admin đã được chuyển cho người dùng ${newAdminId}`,
      loaiTinNhan: 'system',
      daDoc: [currentAdminId],
      trangThai: 'sent',
    });

    await PhongChat.findByIdAndUpdate(roomId, {
      $push: { tinNhan: systemMessage._id },
      tinNhanCuoi: systemMessage._id,
    });

    const otherMembers = room.thanhVien.filter(m => m.nguoiDung.toString() !== currentAdminId && m.trangThai === 'active');
    for (const member of otherMembers) {
      if (req.io) {
        await createNotification({
          nguoiNhan: member.nguoiDung,
          loai: 'room_update',
          noiDung: `Người dùng ${newAdminId} đã trở thành admin của phòng ${room.tenPhong}`,
          roomId,
        }, req.io);
      }
    }

    const updatedRoom = await PhongChat.findById(roomId)
      .populate({
        path: 'thanhVien.nguoiDung',
        select: 'ten anhDaiDien email tenDangNhap'
      })
      .populate({
        path: 'nguoiTao',
        select: 'ten anhDaiDien email tenDangNhap'
      });

    if (req.io) {
      req.io.to(roomId).emit('adminTransferred', { roomId, newAdminId });
    }
    res.status(200).json(updatedRoom);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi chuyển quyền admin', error: error.message });
  }
};

export { getAllRom, getRoomsOfUser, getRoomById, createRoom, findOrCreatePrivateRoom, addMessageToRoom, removeMessageFromRoom, updateRoom, deleteRoom, searchRooms, addMemberToRoom, leaveRoom, transferAdmin };
export default { getAllRom, getRoomsOfUser, getRoomById, createRoom, findOrCreatePrivateRoom, addMessageToRoom, removeMessageFromRoom, updateRoom, deleteRoom, searchRooms, addMemberToRoom, leaveRoom, transferAdmin };