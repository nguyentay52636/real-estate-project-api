// controllers/socketController.js
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const PhongChat = require('../models/PhongChat');
const TinNhan = require('../models/TinNhan');
const { createMessage, updateMessage, deleteMessage } = require('../controllers/messageController');
const { createNotification } = require('../controllers/notificationChatController');
const { setIO } = require('./ioInstance');
const NguoiDung = require('../models/Nguoidung');
const {
  acceptHandoffTicket,
  getPendingTickets,
  isNhanVien,
} = require('../services/handoffService');

const setupSocket = (server) => {
  const io = socketIo(server, {
    cors: {
      origin: [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:8080',
        'https://newlive-sable.vercel.app/',
        process.env.CLIENT_URL,
      ].filter(Boolean),
      methods: ['GET', 'POST'],
      credentials: true,
    },
    allowEIO3: true,
    transports: ['websocket', 'polling'],
    maxHttpBufferSize: 1e6,
  });

  // Middleware xác thực JWT
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return next(new Error('Yêu cầu xác thực'));
      }

      const decoded = jwt.verify(token, process.env.JWT_ACCESS_KEY);
      socket.user = {
        id: decoded.id,
        vaiTro: decoded.vaiTro,
      };
      next();
    } catch (error) {
      const message =
        error.name === 'TokenExpiredError' ? 'jwt expired' : 'Xác thực không hợp lệ';
      console.error('❌ Lỗi xác thực Socket:', error.message);
      next(new Error(message));
    }
  });

  // Quản lý trạng thái người dùng và phòng
  const userRooms = new Map(); // Map<socket.id, Set<roomId>>
  const onlineUsers = new Map(); // Map<userId, Set<socket.id>>

  io.on('connection', async (socket) => {
    console.log(`🟢 Socket Connected: ${socket.id}, User: ${socket.user.id}`);

    const currentUser = await NguoiDung.findById(socket.user.id).populate('vaiTro', 'ten');
    socket.user.vaiTroTen = currentUser?.vaiTro?.ten || null;

    socket.join(socket.user.id);
    if (socket.user.vaiTroTen === 'nhan_vien') {
      socket.join('nhan_vien_online');
      const pendingTickets = await getPendingTickets();
      socket.emit('handoff:pendingList', {
        tickets: pendingTickets,
        timestamp: new Date().toISOString(),
      });
    }

    // Thêm người dùng vào danh sách online
    const userSockets = onlineUsers.get(socket.user.id) || new Set();
    userSockets.add(socket.id);
    onlineUsers.set(socket.user.id, userSockets);
    userRooms.set(socket.id, new Set());

    // Gửi trạng thái online tới các phòng liên quan
    const broadcastUserStatus = async (status) => {
      const rooms = await PhongChat.find({ 'thanhVien.nguoiDung': socket.user.id, 'thanhVien.trangThai': 'active' });
      for (const room of rooms) {
        io.to(room._id.toString()).emit('userStatus', {
          userId: socket.user.id,
          status,
          timestamp: new Date(),
        });
      }
    };
    broadcastUserStatus('online');

    // Tham gia phòng
    socket.on('joinRoom', async (roomId) => {
      try {
        if (!mongoose.isValidObjectId(roomId)) {
          socket.emit('error', { code: 'INVALID_ROOM_ID', message: 'ID phòng chat không hợp lệ' });
          return;
        }

        const room = await PhongChat.findById(roomId);
        if (!room) {
          socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Không tìm thấy phòng chat' });
          return;
        }

        const isMember = room.thanhVien.some(
          (member) => member.nguoiDung.toString() === socket.user.id && member.trangThai === 'active'
        );
        if (!isMember) {
          socket.emit('error', { code: 'UNAUTHORIZED', message: 'Không có quyền truy cập phòng này' });
          return;
        }

        // Rời các phòng trước đó
        const currentRooms = userRooms.get(socket.id) || new Set();
        for (const prevRoom of currentRooms) {
          socket.leave(prevRoom);
          console.log(`👋 User ${socket.user.id} left room ${prevRoom}`);
        }

        // Tham gia phòng mới
        socket.join(roomId);
        userRooms.set(socket.id, new Set([roomId]));
        console.log(`✅ User ${socket.user.id} joined room ${roomId}`);

        socket.emit('joinedRoom', {
          roomId,
          message: 'Tham gia phòng thành công',
          timestamp: new Date(),
          socketId: socket.id,
        });

        io.to(roomId).emit('userJoined', {
          userId: socket.user.id,
          socketId: socket.id,
          roomId,
          timestamp: new Date(),
        });

        // Gửi danh sách người dùng online trong phòng
        const roomSockets = await io.in(roomId).fetchSockets();
        const onlineUserIds = roomSockets
          .map((s) => s.user?.id)
          .filter((id, index, arr) => id && arr.indexOf(id) === index);
        io.to(roomId).emit('roomUsers', {
          roomId,
          onlineUsers: onlineUserIds,
          timestamp: new Date(),
        });
      } catch (error) {
        console.error('❌ Lỗi khi tham gia phòng:', error.message);
        socket.emit('error', { code: 'SERVER_ERROR', message: 'Không thể tham gia phòng', error: error.message });
      }
    });

    // Tạo phòng
    socket.on('room:create', async ({ tenPhong, loaiPhong, thanhVien, nguoiTao, anhDaiDien }) => {
      try {
        if (!loaiPhong || !thanhVien?.length || !nguoiTao) {
          socket.emit('error', { code: 'INVALID_DATA', message: 'Thiếu thông tin phòng chat' });
          return;
        }

        const newRoom = await PhongChat.create({
          tenPhong,
          loaiPhong,
          thanhVien,
          nguoiTao,
          anhDaiDien,
          tinNhan: [],
          tinNhanGhim: [],
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
          await createNotification({
            nguoiNhan: member.nguoiDung,
            loai: 'room_update',
            noiDung: `Bạn đã được thêm vào phòng ${tenPhong || 'chat riêng'}`,
            roomId: newRoom._id,
          }, io);
        }

        const populatedRoom = await PhongChat.findById(newRoom._id)
          .populate('thanhVien.nguoiDung', 'hoTen avatar')
          .populate('nguoiTao', 'hoTen avatar')
          .populate('tinNhanCuoi');

        io.to(newRoom._id.toString()).emit('roomCreated', populatedRoom);
        socket.emit('roomCreated', populatedRoom);
        console.log(`✅ Phòng mới được tạo: ${newRoom._id}`);
      } catch (error) {
        console.error('❌ Lỗi tạo phòng:', error.message);
        socket.emit('error', { code: 'CREATE_ROOM_FAILED', message: 'Không thể tạo phòng', error: error.message });
      }
    });

    // Tạo hoặc tìm phòng riêng tư
    socket.on('room:findOrCreatePrivate', async ({ userId1, userId2 }) => {
      try {
        if (!userId1 || !userId2) {
          socket.emit('error', { code: 'INVALID_DATA', message: 'Thiếu thông tin userId1 hoặc userId2' });
          return;
        }

        if (userId1 === userId2) {
          socket.emit('error', { code: 'INVALID_DATA', message: 'Không thể tạo phòng chat với chính mình' });
          return;
        }

        const existingRoom = await PhongChat.findOne({
          loaiPhong: 'private',
          'thanhVien.nguoiDung': { $all: [userId1, userId2] },
          'thanhVien.trangThai': 'active',
          $where: 'this.thanhVien.length == 2',
        })
          .populate('thanhVien.nguoiDung', 'hoTen avatar')
          .populate('nguoiTao', 'hoTen avatar')
          .populate({
            path: 'tinNhan',
            populate: { path: 'nguoiGuiId', select: 'hoTen avatar' },
            options: { sort: { createdAt: 1 } },
          });

        if (existingRoom) {
          socket.emit('roomFound', {
            room: existingRoom,
            isNewRoom: false,
            message: 'Phòng chat đã tồn tại',
          });
          return;
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
          tinNhanGhim: [],
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

        await createNotification({
          nguoiNhan: userId2,
          loai: 'room_update',
          noiDung: `Bạn đã được thêm vào phòng chat riêng với ${userId1}`,
          roomId: newRoom._id,
        }, io);

        const populatedRoom = await PhongChat.findById(newRoom._id)
          .populate('thanhVien.nguoiDung', 'hoTen avatar')
          .populate('nguoiTao', 'hoTen avatar')
          .populate('tinNhanCuoi');

        io.to(newRoom._id.toString()).emit('roomCreated', populatedRoom);
        socket.emit('roomCreated', {
          room: populatedRoom,
          isNewRoom: true,
          message: 'Tạo phòng chat mới thành công',
        });
        console.log(`✅ Phòng riêng tư mới được tạo: ${newRoom._id}`);
      } catch (error) {
        console.error('❌ Lỗi tìm/tạo phòng riêng tư:', error.message);
        socket.emit('error', { code: 'CREATE_PRIVATE_ROOM_FAILED', message: 'Không thể tạo/tìm phòng riêng tư', error: error.message });
      }
    });

    // Thêm tin nhắn vào phòng
    socket.on('message:addToRoom', async ({ roomId, messageId }) => {
      try {
        if (!mongoose.isValidObjectId(roomId) || !mongoose.isValidObjectId(messageId)) {
          socket.emit('error', { code: 'INVALID_ID', message: 'ID phòng hoặc tin nhắn không hợp lệ' });
          return;
        }

        if (!socket.rooms.has(roomId)) {
          socket.emit('error', { code: 'NOT_IN_ROOM', message: 'Bạn phải tham gia phòng trước' });
          return;
        }

        const room = await PhongChat.findById(roomId);
        if (!room) {
          socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Không tìm thấy phòng chat' });
          return;
        }

        const message = await TinNhan.findById(messageId);
        if (!message) {
          socket.emit('error', { code: 'MESSAGE_NOT_FOUND', message: 'Không tìm thấy tin nhắn' });
          return;
        }

        if (!room.tinNhan.includes(messageId)) {
          room.tinNhan.push(messageId);
          room.tinNhanCuoi = messageId;
          await room.save();

          const otherMembers = room.thanhVien.filter(m => m.nguoiDung.toString() !== socket.user.id && m.trangThai === 'active');
          for (const member of otherMembers) {
            await createNotification({
              nguoiNhan: member.nguoiDung,
              loai: 'new_message',
              noiDung: `Tin nhắn mới trong phòng ${room.tenPhong || 'chat riêng'}`,
              roomId,
              tinNhanId: messageId,
            }, io);
          }

          io.to(roomId).emit('messageAdded', { roomId, messageId });
          console.log(`✅ Tin nhắn ${messageId} được thêm vào phòng ${roomId}`);
        }

        socket.emit('messageAdded', { message: 'Thêm tin nhắn vào phòng thành công' });
      } catch (error) {
        console.error('❌ Lỗi thêm tin nhắn vào phòng:', error.message);
        socket.emit('error', { code: 'ADD_MESSAGE_FAILED', message: 'Không thể thêm tin nhắn vào phòng', error: error.message });
      }
    });

    // Xóa tin nhắn khỏi phòng
    socket.on('message:removeFromRoom', async ({ roomId, messageId }) => {
      try {
        if (!mongoose.isValidObjectId(roomId) || !mongoose.isValidObjectId(messageId)) {
          socket.emit('error', { code: 'INVALID_ID', message: 'ID phòng hoặc tin nhắn không hợp lệ' });
          return;
        }

        if (!socket.rooms.has(roomId)) {
          socket.emit('error', { code: 'NOT_IN_ROOM', message: 'Bạn phải tham gia phòng trước' });
          return;
        }

        const room = await PhongChat.findById(roomId);
        if (!room) {
          socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Không tìm thấy phòng chat' });
          return;
        }

        const isAdmin = room.thanhVien.some(
          (member) => member.nguoiDung.toString() === socket.user.id && member.vaiTro === 'admin'
        );
        if (!isAdmin) {
          socket.emit('error', { code: 'UNAUTHORIZED', message: 'Chỉ admin mới có thể xóa tin nhắn khỏi phòng' });
          return;
        }

        room.tinNhan = room.tinNhan.filter(id => id.toString() !== messageId);
        if (room.tinNhanCuoi && room.tinNhanCuoi.toString() === messageId) {
          room.tinNhanCuoi = room.tinNhan.length > 0 ? room.tinNhan[room.tinNhan.length - 1] : null;
        }
        await room.save();

        io.to(roomId).emit('messageRemoved', { roomId, messageId });
        socket.emit('messageRemoved', { message: 'Xóa tin nhắn khỏi phòng thành công' });
        console.log(`✅ Tin nhắn ${messageId} đã được xóa khỏi phòng ${roomId}`);
      } catch (error) {
        console.error('❌ Lỗi xóa tin nhắn khỏi phòng:', error.message);
        socket.emit('error', { code: 'REMOVE_MESSAGE_FAILED', message: 'Không thể xóa tin nhắn khỏi phòng', error: error.message });
      }
    });

    // Cập nhật phòng
    socket.on('room:update', async ({ roomId, tenPhong, anhDaiDien, thanhVien }) => {
      try {
        if (!mongoose.isValidObjectId(roomId)) {
          socket.emit('error', { code: 'INVALID_ROOM_ID', message: 'ID phòng chat không hợp lệ' });
          return;
        }

        if (!socket.rooms.has(roomId)) {
          socket.emit('error', { code: 'NOT_IN_ROOM', message: 'Bạn phải tham gia phòng trước' });
          return;
        }

        const room = await PhongChat.findById(roomId);
        if (!room) {
          socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Không tìm thấy phòng chat' });
          return;
        }

        const isAdmin = room.thanhVien.some(
          (member) => member.nguoiDung.toString() === socket.user.id && member.vaiTro === 'admin'
        );
        if (!isAdmin) {
          socket.emit('error', { code: 'UNAUTHORIZED', message: 'Chỉ admin mới có thể cập nhật phòng chat' });
          return;
        }

        const updateData = {};
        if (tenPhong) updateData.tenPhong = tenPhong;
        if (anhDaiDien) updateData.anhDaiDien = anhDaiDien;
        if (thanhVien) updateData.thanhVien = thanhVien;

        const updatedRoom = await PhongChat.findByIdAndUpdate(roomId, updateData, { new: true, runValidators: true })
          .populate('thanhVien.nguoiDung', 'hoTen avatar')
          .populate('nguoiTao', 'hoTen avatar');

        if (Object.keys(updateData).length > 0) {
          const systemMessage = await TinNhan.create({
            roomId,
            nguoiGuiId: socket.user.id,
            noiDung: 'Thông tin phòng chat đã được cập nhật',
            loaiTinNhan: 'system',
            daDoc: [socket.user.id],
            trangThai: 'sent',
          });

          await PhongChat.findByIdAndUpdate(roomId, {
            $push: { tinNhan: systemMessage._id },
            tinNhanCuoi: systemMessage._id,
          });

          const otherMembers = updatedRoom.thanhVien.filter(m => m.nguoiDung.toString() !== socket.user.id && m.trangThai === 'active');
          for (const member of otherMembers) {
            await createNotification({
              nguoiNhan: member.nguoiDung,
              loai: 'room_update',
              noiDung: `Phòng ${tenPhong || 'chat riêng'} đã được cập nhật`,
              roomId,
            }, io);
          }

          io.to(roomId).emit('roomUpdated', updatedRoom);
        }

        socket.emit('roomUpdated', updatedRoom);
        console.log(`✅ Phòng ${roomId} đã được cập nhật`);
      } catch (error) {
        console.error('❌ Lỗi cập nhật phòng:', error.message);
        socket.emit('error', { code: 'UPDATE_ROOM_FAILED', message: 'Không thể cập nhật phòng', error: error.message });
      }
    });

    // Xóa phòng
    socket.on('room:delete', async ({ roomId }) => {
      try {
        if (!mongoose.isValidObjectId(roomId)) {
          socket.emit('error', { code: 'INVALID_ROOM_ID', message: 'ID phòng chat không hợp lệ' });
          return;
        }

        if (!socket.rooms.has(roomId)) {
          socket.emit('error', { code: 'NOT_IN_ROOM', message: 'Bạn phải tham gia phòng trước' });
          return;
        }

        const room = await PhongChat.findById(roomId);
        if (!room) {
          socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Không tìm thấy phòng chat' });
          return;
        }

        const isAdmin = room.thanhVien.some(
          (member) => member.nguoiDung.toString() === socket.user.id && member.vaiTro === 'admin'
        );
        if (!isAdmin) {
          socket.emit('error', { code: 'UNAUTHORIZED', message: 'Chỉ admin mới có thể xóa phòng chat' });
          return;
        }

        await TinNhan.deleteMany({ roomId });
        await PhongChat.findByIdAndDelete(roomId);

        const otherMembers = room.thanhVien.filter(m => m.nguoiDung.toString() !== socket.user.id && m.trangThai === 'active');
        for (const member of otherMembers) {
          await createNotification({
            nguoiNhan: member.nguoiDung,
            loai: 'room_update',
            noiDung: `Phòng ${room.tenPhong || 'chat riêng'} đã bị xóa`,
            roomId,
          }, io);
        }

        io.to(roomId).emit('roomDeleted', { roomId });
        socket.emit('roomDeleted', { message: 'Xóa phòng thành công' });
        console.log(`✅ Phòng ${roomId} đã bị xóa`);
      } catch (error) {
        console.error('❌ Lỗi xóa phòng:', error.message);
        socket.emit('error', { code: 'DELETE_ROOM_FAILED', message: 'Không thể xóa phòng', error: error.message });
      }
    });

    // Thêm thành viên vào phòng nhóm
    socket.on('addMember', async ({ roomId, newMemberId }) => {
      try {
        if (!mongoose.isValidObjectId(roomId) || !mongoose.isValidObjectId(newMemberId)) {
          socket.emit('error', { code: 'INVALID_ID', message: 'ID phòng hoặc thành viên không hợp lệ' });
          return;
        }

        if (!socket.rooms.has(roomId)) {
          socket.emit('error', { code: 'NOT_IN_ROOM', message: 'Bạn phải tham gia phòng trước' });
          return;
        }

        const room = await PhongChat.findById(roomId);
        if (!room) {
          socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Không tìm thấy phòng chat' });
          return;
        }

        if (room.loaiPhong !== 'group') {
          socket.emit('error', { code: 'INVALID_ROOM_TYPE', message: 'Chỉ có thể thêm thành viên vào phòng nhóm' });
          return;
        }

        const isAdmin = room.thanhVien.some(
          (member) => member.nguoiDung.toString() === socket.user.id && member.vaiTro === 'admin'
        );
        if (!isAdmin) {
          socket.emit('error', { code: 'UNAUTHORIZED', message: 'Chỉ admin mới có thể thêm thành viên' });
          return;
        }

        const existingMember = room.thanhVien.find(m => m.nguoiDung.toString() === newMemberId);
        if (existingMember && existingMember.trangThai === 'active') {
          socket.emit('error', { code: 'MEMBER_EXISTS', message: 'Người dùng đã là thành viên của phòng' });
          return;
        }

        if (existingMember && existingMember.trangThai === 'left') {
          existingMember.trangThai = 'active';
          existingMember.thoiGianThamGia = new Date();
        } else {
          room.thanhVien.push({ nguoiDung: newMemberId, vaiTro: 'member', trangThai: 'active' });
        }
        await room.save();

        const systemMessage = await TinNhan.create({
          roomId,
          nguoiGuiId: socket.user.id,
          noiDung: `Người dùng ${newMemberId} đã được thêm vào phòng`,
          loaiTinNhan: 'system',
          daDoc: [socket.user.id],
          trangThai: 'sent',
        });

        await PhongChat.findByIdAndUpdate(roomId, {
          $push: { tinNhan: systemMessage._id },
          tinNhanCuoi: systemMessage._id,
        });

        await createNotification({
          nguoiNhan: newMemberId,
          loai: 'room_update',
          noiDung: `Bạn đã được thêm vào phòng ${room.tenPhong}`,
          roomId,
        }, io);

        const updatedRoom = await PhongChat.findById(roomId)
          .populate('thanhVien.nguoiDung', 'hoTen avatar')
          .populate('nguoiTao', 'hoTen avatar');

        io.to(roomId).emit('memberAdded', { roomId, newMemberId, room: updatedRoom });
        socket.emit('memberAdded', { message: 'Thêm thành viên thành công', room: updatedRoom });
        console.log(`✅ Thành viên ${newMemberId} đã được thêm vào phòng ${roomId}`);
      } catch (error) {
        console.error('❌ Lỗi thêm thành viên:', error.message);
        socket.emit('error', { code: 'ADD_MEMBER_FAILED', message: 'Không thể thêm thành viên', error: error.message });
      }
    });

    // Rời phòng nhóm
    socket.on('leaveRoom', async ({ roomId }) => {
      try {
        if (!mongoose.isValidObjectId(roomId)) {
          socket.emit('error', { code: 'INVALID_ROOM_ID', message: 'ID phòng chat không hợp lệ' });
          return;
        }

        if (!socket.rooms.has(roomId)) {
          socket.emit('error', { code: 'NOT_IN_ROOM', message: 'Bạn phải tham gia phòng trước' });
          return;
        }

        const room = await PhongChat.findById(roomId);
        if (!room) {
          socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Không tìm thấy phòng chat' });
          return;
        }

        if (room.loaiPhong !== 'group') {
          socket.emit('error', { code: 'INVALID_ROOM_TYPE', message: 'Chỉ có thể rời khỏi phòng nhóm' });
          return;
        }

        const member = room.thanhVien.find(m => m.nguoiDung.toString() === socket.user.id);
        if (!member || member.trangThai !== 'active') {
          socket.emit('error', { code: 'UNAUTHORIZED', message: 'Bạn không phải thành viên active của phòng' });
          return;
        }

        if (member.vaiTro === 'admin') {
          socket.emit('error', { code: 'UNAUTHORIZED', message: 'Admin không thể rời phòng, hãy chuyển quyền admin trước' });
          return;
        }

        member.trangThai = 'left';
        await room.save();

        const systemMessage = await TinNhan.create({
          roomId,
          nguoiGuiId: socket.user.id,
          noiDung: `Người dùng ${socket.user.id} đã rời phòng`,
          loaiTinNhan: 'system',
          daDoc: [socket.user.id],
          trangThai: 'sent',
        });

        await PhongChat.findByIdAndUpdate(roomId, {
          $push: { tinNhan: systemMessage._id },
          tinNhanCuoi: systemMessage._id,
        });

        const otherMembers = room.thanhVien.filter(m => m.nguoiDung.toString() !== socket.user.id && m.trangThai === 'active');
        for (const member of otherMembers) {
          await createNotification({
            nguoiNhan: member.nguoiDung,
            loai: 'room_update',
            noiDung: `Người dùng ${socket.user.id} đã rời phòng ${room.tenPhong}`,
            roomId,
          }, io);
        }

        socket.leave(roomId);
        userRooms.set(socket.id, new Set([...userRooms.get(socket.id)].filter(id => id !== roomId)));

        io.to(roomId).emit('memberLeft', { roomId, userId: socket.user.id });
        socket.emit('memberLeft', { message: 'Rời phòng thành công' });
        console.log(`✅ Người dùng ${socket.user.id} đã rời phòng ${roomId}`);
      } catch (error) {
        console.error('❌ Lỗi rời phòng:', error.message);
        socket.emit('error', { code: 'LEAVE_ROOM_FAILED', message: 'Không thể rời phòng', error: error.message });
      }
    });

    // Chuyển quyền admin
    socket.on('transferAdmin', async ({ roomId, newAdminId }) => {
      try {
        if (!mongoose.isValidObjectId(roomId) || !mongoose.isValidObjectId(newAdminId)) {
          socket.emit('error', { code: 'INVALID_ID', message: 'ID phòng hoặc admin mới không hợp lệ' });
          return;
        }

        if (!socket.rooms.has(roomId)) {
          socket.emit('error', { code: 'NOT_IN_ROOM', message: 'Bạn phải tham gia phòng trước' });
          return;
        }

        const room = await PhongChat.findById(roomId);
        if (!room) {
          socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Không tìm thấy phòng chat' });
          return;
        }

        if (room.loaiPhong !== 'group') {
          socket.emit('error', { code: 'INVALID_ROOM_TYPE', message: 'Chỉ có thể chuyển quyền admin trong phòng nhóm' });
          return;
        }

        const currentAdmin = room.thanhVien.find(m => m.nguoiDung.toString() === socket.user.id);
        if (!currentAdmin || currentAdmin.vaiTro !== 'admin') {
          socket.emit('error', { code: 'UNAUTHORIZED', message: 'Chỉ admin hiện tại mới có thể chuyển quyền' });
          return;
        }

        const newAdmin = room.thanhVien.find(m => m.nguoiDung.toString() === newAdminId && m.trangThai === 'active');
        if (!newAdmin) {
          socket.emit('error', { code: 'INVALID_MEMBER', message: 'Người dùng không hợp lệ hoặc không phải thành viên active' });
          return;
        }

        currentAdmin.vaiTro = 'member';
        newAdmin.vaiTro = 'admin';
        await room.save();

        const systemMessage = await TinNhan.create({
          roomId,
          nguoiGuiId: socket.user.id,
          noiDung: `Quyền admin đã được chuyển cho người dùng ${newAdminId}`,
          loaiTinNhan: 'system',
          daDoc: [socket.user.id],
          trangThai: 'sent',
        });

        await PhongChat.findByIdAndUpdate(roomId, {
          $push: { tinNhan: systemMessage._id },
          tinNhanCuoi: systemMessage._id,
        });

        const otherMembers = room.thanhVien.filter(m => m.nguoiDung.toString() !== socket.user.id && m.trangThai === 'active');
        for (const member of otherMembers) {
          await createNotification({
            nguoiNhan: member.nguoiDung,
            loai: 'room_update',
            noiDung: `Người dùng ${newAdminId} đã trở thành admin của phòng ${room.tenPhong}`,
            roomId,
          }, io);
        }

        const updatedRoom = await PhongChat.findById(roomId)
          .populate('thanhVien.nguoiDung', 'hoTen avatar')
          .populate('nguoiTao', 'hoTen avatar');

        io.to(roomId).emit('adminTransferred', { roomId, newAdminId, room: updatedRoom });
        socket.emit('adminTransferred', { message: 'Chuyển quyền admin thành công', room: updatedRoom });
        console.log(`✅ Quyền admin của phòng ${roomId} đã được chuyển cho ${newAdminId}`);
      } catch (error) {
        console.error('❌ Lỗi chuyển quyền admin:', error.message);
        socket.emit('error', { code: 'TRANSFER_ADMIN_FAILED', message: 'Không thể chuyển quyền admin', error: error.message });
      }
    });

    // Tạo tin nhắn
    socket.on('message:create', async (data) => {
      try {
        const { roomId, noiDung, tapTin, phanHoiTinNhan, loaiTinNhan } = data;
        if (!roomId || (!noiDung && !tapTin?.length && loaiTinNhan !== 'cuoc_goi')) {
          socket.emit('error', { code: 'INVALID_DATA', message: 'Thiếu dữ liệu tin nhắn' });
          return;
        }

        if (!mongoose.isValidObjectId(roomId)) {
          socket.emit('error', { code: 'INVALID_ROOM_ID', message: 'ID phòng chat không hợp lệ' });
          return;
        }

        if (!socket.rooms.has(roomId)) {
          socket.emit('error', { code: 'NOT_IN_ROOM', message: 'Bạn phải tham gia phòng trước' });
          return;
        }

        if (phanHoiTinNhan && !mongoose.isValidObjectId(phanHoiTinNhan)) {
          socket.emit('error', { code: 'INVALID_REPLY_ID', message: 'ID tin nhắn trả lời không hợp lệ' });
          return;
        }

        const messageData = {
          roomId,
          nguoiGuiId: socket.user.id,
          noiDung: noiDung || '',
          tapTin: tapTin || [],
          phanHoiTinNhan: phanHoiTinNhan || null,
          loaiTinNhan: loaiTinNhan || 'text',
        };

        const message = await createMessage(messageData);
        const populatedMessage = await TinNhan.findById(message._id)
          .populate('nguoiGuiId', 'hoTen avatar')
          .populate('roomId', 'tenPhong loaiPhong')
          .populate('phanHoiTinNhan', 'noiDung nguoiGuiId');

        const otherMembers = (await PhongChat.findById(roomId)).thanhVien.filter(
          m => m.nguoiDung.toString() !== socket.user.id && m.trangThai === 'active'
        );
        for (const member of otherMembers) {
          await createNotification({
            nguoiNhan: member.nguoiDung,
            loai: 'new_message',
            noiDung: `Tin nhắn mới trong phòng ${populatedMessage.roomId.tenPhong || 'chat riêng'}`,
            roomId,
            tinNhanId: message._id,
          }, io);
        }

        io.to(roomId).emit('message:new', populatedMessage);
        console.log(`📡 Tin nhắn mới trong phòng ${roomId}: ${message._id}`);
      } catch (error) {
        console.error('❌ Lỗi tạo tin nhắn:', error.message);
        socket.emit('error', { code: 'CREATE_MESSAGE_FAILED', message: 'Không thể tạo tin nhắn', error: error.message });
      }
    });

    // Cập nhật tin nhắn
    socket.on('message:update', async ({ id, noiDungMoi, tapTin, roomId }) => {
      try {
        if (!id || !roomId || (!noiDungMoi && !tapTin)) {
          socket.emit('error', { code: 'INVALID_DATA', message: 'Thiếu dữ liệu cập nhật' });
          return;
        }

        if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(roomId)) {
          socket.emit('error', { code: 'INVALID_ID', message: 'ID tin nhắn hoặc phòng không hợp lệ' });
          return;
        }

        if (!socket.rooms.has(roomId)) {
          socket.emit('error', { code: 'NOT_IN_ROOM', message: 'Bạn phải tham gia phòng trước' });
          return;
        }

        const existingMessage = await TinNhan.findById(id);
        if (!existingMessage) {
          socket.emit('error', { code: 'MESSAGE_NOT_FOUND', message: 'Không tìm thấy tin nhắn' });
          return;
        }

        if (existingMessage.nguoiGuiId.toString() !== socket.user.id) {
          socket.emit('error', { code: 'UNAUTHORIZED', message: 'Không có quyền sửa tin nhắn' });
          return;
        }

        const updated = await updateMessage(id, noiDungMoi, tapTin);
        if (!updated) {
          socket.emit('error', { code: 'UPDATE_FAILED', message: 'Cập nhật tin nhắn thất bại' });
          return;
        }

        const populatedMessage = await TinNhan.findById(id)
          .populate('nguoiGuiId', 'hoTen avatar')
          .populate('roomId', 'tenPhong loaiPhong')
          .populate('phanHoiTinNhan', 'noiDung nguoiGuiId');

        io.to(roomId).emit('message:updated', populatedMessage);
        console.log(`✅ Cập nhật tin nhắn ${id} trong phòng ${roomId}`);
      } catch (error) {
        console.error('❌ Lỗi cập nhật tin nhắn:', error.message);
        socket.emit('error', { code: 'UPDATE_MESSAGE_FAILED', message: 'Không thể cập nhật tin nhắn', error: error.message });
      }
    });

    // Xóa tin nhắn
    socket.on('message:delete', async ({ id, roomId }) => {
      try {
        if (!id || !roomId) {
          socket.emit('error', { code: 'INVALID_DATA', message: 'Thiếu dữ liệu xóa' });
          return;
        }

        if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(roomId)) {
          socket.emit('error', { code: 'INVALID_ID', message: 'ID tin nhắn hoặc phòng không hợp lệ' });
          return;
        }

        if (!socket.rooms.has(roomId)) {
          socket.emit('error', { code: 'NOT_IN_ROOM', message: 'Bạn phải tham gia phòng trước' });
          return;
        }

        const existingMessage = await TinNhan.findById(id);
        if (!existingMessage) {
          socket.emit('error', { code: 'MESSAGE_NOT_FOUND', message: 'Không tìm thấy tin nhắn' });
          return;
        }

        const room = await PhongChat.findById(roomId);
        const isAdmin = room.thanhVien.some(
          (member) => member.nguoiDung.toString() === socket.user.id && member.vaiTro === 'admin'
        );
        if (existingMessage.nguoiGuiId.toString() !== socket.user.id && !isAdmin) {
          socket.emit('error', { code: 'UNAUTHORIZED', message: 'Không có quyền xóa tin nhắn' });
          return;
        }

        const deleted = await deleteMessage(id);
        if (!deleted) {
          socket.emit('error', { code: 'DELETE_FAILED', message: 'Xóa tin nhắn thất bại' });
          return;
        }

        io.to(roomId).emit('message:deleted', deleted);
        console.log(`✅ Xóa tin nhắn ${id} trong phòng ${roomId}`);
      } catch (error) {
        console.error('❌ Lỗi xóa tin nhắn:', error.message);
        socket.emit('error', { code: 'DELETE_MESSAGE_FAILED', message: 'Không thể xóa tin nhắn', error: error.message });
      }
    });

    // Đánh dấu tin nhắn đã đọc
    socket.on('message:read', async ({ id, roomId }) => {
      try {
        if (!id || !roomId) {
          socket.emit('error', { code: 'INVALID_DATA', message: 'Thiếu dữ liệu đánh dấu đã đọc' });
          return;
        }

        if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(roomId)) {
          socket.emit('error', { code: 'INVALID_ID', message: 'ID tin nhắn hoặc phòng không hợp lệ' });
          return;
        }

        if (!socket.rooms.has(roomId)) {
          socket.emit('error', { code: 'NOT_IN_ROOM', message: 'Bạn phải tham gia phòng trước' });
          return;
        }

        const message = await TinNhan.findById(id);
        if (!message) {
          socket.emit('error', { code: 'MESSAGE_NOT_FOUND', message: 'Không tìm thấy tin nhắn' });
          return;
        }

        if (!message.daDoc.includes(socket.user.id)) {
          message.daDoc.push(socket.user.id);
          await message.save();
        }

        const updated = await TinNhan.findById(id)
          .populate('nguoiGuiId', 'hoTen avatar')
          .populate('roomId', 'tenPhong loaiPhong')
          .populate('phanHoiTinNhan', 'noiDung nguoiGuiId');

        io.to(roomId).emit('message:read', updated);
        console.log(`✅ Tin nhắn ${id} được đánh dấu đã đọc trong phòng ${roomId}`);
      } catch (error) {
        console.error('❌ Lỗi đánh dấu tin nhắn đã đọc:', error.message);
        socket.emit('error', { code: 'READ_MESSAGE_FAILED', message: 'Không thể đánh dấu tin nhắn đã đọc', error: error.message });
      }
    });

    // Tạo tin nhắn cuộc gọi
    socket.on('call:create', async ({ roomId, loai, trangThai, thoiLuong, thanhVien }) => {
      try {
        if (!roomId || !loai || !thanhVien) {
          socket.emit('error', { code: 'INVALID_DATA', message: 'Thiếu dữ liệu cuộc gọi' });
          return;
        }

        if (!mongoose.isValidObjectId(roomId)) {
          socket.emit('error', { code: 'INVALID_ROOM_ID', message: 'ID phòng chat không hợp lệ' });
          return;
        }

        if (!socket.rooms.has(roomId)) {
          socket.emit('error', { code: 'NOT_IN_ROOM', message: 'Bạn phải tham gia phòng trước' });
          return;
        }

        const messageData = {
          roomId,
          nguoiGuiId: socket.user.id,
          loaiTinNhan: 'cuoc_goi',
          noiDung: `[Cuộc gọi ${loai}]`,
          cuocGoi: {
            trangThai: trangThai || 'ended',
            loai,
            thoiLuong: thoiLuong || 0,
            thanhVien: thanhVien || [],
          },
        };

        const message = await createMessage(messageData);
        const populatedMessage = await TinNhan.findById(message._id)
          .populate('nguoiGuiId', 'hoTen avatar')
          .populate('roomId', 'tenPhong loaiPhong');

        const otherMembers = (await PhongChat.findById(roomId)).thanhVien.filter(
          m => m.nguoiDung.toString() !== socket.user.id && m.trangThai === 'active'
        );
        for (const member of otherMembers) {
          await createNotification({
            nguoiNhan: member.nguoiDung,
            loai: 'call',
            noiDung: `Cuộc gọi ${loai} trong phòng ${populatedMessage.roomId.tenPhong || 'chat riêng'}`,
            roomId,
            tinNhanId: message._id,
          }, io);
        }

        io.to(roomId).emit('call:new', populatedMessage);
        console.log(`📞 Tin nhắn cuộc gọi mới trong phòng ${roomId}: ${message._id}`);
      } catch (error) {
        console.error('❌ Lỗi tạo tin nhắn cuộc gọi:', error.message);
        socket.emit('error', { code: 'CREATE_CALL_FAILED', message: 'Không thể tạo tin nhắn cuộc gọi', error: error.message });
      }
    });

    // Kiểm tra trạng thái kết nối
    socket.on('ping', () => {
      socket.emit('pong', {
        timestamp: new Date(),
        socketId: socket.id,
        userId: socket.user.id,
      });
    });

    socket.on('handoff:join', ({ handoffToken }) => {
      if (!handoffToken) {
        socket.emit('error', { code: 'INVALID_DATA', message: 'handoffToken là bắt buộc' });
        return;
      }
      socket.join(`handoff:${handoffToken}`);
      socket.emit('handoff:joined', { handoffToken, timestamp: new Date() });
    });

    socket.on('handoff:accept', async ({ handoffToken }) => {
      try {
        if (!handoffToken) {
          socket.emit('error', { code: 'INVALID_DATA', message: 'handoffToken là bắt buộc' });
          return;
        }

        const agentIsNhanVien = await isNhanVien(socket.user.id);
        if (!agentIsNhanVien) {
          socket.emit('error', { code: 'UNAUTHORIZED', message: 'Chỉ nhân viên mới có thể nhận ticket' });
          return;
        }

        const result = await acceptHandoffTicket(handoffToken, socket.user.id);
        socket.emit('handoff:acceptSuccess', result);
      } catch (error) {
        socket.emit('error', { code: 'HANDOFF_ACCEPT_FAILED', message: error.message });
      }
    });

    socket.on('handoff:list', async () => {
      try {
        const agentIsNhanVien = await isNhanVien(socket.user.id);
        if (!agentIsNhanVien) {
          socket.emit('error', { code: 'UNAUTHORIZED', message: 'Chỉ nhân viên mới xem được danh sách ticket' });
          return;
        }

        const tickets = await getPendingTickets();
        socket.emit('handoff:pendingList', { tickets, timestamp: new Date().toISOString() });
      } catch (error) {
        socket.emit('error', { code: 'HANDOFF_LIST_FAILED', message: error.message });
      }
    });

    // Xử lý ngắt kết nối
    socket.on('disconnect', async (reason) => {
      console.log(`🔴 Socket Disconnected: ${socket.id}, User: ${socket.user.id}, Reason: ${reason}`);

      const rooms = userRooms.get(socket.id);
      if (rooms) {
        for (const roomId of rooms) {
          io.to(roomId).emit('userLeft', {
            userId: socket.user.id,
            socketId: socket.id,
            roomId,
            timestamp: new Date(),
          });
        }
        userRooms.delete(socket.id);
      }

      const userSockets = onlineUsers.get(socket.user.id);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(socket.user.id);
          await broadcastUserStatus('offline');
        } else {
          onlineUsers.set(socket.user.id, userSockets);
        }
      }
    });

    // Xử lý lỗi socket
    socket.on('error', (error) => {
      console.error(`❌ Socket Error for ${socket.id}, User: ${socket.user.id}:`, error);
    });
  });

  // Xử lý lỗi kết nối toàn cục
  io.engine.on('connection_error', (err) => {
    console.error('❌ Socket.IO Connection Error:', err);
  });

  console.log('🚀 Socket.IO server configured with enhanced real-time messaging and authentication');
  setIO(io);
  return io;
};

module.exports = { setupSocket };