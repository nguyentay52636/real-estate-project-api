import MessageModel from '#models/Message.js';
import RoomModel from '#models/ChatRoom.js';
import ChatNotificationModel from '#models/ChatNotification.js';
import { AppError } from '#shared/errors/AppError.js';
import { maybeLean, maybeSelect } from '#shared/utils/queryHelpers.js';

const SENDER_FIELDS = 'ten anhDaiDien';
const ROOM_FIELDS = 'tenPhong loaiPhong';
const VALID_MESSAGE_TYPES = ['text', 'image', 'audio', 'cuoc_goi', 'system'];
const VALID_CALL_TYPES = ['audio', 'video'];
const VALID_CALL_STATUSES = ['missed', 'ended', 'declined', 'ongoing'];
const DEFAULT_MESSAGE_LIMIT = 50;
const MESSAGE_EDIT_DELETE_WINDOW_MS = 24 * 60 * 60 * 1000;

function parseMessagePagination({ limit, before, after, page } = {}) {
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || DEFAULT_MESSAGE_LIMIT));
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  return {
    limitNum,
    pageNum,
    before: before ? new Date(before) : null,
    after: after ? new Date(after) : null,
    skip: page ? (pageNum - 1) * limitNum : 0,
  };
}

function hasTapTin(tapTin) {
  return Array.isArray(tapTin) ? tapTin.length > 0 : Boolean(tapTin);
}

function isWithinEditDeleteWindow(message) {
  const createdAt = message?.createdAt ? new Date(message.createdAt).getTime() : 0;
  if (!createdAt) return false;
  return Date.now() - createdAt <= MESSAGE_EDIT_DELETE_WINDOW_MS;
}

