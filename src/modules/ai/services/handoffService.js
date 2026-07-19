import ChatTicket from '#models/ChatTicket.js';
import PhongChat from '#models/ChatRoom.js';
import TinNhan from '#models/Message.js';
import NguoiDung from '#models/User.js';
import VaiTro from '#models/Role.js';
import ThongBaoChat from '#models/ChatNotification.js';
import { getIO } from '#infra/realtime/ioInstance.js';

/** Các role được coi là "nhân viên hỗ trợ" cho luồng handoff — nhận thông báo ticket,
 * xem/nhận/xử lý ticket. Khớp với ADMIN_PANEL_ROLES / STAFF_NOTIFICATION_ROLES phía frontend. */
const STAFF_ROLE_NAMES = ['admin', 'nhan_vien'];

async function getStaffRoleIds() {
  const roles = await VaiTro.find({ ten: { $in: STAFF_ROLE_NAMES } }).select('_id');
  return roles.map((r) => r._id);
}

async function getActiveStaffUsers() {
  const roleIds = await getStaffRoleIds();
  if (!roleIds.length) return [];

  return NguoiDung.find({
    vaiTro: { $in: roleIds },
    trangThai: 'hoat_dong',
  }).select('ten email tenDangNhap anhDaiDien');
}

async function isStaff(userId) {
  const roleIds = await getStaffRoleIds();
  if (!roleIds.length) return false;

  const user = await NguoiDung.findOne({ _id: userId, vaiTro: { $in: roleIds }, trangThai: 'hoat_dong' });
  return Boolean(user);
}

async function populateTicket(ticket) {
  return ChatTicket.findById(ticket._id)
    .populate('khachHangId', 'ten email tenDangNhap anhDaiDien')
    .populate({
      path: 'nhanVienId',
      select: 'ten email tenDangNhap anhDaiDien vaiTro',
      populate: { path: 'vaiTro', select: 'ten' },
    })
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
  await notifyStaffAboutTicket(populated);

  return { ticket: populated, isNew: true };
}

async function notifyStaffAboutTicket(ticket) {
  const io = getIO();
  const employees = await getActiveStaffUsers();
  const payload = {
    type: 'handoff:newTicket',
    ticket: formatTicketForClient(ticket),
    timestamp: new Date().toISOString(),
  };

  // Chỉ emit 'handoff:newTicket' qua room cá nhân từng nhân viên (đã join lúc connect,
  // xem connectionHandlers.js) — KHÔNG broadcast thêm lần nữa qua room 'staff_online',
  // vì bất kỳ nhân viên nào đang online cũng đã có mặt ở CẢ HAI room cùng lúc, dẫn tới
  // nhận đúng 1 sự kiện nhưng bị gửi/hiện 2 lần trên UI.
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

  console.log(`📣 [Handoff] Notified ${employees.length} nhân viên for ticket ${ticket.handoffToken}`);
}

