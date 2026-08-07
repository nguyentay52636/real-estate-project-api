import PhongChat from '#models/ChatRoom.js';
import TinNhan from '#models/Message.js';
import ChatTicket from '#models/ChatTicket.js';
import { createNotification } from './notificationChatController.js';
import {
  ensureAuthContext,
  memberSelect,
  assertCanAccessRoom,
  assertRoomAdmin,
  findActiveMember,
  isActiveMember,
  httpError,
  resolvePrivateChatOtherId,
  resolveBoiCanhForPrivate,
  buildRoomsListFilter,
  assertCanDeleteOrDisbandRoom,
} from '#modules/chat/utils/roomAccess.js';
import { writeAuditLog } from '#shared/services/auditLogService.js';

/** Gắn thêm field `khachHangId` (không thuộc schema PhongChat) lên các phòng có
 * handoffToken — để FE biết đúng ai là "khách" khi phòng có >2 thành viên (sau
 * khi admin "Mở lại" một ticket, phòng trở thành group gồm khách + 2 nhân viên,
 * không thể suy luận đúng khách chỉ từ danh sách thanhVien). */
async function attachKhachHangId(rooms) {
  const tokens = rooms.map((r) => r.handoffToken).filter(Boolean);
  if (!tokens.length) return rooms.map((r) => (r.toObject ? r.toObject() : r));

  const tickets = await ChatTicket.find({ handoffToken: { $in: tokens } }).select('handoffToken khachHangId');
  const map = new Map(tickets.map((t) => [t.handoffToken, t.khachHangId ? t.khachHangId.toString() : null]));

  return rooms.map((r) => {
    const plain = r.toObject ? r.toObject() : r;
    if (plain.handoffToken && map.has(plain.handoffToken)) {
      plain.khachHangId = map.get(plain.handoffToken);
    }
    return plain;
  });
}

function roomPopulate(select) {
  return [
    { path: 'thanhVien.nguoiDung', select },
    { path: 'nguoiTao', select },
    {
      path: 'tinNhanCuoi',
      select: 'noiDung createdAt loaiTinNhan nguoiGuiId',
      populate: {
        path: 'nguoiGuiId',
        select: 'ten anhDaiDien',
      },
    },
  ];
}

const getAllRom = async (req, res) => {
  try {
    const actor = await ensureAuthContext(req);
    const userId = actor.id;
    const select = memberSelect(actor.isStaff);

    // Mặc định chỉ phòng đang là thành viên (kể cả nhóm) — tránh FE hiện phòng rồi 403.
    // Quản trị viên xem toàn hệ thống: ?scope=all. Lọc loại: ?loaiPhong=group|private
    const filter = buildRoomsListFilter(
      userId,
      { isStaff: actor.isStaff, isAdmin: actor.isAdmin },
      { scope: req.query.scope, loaiPhong: req.query.loaiPhong },
    );

    const rooms = await PhongChat.find(filter)
      .populate(roomPopulate(select))
      .sort({ updatedAt: -1 });

    res.status(200).json(await attachKhachHangId(rooms));
  } catch (error) {
    return httpError(res, error, 'Lỗi lấy danh sách phòng chat');
  }
};

// Lấy danh sách phòng chat của người dùng
const getRoomsOfUser = async (req, res) => {
  const { userId: targetUserId } = req.params;
  const { boiCanh } = req.query;

  try {
    const actor = await ensureAuthContext(req);
    const userId = actor.id;

    if (String(targetUserId) !== userId && !actor.isStaff) {
      return res.status(403).json({ message: 'Không có quyền xem phòng chat của người dùng khác' });
    }

    const select = memberSelect(actor.isStaff);
    const query = {
      thanhVien: {
        $elemMatch: { nguoiDung: targetUserId, trangThai: 'active' },
      },
      anDoiVoi: { $ne: targetUserId },
    };
    if (boiCanh) query.boiCanh = boiCanh;
    if (req.query.loaiPhong === 'group' || req.query.loaiPhong === 'private') {
      query.loaiPhong = req.query.loaiPhong;
    }

    const rooms = await PhongChat.find(query)
      .populate(roomPopulate(select))
      .sort({ updatedAt: -1 });

    res.status(200).json(await attachKhachHangId(rooms));
  } catch (error) {
    return httpError(res, error, 'Lỗi lấy danh sách phòng chat');
  }
};

