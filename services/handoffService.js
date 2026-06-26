import ChatTicket from '../models/ChatTicket.js';
import PhongChat from '../models/ChatRoom.js';
import TinNhan from '../models/Message.js';
import NguoiDung from '../models/User.js';
import VaiTro from '../models/Role.js';
import ThongBaoChat from '../models/ChatNotification.js';
import { getIO } from '../socket/ioInstance.js';

async function getNhanVienRoleId() {
  const role = await VaiTro.findOne({ ten: 'nhan_vien' });
  return role?._id || null;
}

async function getActiveNhanVienUsers() {
  const roleId = await getNhanVienRoleId();
  if (!roleId) return [];

  return NguoiDung.find({
    vaiTro: roleId,
    trangThai: 'hoat_dong',
  }).select('ten email tenDangNhap anhDaiDien');
}

async function isNhanVien(userId) {
  const roleId = await getNhanVienRoleId();
  if (!roleId) return false;

  const user = await NguoiDung.findOne({ _id: userId, vaiTro: roleId, trangThai: 'hoat_dong' });
  return Boolean(user);
}

async function populateTicket(ticket) {
  return ChatTicket.findById(ticket._id)
    .populate('khachHangId', 'ten email tenDangNhap anhDaiDien')
    .populate('nhanVienId', 'ten email tenDangNhap anhDaiDien')
    .populate('phongChatId', 'tenPhong loaiPhong');
}

async function createHandoffTicket({ sessionId, userId, reason, conversationHistory = [], customerName }) {
  const existing = await ChatTicket.findOne({ sessionId, trangThai: 'pending' });
  if (existing) {
    const populated = await populateTicket(existing);
    return { ticket: populated, isNew: false };
  }

  let tenKhachHang = customerName || 'Khách hàng';
  if (userId) {
    const customer = await NguoiDung.findById(userId).select('ten');
    if (customer?.ten) tenKhachHang = customer.ten;
  }

  const handoffToken = `handoff_${sessionId}_${Date.now()}`;
  const ticket = await ChatTicket.create({
    sessionId,
    handoffToken,
    khachHangId: userId || null,
    tenKhachHang,
    lyDo: reason || 'AI chuyển nhân viên',
    lichSuChat: (conversationHistory || []).map((item) => ({
      role: item.role === 'ai' ? 'ai' : 'user',
      message: item.message || item.content || '',
      timestamp: item.timestamp ? new Date(item.timestamp) : new Date(),
    })),
    trangThai: 'pending',
  });

  const populated = await populateTicket(ticket);
  await notifyNhanVienAboutTicket(populated);

  return { ticket: populated, isNew: true };
}

async function notifyNhanVienAboutTicket(ticket) {
  const io = getIO();
  const employees = await getActiveNhanVienUsers();
  const payload = {
    type: 'handoff:newTicket',
    ticket: formatTicketForClient(ticket),
    timestamp: new Date().toISOString(),
  };

  for (const employee of employees) {
    const notification = await ThongBaoChat.create({
      nguoiNhan: employee._id,
      loai: 'handoff_ticket',
      noiDung: `${ticket.tenKhachHang} cần hỗ trợ: ${ticket.lyDo}`,
      handoffToken: ticket.handoffToken,
      ticketId: ticket._id,
      daDoc: false,
    });

    const populatedNotification = await ThongBaoChat.findById(notification._id)
      .populate('nguoiNhan', 'ten anhDaiDien')
      .populate('ticketId');

    if (io) {
      io.to(employee._id.toString()).emit('newNotification', populatedNotification);
      io.to(employee._id.toString()).emit('handoff:newTicket', payload);
    }
  }

  if (io) {
    io.to('nhan_vien_online').emit('handoff:newTicket', payload);
  }

  console.log(`📣 [Handoff] Notified ${employees.length} nhân viên for ticket ${ticket.handoffToken}`);
}

function formatTicketForClient(ticket) {
  const customerId = ticket.khachHangId?._id || ticket.khachHangId || null;
  const customerName =
    ticket.khachHangId?.ten || ticket.tenKhachHang || 'Khách hàng';

  return {
    ticketId: ticket._id,
    handoffToken: ticket.handoffToken,
    sessionId: ticket.sessionId,
    status: ticket.trangThai,
    reason: ticket.lyDo,
    message: ticket.lyDo,
    userId: customerId
      ? {
          _id: customerId,
          ten: customerName,
          email: ticket.khachHangId?.email,
          anhDaiDien: ticket.khachHangId?.anhDaiDien,
        }
      : { name: ticket.tenKhachHang },
    customer: customerId
      ? {
          id: customerId,
          name: customerName,
          email: ticket.khachHangId?.email,
          avatar: ticket.khachHangId?.anhDaiDien,
        }
      : { name: ticket.tenKhachHang },
    conversationHistory: ticket.lichSuChat,
    createdAt: ticket.createdAt,
  };
}

