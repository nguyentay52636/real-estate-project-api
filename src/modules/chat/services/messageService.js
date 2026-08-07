import MessageModel from '#models/Message.js';
import RoomModel from '#models/ChatRoom.js';
import ChatNotificationModel from '#models/ChatNotification.js';
import { AppError } from '#shared/errors/AppError.js';
import { maybeLean, maybeSelect } from '#shared/utils/queryHelpers.js';
import {
  parseMentionIds,
  filterMentionsToRoomMembers,
  resolveReplyId,
} from '#modules/chat/utils/mentionHelpers.js';

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

function memberIdOf(m) {
  const raw = m?.nguoiDung;
  if (raw && typeof raw === 'object' && raw._id != null) return String(raw._id);
  return String(raw ?? '');
}

export function createMessageService(deps = {}) {
  const Message = deps.Message ?? MessageModel;
  const Room = deps.Room ?? RoomModel;
  const Notification = deps.Notification ?? ChatNotificationModel;

  async function checkRoomAccess(roomId, userId, { isStaff = false } = {}) {
    const room = await maybeLean(maybeSelect(Room.findById(roomId), 'thanhVien tenPhong loaiPhong'));
    if (!room) throw new AppError('Không tìm thấy phòng chat', 404);
    const member = room.thanhVien.find(
      (m) => memberIdOf(m) === String(userId) && m.trangThai === 'active',
    );
    if (!member && !isStaff) {
      throw new AppError('Người dùng không thuộc phòng chat', 403);
    }
    return { room, member: member || null };
  }

  function populateMessage(query) {
    return query
      .populate('nguoiGuiId', SENDER_FIELDS)
      .populate('roomId', ROOM_FIELDS)
      .populate('mentions', SENDER_FIELDS)
      .populate('phanHoiTinNhan.nguoiGuiId', SENDER_FIELDS);
  }

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
    const { roomId, noiDung, tapTin, phanHoiTinNhan, loaiTinNhan, mentions } = input;

    if (!roomId || !nguoiGuiId || (!noiDung && !hasTapTin(tapTin) && loaiTinNhan !== 'system')) {
      throw new AppError('Thiếu thông tin bắt buộc', 400);
    }

    const { room } = await checkRoomAccess(roomId, nguoiGuiId, {
      isStaff: Boolean(options.isStaff),
    });

    if (loaiTinNhan && !VALID_MESSAGE_TYPES.includes(loaiTinNhan)) {
      throw new AppError(`Loại tin nhắn không hợp lệ: ${VALID_MESSAGE_TYPES.join(', ')}`, 400);
    }

    const replyId = resolveReplyId(phanHoiTinNhan);
    let phanHoiData = null;
    if (replyId) {
      const replyMessage = await maybeLean(Message.findById(replyId));
      if (!replyMessage) throw new AppError('Tin nhắn trả lời không hợp lệ', 400);
      if (String(replyMessage.roomId) !== String(roomId)) {
        throw new AppError('Tin trả lời không thuộc phòng này', 400);
      }
      phanHoiData = {
        _id: replyMessage._id,
        noiDung: replyMessage.noiDung,
        nguoiGuiId: replyMessage.nguoiGuiId,
      };
    }

    const rawMentions = parseMentionIds({ noiDung, mentions });
    const mentionIds = filterMentionsToRoomMembers(rawMentions, room, nguoiGuiId);

    const newMessage = await Message.create({
      roomId,
      nguoiGuiId,
      noiDung: noiDung || '',
      tapTin: tapTin || [],
      mentions: mentionIds,
      phanHoiTinNhan: phanHoiData,
      loaiTinNhan: loaiTinNhan || 'text',
      daDoc: [nguoiGuiId],
      trangThai: 'sent',
    });

    await linkMessageToRoom(roomId, newMessage._id);

    const mentionSet = new Set(mentionIds.map(String));
    const otherMembers = room.thanhVien.filter(
      (m) => memberIdOf(m) !== String(nguoiGuiId) && m.trangThai === 'active',
    );

    const notifDocs = [];
    for (const member of otherMembers) {
      const uid = memberIdOf(member);
      if (mentionSet.has(uid)) {
        notifDocs.push({
          nguoiNhan: uid,
          loai: 'mention',
          noiDung: `Bạn được nhắc đến trong ${room.tenPhong || 'nhóm chat'}`,
          roomId,
          tinNhanId: newMessage._id,
        });
      } else {
        notifDocs.push({
          nguoiNhan: uid,
          loai: 'new_message',
          noiDung: `Tin nhắn mới trong phòng ${room.tenPhong || 'chat riêng'}`,
          roomId,
          tinNhanId: newMessage._id,
        });
      }
    }

    if (notifDocs.length && typeof Notification.insertMany === 'function') {
      await Notification.insertMany(notifDocs, { ordered: false });
    } else {
      for (const doc of notifDocs) {
        await Notification.create(doc);
      }
    }

    const populated = await maybeLean(populateMessage(Message.findById(newMessage._id)));

    const io = options.io;
    if (io && populated) {
      io.to(String(roomId)).emit('message:new', populated);
      for (const member of otherMembers) {
        const uid = memberIdOf(member);
        if (!uid) continue;
        io.to(uid).emit('message:new', populated);
        const isMention = mentionSet.has(uid);
        if (isMention) {
          io.to(uid).emit('mention:new', {
            roomId,
            tinNhanId: newMessage._id,
            message: populated,
          });
        }
        // Badge unread realtime (REST + socket chung)
        io.to(uid).emit('newNotification', {
          loai: isMention ? 'mention' : 'new_message',
          noiDung: isMention
            ? `Bạn được nhắc đến trong ${room.tenPhong || 'nhóm chat'}`
            : `Tin nhắn mới trong phòng ${room.tenPhong || 'chat riêng'}`,
          roomId,
          tinNhanId: newMessage._id,
          daDoc: false,
        });
        io.to(uid).emit('unread:bump', {
          roomId: String(roomId),
          delta: 1,
          loai: isMention ? 'mention' : 'new_message',
        });
      }
    }

    return populated;
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
    if (message.nguoiGuiId.toString() !== String(userId)) {
      throw new AppError(forbiddenMessage, 403);
    }
    return message;
  }

  async function updateMessage(id, userId, { noiDungMoi, tapTin } = {}) {
    const message = await assertOwnership(id, userId, 'Chỉ người gửi mới được sửa tin nhắn');
    if (!isWithinEditDeleteWindow(message)) {
      throw new AppError('Chỉ được sửa tin trong 24 giờ', 403);
    }
    if (noiDungMoi != null) message.noiDung = noiDungMoi;
    if (tapTin != null) message.tapTin = tapTin;
    message.trangThai = 'edited';
    await message.save();
    return maybeLean(populateMessage(Message.findById(id)));
  }

  async function deleteMessage(id, userId) {
    const message = await assertOwnership(id, userId, 'Chỉ người gửi mới được xóa tin nhắn');
    if (!isWithinEditDeleteWindow(message)) {
      throw new AppError('Chỉ được xóa tin trong 24 giờ', 403);
    }
    message.trangThai = 'deleted';
    message.noiDung = '';
    message.tapTin = [];
    await message.save();
    return maybeLean(populateMessage(Message.findById(id)));
  }

  async function recallMessage(id, userId) {
    await assertOwnership(id, userId, 'Chỉ người gửi mới được thu hồi tin nhắn');
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
    const uid = String(userId);
    const already = (message.daDoc || []).some((d) => String(d) === uid);
    if (!already) {
      await Message.findByIdAndUpdate(id, { $addToSet: { daDoc: userId } });
      await Notification.updateMany(
        { tinNhanId: id, nguoiNhan: userId, daDoc: false },
        { daDoc: true },
      );
    }
    return maybeLean(
      Message.findById(id)
        .populate('nguoiGuiId', SENDER_FIELDS)
        .populate('roomId', ROOM_FIELDS),
    );
  }

  async function searchMessages(
    { roomId, keyword, q, startDate, endDate, limit, page, isStaff = false },
    userId,
  ) {
    if (!roomId) throw new AppError('Thiếu roomId', 400);
    const { member } = await checkRoomAccess(roomId, userId, {
      isStaff: Boolean(isStaff),
    });

    const term = String(keyword || q || '').trim();
    if (!term && !startDate && !endDate) {
      throw new AppError('Cần keyword (hoặc q) hoặc khoảng ngày startDate/endDate', 400);
    }
    if (term && term.length < 2) {
      throw new AppError('Từ khóa tìm kiếm tối thiểu 2 ký tự', 400);
    }

    const { limitNum, pageNum, skip } = parseMessagePagination({ limit, page });
    const query = {
      roomId,
      trangThai: { $nin: ['deleted', 'recalled'] },
    };
    if (term) {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.noiDung = { $regex: escaped, $options: 'i' };
    }
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    if (member?.anTinTruocLuc) {
      const cutoff = new Date(member.anTinTruocLuc);
      if (!Number.isNaN(cutoff.getTime())) {
        query.createdAt = { ...(query.createdAt || {}), $gt: cutoff };
      }
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
        totalPages: Math.ceil(total / limitNum) || 1,
      },
      query: { roomId, keyword: term || null, startDate: startDate || null, endDate: endDate || null },
    };
  }

  async function assertRoomAdmin(roomId, userId, forbiddenMessage) {
    const room = await Room.findById(roomId);
    if (!room) throw new AppError('Không tìm thấy phòng chat', 404);
    const member = room.thanhVien.find((m) => m.nguoiDung.toString() === String(userId));
    if (!member || member.vaiTro !== 'admin') {
      throw new AppError(forbiddenMessage, 403);
    }
    return room;
  }

  async function pinMessage(roomId, messageId, userId) {
    const room = await assertRoomAdmin(roomId, userId, 'Chỉ admin mới có thể ghim tin nhắn');
    if (!room.tinNhanGhim) room.tinNhanGhim = [];
    if (!room.tinNhanGhim.map(String).includes(String(messageId))) {
      room.tinNhanGhim.push(messageId);
      await room.save();
    }
  }

  async function unpinMessage(roomId, messageId, userId) {
    const room = await assertRoomAdmin(roomId, userId, 'Chỉ admin mới có thể gỡ ghim tin nhắn');
    room.tinNhanGhim = (room.tinNhanGhim || []).filter((id) => id.toString() !== String(messageId));
    await room.save();
  }

  async function socketCreateMessage(data, io) {
    return createMessage(data, data.nguoiGuiId, { io, isStaff: Boolean(data.isStaff) });
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