// Lấy thông tin chi tiết phòng chat
const getRoomById = async (req, res) => {
  const { roomId } = req.params;

  try {
    const actor = await ensureAuthContext(req);
    const userId = actor.id;
    const select = memberSelect(actor.isStaff);

    const room = await PhongChat.findById(roomId)
      .populate(roomPopulate(select))
      .lean();

    assertCanAccessRoom(room, userId, actor.isStaff);

    // Không hydrate toàn bộ tinNhan — FE lấy qua GET /api/message/:roomId?limit=
    res.status(200).json({ ...room, tinNhan: undefined });
  } catch (error) {
    return httpError(res, error, 'Lỗi lấy thông tin phòng chat');
  }
};

// Tạo phòng chat mới
const createRoom = async (req, res) => {
  const { tenPhong, loaiPhong, thanhVien, anhDaiDien, boiCanh } = req.body;

  try {
    const actor = await ensureAuthContext(req);
    const userId = actor.id;

    if (!loaiPhong || !thanhVien?.length) {
      return res.status(400).json({ message: 'Thiếu thông tin phòng chat' });
    }

    const members = thanhVien.map((m) => ({ ...m }));
    const hasActor = members.some((m) => String(m.nguoiDung) === userId);
    if (!hasActor) {
      members.push({
        nguoiDung: userId,
        vaiTro: loaiPhong === 'group' ? 'admin' : 'member',
        trangThai: 'active',
      });
    }

    const boiCanhPhong = boiCanh === 'noi_bo' ? 'noi_bo' : 'ho_tro_khach';
    const select = memberSelect(actor.isStaff);

    const newRoom = await PhongChat.create({
      tenPhong,
      loaiPhong,
      thanhVien: members,
      nguoiTao: userId,
      anhDaiDien: anhDaiDien || '',
      boiCanh: boiCanhPhong,
      tinNhan: [],
    });

    const systemMessage = await TinNhan.create({
      roomId: newRoom._id,
      nguoiGuiId: userId,
      noiDung: `Phòng chat ${loaiPhong === 'group' ? tenPhong : 'riêng'} đã được tạo`,
      loaiTinNhan: 'system',
      daDoc: [userId],
      trangThai: 'sent',
    });

    await PhongChat.findByIdAndUpdate(newRoom._id, {
      $push: { tinNhan: systemMessage._id },
      tinNhanCuoi: systemMessage._id,
    });

    const otherMembers = members.filter((m) => String(m.nguoiDung) !== userId);
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
      .populate(roomPopulate(select));

    if (req.io) {
      req.io.to(newRoom._id.toString()).emit('roomCreated', populatedRoom);
    }
    res.status(201).json(populatedRoom);
  } catch (error) {
    return httpError(res, error, 'Lỗi tạo phòng');
  }
};