async function getHandoffStatus(handoffToken) {
  const ticket = await ChatTicket.findOne({ handoffToken })
    .populate('khachHangId', 'ten email anhDaiDien')
    .populate('nhanVienId', 'ten email anhDaiDien')
    .populate('phongChatId', 'tenPhong loaiPhong');

  if (!ticket) {
    return null;
  }

  const pendingCount = await ChatTicket.countDocuments({ trangThai: 'pending' });

  return {
    success: true,
    handoffToken: ticket.handoffToken,
    sessionId: ticket.sessionId,
    status: ticket.trangThai,
    reason: ticket.lyDo,
    agentInfo: ticket.nhanVienId
      ? {
          agentId: ticket.nhanVienId._id,
          agentName: ticket.nhanVienId.ten,
          avatar: ticket.nhanVienId.anhDaiDien,
        }
      : null,
    roomId: ticket.phongChatId?._id || ticket.phongChatId || null,
    room: ticket.phongChatId
      ? {
          _id: ticket.phongChatId._id || ticket.phongChatId,
          tenPhong: ticket.phongChatId.tenPhong,
          loaiPhong: ticket.phongChatId.loaiPhong,
        }
      : null,
    queuePosition: ticket.trangThai === 'pending' ? pendingCount : 0,
    estimatedWaitTime: ticket.trangThai === 'pending' ? '1-3 phút' : null,
    timestamp: new Date().toISOString(),
  };
}

async function getPendingTickets(agentId = null) {
  const filter = { trangThai: 'pending' };
  if (agentId) {
    filter.boQuaBoi = { $nin: [agentId] };
  }

  const tickets = await ChatTicket.find(filter)
    .sort({ createdAt: 1 })
    .populate('khachHangId', 'ten email anhDaiDien');

  return tickets.map(formatTicketForClient);
}

async function dismissHandoffTicket(handoffToken, agentId) {
  const agentIsNhanVienUser = await isNhanVien(agentId);
  if (!agentIsNhanVienUser) {
    throw new Error('Chỉ nhân viên mới có thể xóa thông báo');
  }

  const ticket = await ChatTicket.findOne({ handoffToken, trangThai: 'pending' });
  if (ticket) {
    const alreadyDismissed = (ticket.boQuaBoi || []).some(
      (id) => id.toString() === agentId.toString(),
    );
    if (!alreadyDismissed) {
      ticket.boQuaBoi = [...(ticket.boQuaBoi || []), agentId];
      await ticket.save();
    }
  }

  const deletedNotification = await ThongBaoChat.findOneAndDelete({
    handoffToken,
    nguoiNhan: agentId,
    loai: 'handoff_ticket',
  });

  const io = getIO();
  if (io) {
    io.to(agentId.toString()).emit('handoff:notificationRemoved', {
      handoffToken,
      notificationId: deletedNotification?._id,
      timestamp: new Date().toISOString(),
    });
  }

  return {
    success: true,
    handoffToken,
    message: 'Đã xóa thông báo',
  };
}

async function dismissAllHandoffNotifications(agentId) {
  const agentIsNhanVienUser = await isNhanVien(agentId);
  if (!agentIsNhanVienUser) {
    throw new Error('Chỉ nhân viên mới có thể xóa thông báo');
  }

  const pendingTickets = await ChatTicket.find({ trangThai: 'pending' });
  for (const ticket of pendingTickets) {
    const alreadyDismissed = (ticket.boQuaBoi || []).some(
      (id) => id.toString() === agentId.toString(),
    );
    if (!alreadyDismissed) {
      ticket.boQuaBoi = [...(ticket.boQuaBoi || []), agentId];
      await ticket.save();
    }
  }

  const deleted = await ThongBaoChat.deleteMany({ nguoiNhan: agentId });

  const io = getIO();
  if (io) {
    io.to(agentId.toString()).emit('handoff:allDismissed', {
      timestamp: new Date().toISOString(),
    });
  }

  return {
    success: true,
    dismissedTicketCount: pendingTickets.length,
    deletedNotificationCount: deleted.deletedCount,
    message: 'Đã xóa tất cả thông báo',
  };
}