function formatTicketForClient(ticket) {
  const customerId = ticket.khachHangId?._id || ticket.khachHangId || null;
  const customerName =
    ticket.khachHangId?.ten || ticket.tenKhachHang || 'Khách hàng';

  const agentId = ticket.nhanVienId?._id || ticket.nhanVienId || null;
  const agentInfo = agentId
    ? {
        agentId,
        agentName: ticket.nhanVienId?.ten || 'Nhân viên',
        avatar: ticket.nhanVienId?.anhDaiDien,
        agentRole: ticket.nhanVienId?.vaiTro?.ten || null,
      }
    : null;

  return {
    ticketId: ticket._id,
    handoffToken: ticket.handoffToken,
    sessionId: ticket.sessionId,
    status: ticket.trangThai,
    reason: ticket.lyDo,
    message: ticket.lyDo,
    agentInfo,
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
    .populate({
      path: 'nhanVienId',
      select: 'ten email anhDaiDien vaiTro',
      populate: { path: 'vaiTro', select: 'ten' },
    })
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
          agentRole: ticket.nhanVienId.vaiTro?.ten || null,
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

/** Trả về ticket 'pending' (chờ nhận) + 'active' (đang xử lý bởi ai đó) — để mọi
 * nhân viên/admin online đều nhìn thấy trạng thái "đang xử lý bởi X" thay vì ticket
 * biến mất hoàn toàn khỏi danh sách của người không nhận. Ticket chỉ rời danh sách
 * khi được đánh dấu 'resolved' (xem resolveHandoffTicket). */
async function getPendingTickets(agentId = null) {
  const filter = { trangThai: { $in: ['pending', 'active'] } };
  if (agentId) {
    filter.boQuaBoi = { $nin: [agentId] };
  }

  const tickets = await ChatTicket.find(filter)
    .sort({ createdAt: 1 })
    .populate('khachHangId', 'ten email anhDaiDien')
    .populate({
      path: 'nhanVienId',
      select: 'ten anhDaiDien vaiTro',
      populate: { path: 'vaiTro', select: 'ten' },
    });

  return tickets.map(formatTicketForClient);
}

async function dismissHandoffTicket(handoffToken, agentId) {
  const agentIsStaff = await isStaff(agentId);
  if (!agentIsStaff) {
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
  const agentIsStaff = await isStaff(agentId);
  if (!agentIsStaff) {
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
  const agentIsStaff = await isStaff(agentId);
  if (!agentIsStaff) {
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
  const agent = await NguoiDung.findById(agentId)
    .select('ten anhDaiDien vaiTro')
    .populate('vaiTro', 'ten');

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
    handoffToken,
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
      agentRole: agent.vaiTro?.ten || null,
    },
    timestamp: new Date().toISOString(),
  };

  const populatedTicket = await populateTicket(ticket);

  const io = getIO();
  if (io) {
    io.to(customerId.toString()).emit('handoff:accepted', acceptedPayload);
    io.to(agentId.toString()).emit('handoff:accepted', acceptedPayload);
    io.to(`handoff:${handoffToken}`).emit('handoff:accepted', acceptedPayload);
    // Broadcast cho MỌI staff (kể cả người vừa nhận) — client tự lọc bỏ ticket của
    // chính mình vì đã xử lý qua 'handoff:acceptSuccess'. Staff khác cập nhật ticket
    // sang trạng thái "đang xử lý bởi ..." thay vì ticket biến mất khỏi danh sách.
    io.to('staff_online').emit('handoff:ticketAccepted', {
      ticket: formatTicketForClient(populatedTicket),
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

/** Đánh dấu ticket đã xử lý xong — dọn khỏi danh sách "đang xử lý" của mọi staff.
 * Bất kỳ staff nào (không chỉ người đã nhận) cũng có thể hoàn tất, để tránh ticket
 * bị kẹt mãi nếu người nhận quên đóng. */
async function resolveHandoffTicket(handoffToken, agentId) {
  const agentIsStaff = await isStaff(agentId);
  if (!agentIsStaff) {
    throw new Error('Chỉ nhân viên mới có thể hoàn tất ticket');
  }

  const ticket = await ChatTicket.findOneAndUpdate(
    { handoffToken, trangThai: { $in: ['pending', 'active'] } },
    { $set: { trangThai: 'resolved' } },
    { new: true },
  );

  if (!ticket) {
    throw new Error('Ticket không tồn tại hoặc đã được hoàn tất');
  }

  // Đánh dấu đã hoàn tất trên phòng chat — GIỮ NGUYÊN handoffToken (để UI vẫn
  // biết đây từng là ticket hỗ trợ, hiện nhãn "Đã hoàn tất" thay vì mất dấu vết
  // hoàn toàn), chỉ set thêm mốc thời gian hoàn tất.
  if (ticket.phongChatId) {
    await PhongChat.findByIdAndUpdate(ticket.phongChatId, { handoffResolvedAt: new Date() });
  }

  const io = getIO();
  if (io) {
    io.to('staff_online').emit('handoff:ticketResolved', {
      handoffToken,
      resolvedBy: agentId,
      timestamp: new Date().toISOString(),
    });

    // Báo cho khách qua room cá nhân của họ (mọi socket đã xác thực đều tự join
    // room này lúc connect — xem connectionHandlers.js) — không phụ thuộc socket
    // "chờ nhân viên" cũ, vì socket đó đã bị đóng ngay khi ticket được nhận.
    if (ticket.khachHangId) {
      io.to(ticket.khachHangId.toString()).emit('handoff:resolved', {
        handoffToken,
        roomId: ticket.phongChatId ? ticket.phongChatId.toString() : null,
        timestamp: new Date().toISOString(),
      });
    }
  }

  console.log(`🏁 [Handoff] Ticket ${handoffToken} resolved by ${agentId}`);

  return {
    success: true,
    handoffToken,
    message: 'Đã hoàn tất ticket',
  };
}

export { createHandoffTicket, getHandoffStatus, getPendingTickets, acceptHandoffTicket, getActiveStaffUsers, isStaff, formatTicketForClient, dismissHandoffTicket, dismissAllHandoffNotifications, resolveHandoffTicket, STAFF_ROLE_NAMES };
export default { createHandoffTicket, getHandoffStatus, getPendingTickets, acceptHandoffTicket, getActiveStaffUsers, isStaff, formatTicketForClient, dismissHandoffTicket, dismissAllHandoffNotifications, resolveHandoffTicket, STAFF_ROLE_NAMES };