// Tìm hoặc tạo phòng chat riêng tư
const findOrCreatePrivateRoom = async (req, res) => {
  try {
    const actor = await ensureAuthContext(req);
    const userId = actor.id;
    const otherId = resolvePrivateChatOtherId(userId, req.body);
    const boiCanhPhong = await resolveBoiCanhForPrivate(userId, otherId, req.body.boiCanh);
    const select = memberSelect(actor.isStaff);

    // Không dùng $where — Atlas M0/free tier không cho phép
    const existingRoom = await PhongChat.findOne({
      loaiPhong: 'private',
      boiCanh: boiCanhPhong,
      thanhVien: { $size: 2 },
      $and: [
        { thanhVien: { $elemMatch: { nguoiDung: userId, trangThai: 'active' } } },
        { thanhVien: { $elemMatch: { nguoiDung: otherId, trangThai: 'active' } } },
      ],
    }).populate(roomPopulate(select));

    if (existingRoom) {
      return res.status(200).json({
        room: existingRoom,
        isNewRoom: false,
        message: 'Phòng chat đã tồn tại',
      });
    }

    const newRoom = await PhongChat.create({
      tenPhong: `Chat ${userId} - ${otherId}`,
      loaiPhong: 'private',
      boiCanh: boiCanhPhong,
      thanhVien: [
        { nguoiDung: userId, vaiTro: 'member' },
        { nguoiDung: otherId, vaiTro: 'member' },
      ],
      nguoiTao: userId,
      anhDaiDien: '',
      tinNhan: [],
    });

    const systemMessage = await TinNhan.create({
      roomId: newRoom._id,
      nguoiGuiId: userId,
      noiDung: 'Phòng chat riêng đã được tạo',
      loaiTinNhan: 'system',
      daDoc: [userId],
      trangThai: 'sent',
    });

    await PhongChat.findByIdAndUpdate(newRoom._id, {
      $push: { tinNhan: systemMessage._id },
      tinNhanCuoi: systemMessage._id,
    });

    if (req.io) {
      try {
        await createNotification({
          nguoiNhan: otherId,
          loai: 'room_update',
          noiDung: boiCanhPhong === 'noi_bo'
            ? 'Bạn có cuộc trò chuyện nội bộ mới'
            : 'Bạn có cuộc trò chuyện mới',
          roomId: newRoom._id,
        }, req.io);
      } catch (notifyErr) {
        console.error('findOrCreatePrivateRoom notify:', notifyErr.message);
      }
    }

    const populatedRoom = await PhongChat.findById(newRoom._id)
      .populate(roomPopulate(select));

    if (req.io) {
      req.io.to(newRoom._id.toString()).emit('roomCreated', populatedRoom);
      // Nhân viên nhận room ngay cả khi chưa joinRoom
      req.io.to(String(otherId)).emit('roomCreated', {
        room: populatedRoom,
        isNewRoom: true,
        message: 'Tạo phòng chat mới thành công',
      });
    }
    res.status(201).json({
      room: populatedRoom,
      isNewRoom: true,
      message: 'Tạo phòng chat mới thành công',
      boiCanh: boiCanhPhong,
    });
  } catch (error) {
    console.error('findOrCreatePrivateRoom:', error);
    return httpError(res, error, 'Lỗi tìm/tạo phòng chat private');
  }
};

// Thêm tin nhắn vào phòng chat
const addMessageToRoom = async (req, res) => {
  const { roomId } = req.params;
  const { messageId } = req.body;

  try {
    const actor = await ensureAuthContext(req);
    const userId = actor.id;

    const room = await PhongChat.findById(roomId);
    assertCanAccessRoom(room, userId, actor.isStaff);

    const message = await TinNhan.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Không tìm thấy tin nhắn' });
    }

    if (!room.tinNhan.includes(messageId)) {
      room.tinNhan.push(messageId);
      room.tinNhanCuoi = messageId;
      await room.save();

      const otherMembers = room.thanhVien.filter(
        (m) => m.nguoiDung.toString() !== userId && m.trangThai === 'active',
      );
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
    return httpError(res, error, 'Lỗi thêm tin nhắn vào phòng');
  }
};

// Xóa tin nhắn khỏi phòng chat
const removeMessageFromRoom = async (req, res) => {
  const { roomId, messageId } = req.params;

  try {
    const actor = await ensureAuthContext(req);
    const userId = actor.id;

    const room = await PhongChat.findById(roomId);
    assertRoomAdmin(room, userId, actor.isStaff);

    room.tinNhan = room.tinNhan.filter((id) => id.toString() !== messageId);
    if (room.tinNhanCuoi && room.tinNhanCuoi.toString() === messageId) {
      room.tinNhanCuoi = room.tinNhan.length > 0 ? room.tinNhan[room.tinNhan.length - 1] : null;
    }
    await room.save();

    if (req.io) {
      req.io.to(roomId).emit('messageRemoved', { roomId, messageId });
    }
    res.status(200).json({ message: 'Xóa tin nhắn khỏi phòng thành công' });
  } catch (error) {
    return httpError(res, error, 'Lỗi xóa tin nhắn khỏi phòng');
  }
};