export function createMessageService(deps = {}) {
  const Message = deps.Message ?? MessageModel;
  const Room = deps.Room ?? RoomModel;
  const Notification = deps.Notification ?? ChatNotificationModel;

  async function checkRoomAccess(roomId, userId, { isStaff = false } = {}) {
    const room = await maybeLean(maybeSelect(Room.findById(roomId), 'thanhVien tenPhong'));
    if (!room) throw new AppError('Không tìm thấy phòng chat', 404);
    const member = room.thanhVien.find((m) => {
      const raw = m.nguoiDung;
      const mid =
        raw && typeof raw === 'object' && raw._id != null
          ? String(raw._id)
          : String(raw);
      return mid === String(userId) && m.trangThai === 'active';
    });
    // Staff hệ thống được xem/gửi trong phòng hỗ trợ dù chưa nằm trong thanhVien
    // (vd. mở từ ticket). Danh sách GET /api/room mặc định vẫn chỉ phòng mình thuộc.
    if (!member && !isStaff) {
      throw new AppError('Người dùng không thuộc phòng chat', 403);
    }
    return { room, member: member || null };
  }

  function populateMessage(query) {
    return query
      .populate('nguoiGuiId', SENDER_FIELDS)
      .populate('roomId', ROOM_FIELDS)
      .populate('phanHoiTinNhan.nguoiGuiId', SENDER_FIELDS);
  }

  /** Chỉ cập nhật tin cuối — không $push tinNhan[] */
  async function linkMessageToRoom(roomId, messageId) {
    await Room.findByIdAndUpdate(roomId, {
      tinNhanCuoi: messageId,
      updatedAt: new Date(),
    });
  }

  async function getMessages(roomId, userId, query = {}) {
    const { member } = await checkRoomAccess(roomId, userId, {
      isStaff: Boolean(query.isStaff),
    });
    const { limitNum, pageNum, before, after, skip } = parseMessagePagination(query);

    const filter = { roomId };
    if (before && !Number.isNaN(before.getTime())) {
      filter.createdAt = { ...(filter.createdAt || {}), $lt: before };
    }
    if (after && !Number.isNaN(after.getTime())) {
      filter.createdAt = { ...(filter.createdAt || {}), $gt: after };
    }
    // Ẩn lịch sử chỉ với user đã "xoá đoạn chat" (anTinTruocLuc)
    if (member?.anTinTruocLuc) {
      const cutoff = new Date(member.anTinTruocLuc);
      if (!Number.isNaN(cutoff.getTime())) {
        filter.createdAt = { ...(filter.createdAt || {}), $gt: cutoff };
      }
    }

    let findQuery = Message.find(filter).sort({ createdAt: before ? -1 : 1 });
    if (query.page && typeof findQuery.skip === 'function') {
      findQuery = findQuery.skip(skip);
    }
    if (typeof findQuery.limit === 'function') {
      findQuery = findQuery.limit(limitNum);
    }

    const [rows, total] = await Promise.all([
      maybeLean(populateMessage(findQuery)),
      Message.countDocuments(filter),
    ]);

    const data = before ? [...rows].reverse() : rows;

    return {
      data,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        hasMore: data.length === limitNum,
      },
    };
  }

  async function createMessage(input, nguoiGuiId, options = {}) {
    const { roomId, noiDung, tapTin, phanHoiTinNhan, loaiTinNhan } = input;

    if (!roomId || !nguoiGuiId || (!noiDung && !hasTapTin(tapTin) && loaiTinNhan !== 'system')) {
      throw new AppError('Thiếu thông tin bắt buộc', 400);
    }

    const { room } = await checkRoomAccess(roomId, nguoiGuiId, {
      isStaff: Boolean(options.isStaff),
    });

    if (loaiTinNhan && !VALID_MESSAGE_TYPES.includes(loaiTinNhan)) {
      throw new AppError(`Loại tin nhắn không hợp lệ: ${VALID_MESSAGE_TYPES.join(', ')}`, 400);
    }

    let phanHoiData = null;
    if (phanHoiTinNhan) {
      const replyMessage = await maybeLean(Message.findById(phanHoiTinNhan));
      if (!replyMessage) throw new AppError('Tin nhắn trả lời không hợp lệ', 400);
      phanHoiData = {
        _id: replyMessage._id,
        noiDung: replyMessage.noiDung,
        nguoiGuiId: replyMessage.nguoiGuiId,
      };
    }

    const newMessage = await Message.create({
      roomId,
      nguoiGuiId,
      noiDung: noiDung || '',
      tapTin: tapTin || [],
      phanHoiTinNhan: phanHoiData,
      loaiTinNhan: loaiTinNhan || 'text',
      daDoc: [nguoiGuiId],
      trangThai: 'sent',
    });

    await linkMessageToRoom(roomId, newMessage._id);

    const otherMembers = room.thanhVien.filter(
      (m) => m.nguoiDung.toString() !== nguoiGuiId && m.trangThai === 'active',
    );
    if (otherMembers.length && typeof Notification.insertMany === 'function') {
      await Notification.insertMany(
        otherMembers.map((member) => ({
          nguoiNhan: member.nguoiDung,
          loai: 'new_message',
          noiDung: `Tin nhắn mới trong phòng ${room.tenPhong || 'chat riêng'}`,
          roomId,
          tinNhanId: newMessage._id,
        })),
        { ordered: false },
      );
    } else {
      for (const member of otherMembers) {
        await Notification.create({
          nguoiNhan: member.nguoiDung,
          loai: 'new_message',
          noiDung: `Tin nhắn mới trong phòng ${room.tenPhong || 'chat riêng'}`,
          roomId,
          tinNhanId: newMessage._id,
        });
      }
    }

    return maybeLean(populateMessage(Message.findById(newMessage._id)));
  }

  async function createCallMessage(input, nguoiGuiId, options = {}) {
    const { roomId, loai, trangThai, thoiLuong, thanhVien } = input;

    if (!roomId || !loai) {
      throw new AppError('Thiếu thông tin bắt buộc (roomId, loai)', 400);
    }

    await checkRoomAccess(roomId, nguoiGuiId, { isStaff: Boolean(options.isStaff) });

    if (!VALID_CALL_TYPES.includes(loai)) {
      throw new AppError(`Loại cuộc gọi không hợp lệ: ${VALID_CALL_TYPES.join(', ')}`, 400);
    }
    if (trangThai && !VALID_CALL_STATUSES.includes(trangThai)) {
      throw new AppError(`Trạng thái cuộc gọi không hợp lệ: ${VALID_CALL_STATUSES.join(', ')}`, 400);
    }

    const newMessage = await Message.create({
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
    });

    await linkMessageToRoom(roomId, newMessage._id);

    return maybeLean(
      Message.findById(newMessage._id)
        .populate('nguoiGuiId', SENDER_FIELDS)
        .populate('roomId', ROOM_FIELDS),
    );
  }

  async function assertOwnership(id, userId, forbiddenMessage) {
    const message = await Message.findById(id);
    if (!message) throw new AppError('Không tìm thấy tin nhắn', 404);
    if (message.nguoiGuiId.toString() !== userId) {
      throw new AppError(forbiddenMessage, 403);
    }
    return message;
  }

  async function updateMessage(id, userId, { noiDungMoi, tapTin }) {
    const message = await assertOwnership(id, userId, 'Không có quyền chỉnh sửa tin nhắn');
    if (!isWithinEditDeleteWindow(message)) {
      throw new AppError('Chỉ được chỉnh sửa tin nhắn trong vòng 24 giờ', 400);
    }
    const updateData = { trangThai: 'edited' };
    if (noiDungMoi) updateData.noiDung = noiDungMoi;
    if (tapTin) updateData.tapTin = tapTin;
    return maybeLean(populateMessage(Message.findByIdAndUpdate(id, updateData, { new: true })));
  }

  async function deleteMessage(id, userId) {
    const message = await assertOwnership(id, userId, 'Không có quyền xóa tin nhắn');
    if (!isWithinEditDeleteWindow(message)) {
      throw new AppError('Chỉ được xóa tin nhắn trong vòng 24 giờ', 400);
    }
    return maybeLean(
      Message.findByIdAndUpdate(
        id,
        { noiDung: '[deleted]', trangThai: 'deleted' },
        { new: true },
      )
        .populate('nguoiGuiId', SENDER_FIELDS)
        .populate('roomId', ROOM_FIELDS),
    );
  }

  async function recallMessage(id, userId) {
    await assertOwnership(id, userId, 'Không có quyền thu hồi tin nhắn');
    return maybeLean(
      Message.findByIdAndUpdate(
        id,
        {
          noiDung: '[Tin nhắn đã được thu hồi]',
          trangThai: 'recalled',
          tapTin: [],
          hinhAnh: '',
        },
        { new: true },
      )
        .populate('nguoiGuiId', SENDER_FIELDS)
        .populate('roomId', ROOM_FIELDS),
    );
  }

  async function markAsRead(id, userId) {
    const message = await Message.findById(id);
    if (!message) throw new AppError('Không tìm thấy tin nhắn', 404);
    if (!message.daDoc.includes(userId)) {
      message.daDoc.push(userId);
      await message.save();
    }
    return maybeLean(
      Message.findById(id)
        .populate('nguoiGuiId', SENDER_FIELDS)
        .populate('roomId', ROOM_FIELDS),
    );
  }

  async function searchMessages(
    { roomId, keyword, startDate, endDate, limit, page, isStaff = false },
    userId,
  ) {
    await checkRoomAccess(roomId, userId, { isStaff: Boolean(isStaff) });
    const { limitNum, pageNum, skip } = parseMessagePagination({ limit, page });
    const query = { roomId };
    if (keyword) query.noiDung = { $regex: keyword, $options: 'i' };
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    let findQuery = Message.find(query).sort({ createdAt: -1 });
    if (typeof findQuery.skip === 'function') findQuery = findQuery.skip(skip);
    if (typeof findQuery.limit === 'function') findQuery = findQuery.limit(limitNum);

    const [data, total] = await Promise.all([
      maybeLean(populateMessage(findQuery)),
      Message.countDocuments(query),
    ]);
    return {
      data,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async function assertRoomAdmin(roomId, userId, forbiddenMessage) {
    const room = await Room.findById(roomId);
    if (!room) throw new AppError('Không tìm thấy phòng chat', 404);
    const member = room.thanhVien.find((m) => m.nguoiDung.toString() === userId);
    if (!member || member.vaiTro !== 'admin') {
      throw new AppError(forbiddenMessage, 403);
    }
    return room;
  }

  async function pinMessage(roomId, messageId, userId) {
    const room = await assertRoomAdmin(roomId, userId, 'Chỉ admin mới có thể ghim tin nhắn');
    if (!room.tinNhanGhim.includes(messageId)) {
      room.tinNhanGhim.push(messageId);
      await room.save();
    }
  }

  async function unpinMessage(roomId, messageId, userId) {
    const room = await assertRoomAdmin(roomId, userId, 'Chỉ admin mới có thể gỡ ghim tin nhắn');
    room.tinNhanGhim = room.tinNhanGhim.filter((id) => id.toString() !== messageId);
    await room.save();
  }

  async function socketCreateMessage(data, io) {
    const newMsg = await Message.create({
      ...data,
      daDoc: data.daDoc || [data.nguoiGuiId],
      trangThai: data.trangThai || 'sent',
    });
    await linkMessageToRoom(data.roomId, newMsg._id);

    const populatedMsg = await maybeLean(
      Message.findById(newMsg._id)
        .populate('nguoiGuiId', SENDER_FIELDS)
        .populate('roomId', ROOM_FIELDS),
    );

    if (io) io.to(String(data.roomId)).emit('newMessage', populatedMsg);
    return newMsg;
  }

  async function socketUpdateMessage(id, noiDungMoi, userId, io) {
    const updated = await updateMessage(id, userId, { noiDungMoi });
    if (io) io.to(String(updated.roomId)).emit('updatedMessage', updated);
    return updated;
  }

  async function socketDeleteMessage(id, userId, io) {
    const deleted = await deleteMessage(id, userId);
    if (io) io.to(String(deleted.roomId)).emit('deletedMessage', deleted);
    return deleted;
  }

  async function socketRecallMessage(id, userId) {
    return recallMessage(id, userId);
  }

  return {
    checkRoomAccess,
    getMessages,
    createMessage,
    createCallMessage,
    updateMessage,
    deleteMessage,
    recallMessage,
    markAsRead,
    searchMessages,
    pinMessage,
    unpinMessage,
    socketCreateMessage,
    socketUpdateMessage,
    socketDeleteMessage,
    socketRecallMessage,
  };
}

const messageService = createMessageService();
export default messageService;