async function acceptHandoffTicket(handoffToken, agentId) {
  const agentIsNhanVien = await isNhanVien(agentId);
  if (!agentIsNhanVien) {
    throw new Error('Chỉ nhân viên mới có thể nhận ticket');
  }

  const ticket = await ChatTicket.findOneAndUpdate(
    { handoffToken, trangThai: 'pending' },
    { $set: { trangThai: 'active', nhanVienId: agentId } },
    { new: true }
  )
    .populate('khachHangId', 'ten email anhDaiDien');

  if (!ticket) {
    throw new Error('Ticket không tồn tại hoặc đã được nhân viên khác nhận');
  }

  if (!ticket.khachHangId) {
    await ChatTicket.findByIdAndUpdate(ticket._id, { trangThai: 'pending', nhanVienId: null });
    throw new Error('Ticket thiếu thông tin khách hàng. Khách cần đăng nhập để chat với nhân viên.');
  }

  const customerId = ticket.khachHangId._id || ticket.khachHangId;
  const agent = await NguoiDung.findById(agentId).select('ten anhDaiDien');

  const room = await PhongChat.create({
    tenPhong: `Hỗ trợ ${ticket.tenKhachHang}`,
    loaiPhong: 'private',
    thanhVien: [
      { nguoiDung: customerId, vaiTro: 'member', trangThai: 'active' },
      { nguoiDung: agentId, vaiTro: 'admin', trangThai: 'active' },
    ],
    nguoiTao: agentId,
    tinNhan: [],
    tinNhanGhim: [],
  });

  const seededMessageIds = [];

  for (const item of ticket.lichSuChat || []) {
    const text = (item.message || '').trim();
    if (!text) continue;

    const isUser = item.role === 'user';
    const historyMessage = await TinNhan.create({
      roomId: room._id,
      nguoiGuiId: isUser ? customerId : agentId,
      noiDung: isUser ? text : `[Trợ lý AI] ${text}`,
      loaiTinNhan: isUser ? 'text' : 'system',
      daDoc: [customerId, agentId],
      trangThai: 'sent',
    });
    seededMessageIds.push(historyMessage._id);
  }

  const lyDoText = (ticket.lyDo || '').trim();
  const lastUserHistory = [...(ticket.lichSuChat || [])]
    .reverse()
    .find((item) => item.role === 'user' && (item.message || '').trim());

  if (lyDoText && (!lastUserHistory || lastUserHistory.message.trim() !== lyDoText)) {
    const customerMessage = await TinNhan.create({
      roomId: room._id,
      nguoiGuiId: customerId,
      noiDung: lyDoText,
      loaiTinNhan: 'text',
      daDoc: [customerId, agentId],
      trangThai: 'sent',
    });
    seededMessageIds.push(customerMessage._id);
  }

  const systemMessage = await TinNhan.create({
    roomId: room._id,
    nguoiGuiId: agentId,
    noiDung: `Nhân viên ${agent.ten} đã tham gia hỗ trợ.${lyDoText ? ` Yêu cầu: ${lyDoText}` : ''}`,
    loaiTinNhan: 'system',
    daDoc: [customerId, agentId],
    trangThai: 'sent',
  });
  seededMessageIds.push(systemMessage._id);

  await PhongChat.findByIdAndUpdate(room._id, {
    $push: { tinNhan: { $each: seededMessageIds } },
    tinNhanCuoi: systemMessage._id,
  });

  await ChatTicket.findByIdAndUpdate(ticket._id, { phongChatId: room._id });

  await clearHandoffNotifications(handoffToken, agentId);

  const populatedRoom = await PhongChat.findById(room._id)
    .populate('thanhVien.nguoiDung', 'ten anhDaiDien email')
    .populate('nguoiTao', 'ten anhDaiDien')
    .populate('tinNhanCuoi');

  const acceptedPayload = {
    type: 'handoff:accepted',
    handoffToken,
    sessionId: ticket.sessionId,
    room: populatedRoom,
    agentInfo: {
      agentId,
      agentName: agent.ten,
      avatar: agent.anhDaiDien,
    },
    timestamp: new Date().toISOString(),
  };

  const io = getIO();
  if (io) {
    io.to(customerId.toString()).emit('handoff:accepted', acceptedPayload);
    io.to(agentId.toString()).emit('handoff:accepted', acceptedPayload);
    io.to(`handoff:${handoffToken}`).emit('handoff:accepted', acceptedPayload);
    io.to('nhan_vien_online').emit('handoff:ticketRemoved', {
      handoffToken,
      acceptedBy: agentId,
      timestamp: new Date().toISOString(),
    });
  }

  console.log(`✅ [Handoff] ${agent.ten} accepted ticket ${handoffToken}, room ${room._id}`);

  return {
    success: true,
    handoffToken,
    sessionId: ticket.sessionId,
    status: 'active',
    room: populatedRoom,
    agentInfo: acceptedPayload.agentInfo,
    message: 'Đã kết nối khách hàng thành công',
    timestamp: new Date().toISOString(),
  };
}

async function clearHandoffNotifications(handoffToken, acceptedByAgentId) {
  const notifications = await ThongBaoChat.find({ handoffToken, loai: 'handoff_ticket' });
  const io = getIO();

  for (const notification of notifications) {
    const recipientId = notification.nguoiNhan.toString();

    if (recipientId !== acceptedByAgentId.toString()) {
      await ThongBaoChat.findByIdAndDelete(notification._id);
      if (io) {
        io.to(recipientId).emit('handoff:notificationRemoved', {
          notificationId: notification._id,
          handoffToken,
        });
      }
    } else {
      notification.daDoc = true;
      notification.noiDung = 'Bạn đã nhận ticket này';
      await notification.save();
    }
  }
}

export { createHandoffTicket, getHandoffStatus, getPendingTickets, acceptHandoffTicket, getActiveNhanVienUsers, isNhanVien, formatTicketForClient, dismissHandoffTicket, dismissAllHandoffNotifications };
export default { createHandoffTicket, getHandoffStatus, getPendingTickets, acceptHandoffTicket, getActiveNhanVienUsers, isNhanVien, formatTicketForClient, dismissHandoffTicket, dismissAllHandoffNotifications };