// Cập nhật thông tin phòng chat
const updateRoom = async (req, res) => {
  const { roomId } = req.params;
  const { tenPhong, anhDaiDien, thanhVien } = req.body;

  try {
    const actor = await ensureAuthContext(req);
    const userId = actor.id;
    const select = memberSelect(actor.isStaff);

    const room = await PhongChat.findById(roomId);
    assertRoomAdmin(room, userId, actor.isStaff);

    const updateData = {};
    if (tenPhong) updateData.tenPhong = tenPhong;
    if (anhDaiDien) updateData.anhDaiDien = anhDaiDien;
    if (thanhVien) updateData.thanhVien = thanhVien;

    const updatedRoom = await PhongChat.findByIdAndUpdate(roomId, updateData, { new: true, runValidators: true })
      .populate({ path: 'thanhVien.nguoiDung', select })
      .populate({ path: 'nguoiTao', select });

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

      const otherMembers = updatedRoom.thanhVien.filter(
        (m) => m.nguoiDung.toString() !== userId && m.trangThai === 'active',
      );
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
    return httpError(res, error, 'Lỗi cập nhật phòng chat');
  }
};

// Xóa phòng chat (private: chỉ quản trị viên; group: admin nhóm hoặc quản trị viên)
const deleteRoom = async (req, res) => {
  const { roomId } = req.params;

  try {
    const actor = await ensureAuthContext(req);
    const userId = actor.id;

    const room = await PhongChat.findById(roomId);
    assertCanDeleteOrDisbandRoom(room, userId, { isAdmin: actor.isAdmin });

    const otherMembers = room.thanhVien.filter(
      (m) => m.nguoiDung.toString() !== userId && m.trangThai === 'active',
    );

    await TinNhan.deleteMany({ roomId });
    await PhongChat.findByIdAndDelete(roomId);

    await writeAuditLog({
      thucThe: 'admin',
      thucTheId: roomId,
      hanhDong: room.loaiPhong === 'group' ? 'disband_group' : 'delete_private_chat',
      nguoiDungId: userId,
      sau: {
        loaiPhong: room.loaiPhong,
        tenPhong: room.tenPhong,
        boiCanh: room.boiCanh,
      },
      ghiChu:
        room.loaiPhong === 'group'
          ? 'Giải tán / xóa nhóm chat'
          : 'Admin xóa cuộc trò chuyện',
    });

    for (const member of otherMembers) {
      if (req.io) {
        await createNotification({
          nguoiNhan: member.nguoiDung,
          loai: 'room_update',
          noiDung:
            room.loaiPhong === 'group'
              ? `Nhóm ${room.tenPhong || 'chat'} đã bị giải tán`
              : `Cuộc trò chuyện đã bị xóa bởi quản trị viên`,
          roomId,
        }, req.io);
      }
    }

    if (req.io) {
      req.io.to(roomId).emit('roomDeleted', {
        roomId,
        reason: room.loaiPhong === 'group' ? 'disbanded' : 'deleted',
      });
    }
    res.status(200).json({
      message:
        room.loaiPhong === 'group'
          ? 'Giải tán nhóm thành công'
          : 'Xóa cuộc trò chuyện thành công',
    });
  } catch (error) {
    return httpError(res, error, 'Lỗi xóa phòng');
  }
};

/** Giải tán nhóm — alias rõ nghĩa của DELETE (chỉ group). */
const disbandGroup = async (req, res) => {
  const { roomId } = req.params;

  try {
    const actor = await ensureAuthContext(req);
    const userId = actor.id;

    const room = await PhongChat.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Không tìm thấy phòng chat' });
    }
    if (room.loaiPhong !== 'group') {
      return res.status(400).json({
        message: 'Chỉ dùng giải tán cho phòng nhóm. Cuộc trò chuyện riêng: DELETE /api/room/:id (admin)',
      });
    }

    assertCanDeleteOrDisbandRoom(room, userId, { isAdmin: actor.isAdmin });

    const otherMembers = room.thanhVien.filter(
      (m) => m.nguoiDung.toString() !== userId && m.trangThai === 'active',
    );

    await TinNhan.deleteMany({ roomId });
    await PhongChat.findByIdAndDelete(roomId);

    await writeAuditLog({
      thucThe: 'admin',
      thucTheId: roomId,
      hanhDong: 'disband_group',
      nguoiDungId: userId,
      sau: { tenPhong: room.tenPhong },
      ghiChu: 'Giải tán nhóm chat',
    });

    for (const member of otherMembers) {
      if (req.io) {
        await createNotification({
          nguoiNhan: member.nguoiDung,
          loai: 'room_update',
          noiDung: `Nhóm ${room.tenPhong || 'chat'} đã bị giải tán`,
          roomId,
        }, req.io);
      }
    }

    if (req.io) {
      req.io.to(roomId).emit('roomDeleted', { roomId, reason: 'disbanded' });
    }
    res.status(200).json({ message: 'Giải tán nhóm thành công' });
  } catch (error) {
    return httpError(res, error, 'Lỗi giải tán nhóm');
  }
};

// Tìm kiếm phòng chat — luôn theo actor (không cho spoof query.userId)
const searchRooms = async (req, res) => {
  const { keyword } = req.query;

  try {
    const actor = await ensureAuthContext(req);
    const userId = actor.id;
    const select = memberSelect(actor.isStaff);

    const query = {
      thanhVien: {
        $elemMatch: { nguoiDung: userId, trangThai: 'active' },
      },
      anDoiVoi: { $ne: userId },
    };
    if (keyword) {
      query.tenPhong = { $regex: keyword, $options: 'i' };
    }

    const rooms = await PhongChat.find(query)
      .populate(roomPopulate(select))
      .sort({ updatedAt: -1 });

    res.json(rooms);
  } catch (error) {
    return httpError(res, error, 'Lỗi tìm kiếm phòng chat');
  }
};

// Thêm thành viên vào phòng chat nhóm (1 hoặc nhiều)
const addMemberToRoom = async (req, res) => {
  const { roomId } = req.params;

  try {
    const actor = await ensureAuthContext(req);
    const userId = actor.id;
    const select = memberSelect(actor.isStaff);

    const rawIds = [
      ...(Array.isArray(req.body.userIds) ? req.body.userIds : []),
      ...(Array.isArray(req.body.newMemberIds) ? req.body.newMemberIds : []),
      req.body.newMemberId,
      req.body.userId,
    ]
      .filter(Boolean)
      .map(String);

    const newMemberIds = [...new Set(rawIds)];
    if (!newMemberIds.length) {
      return res.status(400).json({
        message: 'Thiếu thành viên mới (newMemberId | userId | userIds[])',
      });
    }

    const room = await PhongChat.findById(roomId);
    assertRoomAdmin(room, userId, actor.isStaff);

    if (room.loaiPhong !== 'group') {
      return res.status(400).json({ message: 'Chỉ có thể thêm thành viên vào phòng nhóm' });
    }

    const added = [];
    const skipped = [];

    for (const newMemberId of newMemberIds) {
      if (newMemberId === userId) {
        skipped.push({ userId: newMemberId, reason: 'self' });
        continue;
      }
      const existingMember = room.thanhVien.find(
        (m) => m.nguoiDung.toString() === String(newMemberId),
      );
      if (existingMember && existingMember.trangThai === 'active') {
        skipped.push({ userId: newMemberId, reason: 'already_member' });
        continue;
      }
      if (existingMember && existingMember.trangThai === 'left') {
        existingMember.trangThai = 'active';
      } else {
        room.thanhVien.push({
          nguoiDung: newMemberId,
          vaiTro: 'member',
          trangThai: 'active',
        });
      }
      added.push(newMemberId);
    }

    if (!added.length) {
      return res.status(400).json({
        message: 'Không có thành viên mới nào được thêm',
        skipped,
      });
    }

    await room.save();

    const systemMessage = await TinNhan.create({
      roomId,
      nguoiGuiId: userId,
      noiDung:
        added.length === 1
          ? `Đã thêm thành viên vào nhóm`
          : `Đã thêm ${added.length} thành viên vào nhóm`,
      loaiTinNhan: 'system',
      daDoc: [userId],
      trangThai: 'sent',
    });

    await PhongChat.findByIdAndUpdate(roomId, {
      $push: { tinNhan: systemMessage._id },
      tinNhanCuoi: systemMessage._id,
    });

    const updatedRoom = await PhongChat.findById(roomId)
      .populate({ path: 'thanhVien.nguoiDung', select })
      .populate({ path: 'nguoiTao', select });

    if (req.io) {
      for (const newMemberId of added) {
        await createNotification({
          nguoiNhan: newMemberId,
          loai: 'room_update',
          noiDung: `Bạn đã được thêm vào nhóm ${room.tenPhong || 'chat'}`,
          roomId,
        }, req.io);
        // Cá nhân — FE cập nhật danh sách ngay khi chưa joinRoom
        req.io.to(String(newMemberId)).emit('memberAdded', {
          roomId,
          newMemberId,
          room: updatedRoom,
        });
        req.io.to(String(newMemberId)).emit('roomCreated', {
          room: updatedRoom,
          isNewRoom: false,
          message: 'Bạn được thêm vào nhóm',
        });
      }
      req.io.to(roomId).emit('memberAdded', {
        roomId,
        newMemberIds: added,
        room: updatedRoom,
      });
    }

    res.status(200).json({
      message: `Đã thêm ${added.length} thành viên`,
      room: updatedRoom,
      added,
      skipped,
    });
  } catch (error) {
    return httpError(res, error, 'Lỗi thêm thành viên');
  }
};

/** GET /api/room/:roomId/presence — thành viên online trong phòng */
const getRoomPresence = async (req, res) => {
  try {
    const actor = await ensureAuthContext(req);
    const room = await PhongChat.findById(req.params.roomId).select('thanhVien');
    assertCanAccessRoom(room, actor.id, actor.isStaff);

    const memberIds = (room.thanhVien || [])
      .filter((m) => m.trangThai === 'active')
      .map((m) => String(m.nguoiDung));

    const { getConnectionState } = await import('#infra/realtime/ioInstance.js');
    const state = getConnectionState();
    const onlineUserIds = state
      ? memberIds.filter((id) => state.isUserOnline(id))
      : [];

    res.status(200).json({
      roomId: req.params.roomId,
      memberIds,
      onlineUserIds,
      users: memberIds.map((userId) => ({
        userId,
        online: onlineUserIds.includes(userId),
      })),
    });
  } catch (error) {
    return httpError(res, error, 'Lỗi lấy trạng thái online');
  }
};

// Ẩn phòng chat khỏi danh sách của riêng người dùng (không xóa dữ liệu thật)
const hideRoom = async (req, res) => {
  const { roomId } = req.params;

  try {
    const actor = await ensureAuthContext(req);
    const userId = actor.id;

    const room = await PhongChat.findById(roomId);
    assertCanAccessRoom(room, userId, actor.isStaff);

    await PhongChat.findByIdAndUpdate(roomId, { $addToSet: { anDoiVoi: userId } });

    res.status(200).json({ message: 'Đã ẩn cuộc trò chuyện' });
  } catch (error) {
    return httpError(res, error, 'Lỗi ẩn phòng chat');
  }
};

/** Xóa lịch sử đoạn chat chỉ phía 1 user (tin vẫn còn với thành viên khác). */
const clearHistoryForMe = async (req, res) => {
  const { roomId } = req.params;

  try {
    const actor = await ensureAuthContext(req);
    const userId = actor.id;

    const room = await PhongChat.findById(roomId);
    assertCanAccessRoom(room, userId, actor.isStaff);

    // Staff hệ thống không phải thành viên → không có anTinTruocLuc để set
    if (!isActiveMember(room, userId)) {
      return res.status(403).json({ message: 'Người dùng không thuộc phòng chat' });
    }

    const member = findActiveMember(room, userId);
    member.anTinTruocLuc = new Date();
    await room.save();

    res.status(200).json({
      message: 'Đã xóa lịch sử phía bạn',
      anTinTruocLuc: member.anTinTruocLuc,
    });
  } catch (error) {
    return httpError(res, error, 'Lỗi xóa lịch sử chat');
  }
};

// Rời phòng chat nhóm
const leaveRoom = async (req, res) => {
  const { roomId } = req.params;

  try {
    const actor = await ensureAuthContext(req);
    const userId = actor.id;

    const room = await PhongChat.findById(roomId);
    assertCanAccessRoom(room, userId, actor.isStaff);

    if (!isActiveMember(room, userId)) {
      return res.status(403).json({ message: 'Người dùng không thuộc phòng chat' });
    }

    const member = findActiveMember(room, userId);

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

    const otherMembers = room.thanhVien.filter(
      (m) => m.nguoiDung.toString() !== userId && m.trangThai === 'active',
    );
    for (const m of otherMembers) {
      if (req.io) {
        await createNotification({
          nguoiNhan: m.nguoiDung,
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
    return httpError(res, error, 'Lỗi rời phòng');
  }
};

// Chuyển quyền admin
const transferAdmin = async (req, res) => {
  const { roomId } = req.params;
  const { newAdminId } = req.body;

  try {
    const actor = await ensureAuthContext(req);
    const userId = actor.id;
    const select = memberSelect(actor.isStaff);

    if (!newAdminId) {
      return res.status(400).json({ message: 'Thiếu thông tin newAdminId' });
    }

    const room = await PhongChat.findById(roomId);
    const currentAdmin = assertRoomAdmin(room, userId, actor.isStaff);

    if (room.loaiPhong !== 'group') {
      return res.status(400).json({ message: 'Chỉ có thể chuyển quyền admin trong phòng nhóm' });
    }

    const newAdmin = room.thanhVien.find(
      (m) => m.nguoiDung.toString() === String(newAdminId) && m.trangThai === 'active',
    );
    if (!newAdmin) {
      return res.status(400).json({ message: 'Người dùng không hợp lệ hoặc không phải thành viên active' });
    }

    // Staff có thể chuyển dù không phải room-admin; chỉ hạ vaiTro nếu actor đang là admin phòng
    if (currentAdmin && currentAdmin.vaiTro === 'admin') {
      currentAdmin.vaiTro = 'member';
    } else {
      const existingAdmin = room.thanhVien.find(
        (m) => m.vaiTro === 'admin' && m.trangThai === 'active' && m.nguoiDung.toString() !== String(newAdminId),
      );
      if (existingAdmin) existingAdmin.vaiTro = 'member';
    }
    newAdmin.vaiTro = 'admin';
    await room.save();

    const systemMessage = await TinNhan.create({
      roomId,
      nguoiGuiId: userId,
      noiDung: `Quyền admin đã được chuyển cho người dùng ${newAdminId}`,
      loaiTinNhan: 'system',
      daDoc: [userId],
      trangThai: 'sent',
    });

    await PhongChat.findByIdAndUpdate(roomId, {
      $push: { tinNhan: systemMessage._id },
      tinNhanCuoi: systemMessage._id,
    });

    const otherMembers = room.thanhVien.filter(
      (m) => m.nguoiDung.toString() !== userId && m.trangThai === 'active',
    );
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
      .populate({ path: 'thanhVien.nguoiDung', select })
      .populate({ path: 'nguoiTao', select });

    if (req.io) {
      req.io.to(roomId).emit('adminTransferred', { roomId, newAdminId });
    }
    res.status(200).json(updatedRoom);
  } catch (error) {
    return httpError(res, error, 'Lỗi chuyển quyền admin');
  }
};

export {
  getAllRom,
  getRoomsOfUser,
  getRoomById,
  createRoom,
  findOrCreatePrivateRoom,
  addMessageToRoom,
  removeMessageFromRoom,
  updateRoom,
  deleteRoom,
  disbandGroup,
  searchRooms,
  addMemberToRoom,
  getRoomPresence,
  hideRoom,
  clearHistoryForMe,
  leaveRoom,
  transferAdmin,
};
export default {
  getAllRom,
  getRoomsOfUser,
  getRoomById,
  createRoom,
  findOrCreatePrivateRoom,
  addMessageToRoom,
  removeMessageFromRoom,
  updateRoom,
  deleteRoom,
  disbandGroup,
  searchRooms,
  addMemberToRoom,
  getRoomPresence,
  hideRoom,
  clearHistoryForMe,
  leaveRoom,
  transferAdmin,
};
