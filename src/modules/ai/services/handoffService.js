import ChatTicket from '#models/ChatTicket.js';
import PhongChat from '#models/ChatRoom.js';
import TinNhan from '#models/Message.js';
import NguoiDung from '#models/User.js';
import VaiTro from '#models/Role.js';
import ThongBaoChat from '#models/ChatNotification.js';
import { getIO } from '#infra/realtime/ioInstance.js';

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

/** Vai trò được coi là "admin" — chỉ nhóm này mới được hủy hẳn 1 ticket (khác
 * với "xóa/hủy" thông thường của isStaff, vốn chỉ ẩn khỏi danh sách riêng của
 * người bấm). Khớp ADMIN_PANEL role check phía #shared/middleware/auth.js. */
const ADMIN_ROLE_NAMES = ['admin', 'quan_tri_vien'];

async function isAdmin(userId) {
  const roles = await VaiTro.find({ ten: { $in: ADMIN_ROLE_NAMES } }).select('_id');
  if (!roles.length) return false;

  const user = await NguoiDung.findOne({
    _id: userId,
    vaiTro: { $in: roles.map((r) => r._id) },
    trangThai: 'hoat_dong',
  });
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
<<<<<<< HEAD

=======
    // Có phòng chat hay chưa — ticket 'resolved' hoặc bị admin hủy lúc đang active
    // đều có phòng (mở lại được, kiểu group). Ticket bị KHÁCH hủy lúc còn 'pending'
    // thì không (chỉ xem, không mở lại được — xem reopenHandoffTicket).
>>>>>>> 1275f41 (feat: implement AI-to-human handoff system with real-time socket notification and ticket management services)
    hasRoom: Boolean(ticket.phongChatId),
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

<<<<<<< HEAD
=======
/** Admin — toàn bộ ticket mọi trạng thái (kể cả resolved/cancelled/timeout), dùng
 * cho trang "Quản lý yêu cầu". Khác getPendingTickets (chỉ pending+active, dùng
 * cho chuông thông báo hàng ngày) — ở đây cần thấy hết để quản lý/mở lại/xóa. */
>>>>>>> 1275f41 (feat: implement AI-to-human handoff system with real-time socket notification and ticket management services)
async function getAllTickets() {
  const tickets = await ChatTicket.find({})
    .sort({ createdAt: -1 })
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
    ticket: formatTicketForClient(populatedTicket),
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

/** Hủy hẳn ticket — CHỈ admin. Khác với dismissHandoffTicket (ẩn khỏi danh sách
 * riêng của 1 nhân viên, người khác vẫn nhận được bình thường): cancel dọn ticket
 * khỏi danh sách của MỌI staff và báo cho khách hàng biết ticket đã bị hủy. */
async function cancelHandoffTicket(handoffToken, adminId) {
  const requesterIsAdmin = await isAdmin(adminId);
  if (!requesterIsAdmin) {
    throw new Error('Chỉ admin mới có thể hủy ticket');
  }

  const ticket = await ChatTicket.findOneAndUpdate(
    { handoffToken, trangThai: { $in: ['pending', 'active'] } },
    { $set: { trangThai: 'cancelled' } },
    { new: true },
  );

  if (!ticket) {
    throw new Error('Ticket không tồn tại hoặc đã được xử lý');
  }

  const io = getIO();

  // Ticket đã có phòng chat (nhân viên nào đó đã nhận) — báo cho cả 2 phía ngay
  // trong phòng bằng tin nhắn hệ thống, và đóng ticket lại như khi "Hoàn tất".
  if (ticket.phongChatId) {
    const systemMessage = await TinNhan.create({
      roomId: ticket.phongChatId,
      nguoiGuiId: adminId,
      noiDung: 'Ticket này đã bị quản trị viên hủy.',
      loaiTinNhan: 'system',
      daDoc: [adminId],
      trangThai: 'sent',
    });

    await PhongChat.findByIdAndUpdate(ticket.phongChatId, {
      $push: { tinNhan: systemMessage._id },
      tinNhanCuoi: systemMessage._id,
      handoffResolvedAt: new Date(),
    });

    if (io) {
      const populatedMessage = await TinNhan.findById(systemMessage._id).populate('nguoiGuiId', 'ten anhDaiDien');
      io.to(ticket.phongChatId.toString()).emit('message:new', populatedMessage);
    }
  }

  if (io) {
    io.to('staff_online').emit('handoff:ticketCancelled', {
      handoffToken,
      cancelledBy: adminId,
      timestamp: new Date().toISOString(),
    });

    // Khách đang chờ (chưa ai nhận) chỉ nghe được qua room cá nhân — nếu ticket
    // đã có phòng chat thì họ cũng nhận tin nhắn hệ thống ở trên rồi.
    if (ticket.khachHangId) {
      io.to(ticket.khachHangId.toString()).emit('handoff:cancelled', {
        handoffToken,
        message: 'Ticket của bạn đã bị hủy.',
        timestamp: new Date().toISOString(),
      });
    }
  }

  console.log(`🚫 [Handoff] Ticket ${handoffToken} cancelled by admin ${adminId}`);

  return {
    success: true,
    handoffToken,
    message: 'Đã hủy ticket',
  };
}

/** Khách tự hủy yêu cầu hỗ trợ của CHÍNH MÌNH khi còn đang chờ (chưa ai nhận —
 * chưa có phòng chat). Khác cancelHandoffTicket (admin, hủy được bất kỳ ticket
 * nào kể cả đã có phòng chat): ở đây chỉ cho hủy ticket 'pending' và phải đúng
 * chủ ticket, vì mục đích là khách bấm "Xóa lịch sử" trong lúc đang chờ nhân
 * viên nhận — không áp dụng khi đã vào phòng chat với nhân viên (lúc đó nút
 * "Xóa lịch sử" đã bị ẩn phía client). */
async function cancelHandoffTicketByGuest(handoffToken, userId) {
  const ticket = await ChatTicket.findOneAndUpdate(
    { handoffToken, trangThai: 'pending', khachHangId: userId },
    { $set: { trangThai: 'cancelled' } },
    { new: true },
  );

  if (!ticket) {
    throw new Error('Ticket không tồn tại hoặc không thể hủy');
  }

  const io = getIO();
  if (io) {
    io.to('staff_online').emit('handoff:ticketCancelledByGuest', {
      handoffToken,
      timestamp: new Date().toISOString(),
    });
  }

  console.log(`🚫 [Handoff] Ticket ${handoffToken} cancelled by guest ${userId}`);

  return {
    success: true,
    handoffToken,
    message: 'Đã hủy yêu cầu hỗ trợ',
  };
}

/** Admin — mở lại ticket đã 'resolved' hoặc bị hủy LÚC ĐÃ CÓ PHÒNG CHAT (đã từng
 * được nhận, khác ticket bị khách hủy lúc còn 'pending' — loại đó không có
 * phongChatId nên không mở lại được ở đây, khách phải tạo yêu cầu mới). Mở lại
 * không trả về đúng nhân viên cũ mà đưa ADMIN vào làm người phụ trách chính,
 * đồng thời GIỮ nhân viên cũ trong phòng — phòng chuyển thành group 3 người
 * (khách + nhân viên cũ + admin) để cả 2 cùng theo dõi/xử lý tiếp. */
async function reopenHandoffTicket(handoffToken, adminId) {
  const requesterIsAdmin = await isAdmin(adminId);
  if (!requesterIsAdmin) {
    throw new Error('Chỉ admin mới có thể mở lại ticket');
  }

  const ticket = await ChatTicket.findOne({
    handoffToken,
    trangThai: { $in: ['resolved', 'cancelled'] },
    phongChatId: { $ne: null },
  });

  if (!ticket) {
    throw new Error('Ticket này không có phòng chat để mở lại');
  }

  const oldAgentId = ticket.nhanVienId ? ticket.nhanVienId.toString() : null;

  const room = await PhongChat.findById(ticket.phongChatId);
  if (!room) {
    throw new Error('Không tìm thấy phòng chat của ticket này');
  }

  const admin = await NguoiDung.findById(adminId).select('ten anhDaiDien');

  const alreadyMember = room.thanhVien.some((m) => m.nguoiDung.toString() === adminId.toString());
  if (!alreadyMember) {
    room.thanhVien.push({ nguoiDung: adminId, vaiTro: 'admin', trangThai: 'active' });
  } else {
    const member = room.thanhVien.find((m) => m.nguoiDung.toString() === adminId.toString());
    member.trangThai = 'active';
  }
  room.loaiPhong = 'group';
  if (!room.tenPhong) {
    room.tenPhong = `Hỗ trợ ${ticket.tenKhachHang}`;
  }
  room.handoffResolvedAt = null;
  await room.save();

  await ChatTicket.findByIdAndUpdate(ticket._id, {
    trangThai: 'active',
    nhanVienId: adminId,
  });

  const systemMessage = await TinNhan.create({
    roomId: room._id,
    nguoiGuiId: adminId,
    noiDung: `Admin ${admin?.ten || ''} đã mở lại yêu cầu hỗ trợ này.`.trim(),
    loaiTinNhan: 'system',
    daDoc: [adminId],
    trangThai: 'sent',
  });

  await PhongChat.findByIdAndUpdate(room._id, {
    $push: { tinNhan: systemMessage._id },
    tinNhanCuoi: systemMessage._id,
  });

  const io = getIO();
  if (io) {
    const populatedMessage = await TinNhan.findById(systemMessage._id).populate('nguoiGuiId', 'ten anhDaiDien');
    io.to(room._id.toString()).emit('message:new', populatedMessage);

    const populatedTicket = await populateTicket(await ChatTicket.findById(ticket._id));
    io.to('staff_online').emit('handoff:ticketReopened', {
      ticket: formatTicketForClient(populatedTicket),
      timestamp: new Date().toISOString(),
    });

    if (oldAgentId) {
      io.to(oldAgentId).emit('handoff:ticketReopened', {
        ticket: formatTicketForClient(populatedTicket),
        timestamp: new Date().toISOString(),
      });
    }
  }

  console.log(`🔓 [Handoff] Ticket ${handoffToken} reopened by admin ${adminId}`);

  return {
    success: true,
    handoffToken,
    message: 'Đã mở lại yêu cầu hỗ trợ',
  };
}

/** Admin — xóa vĩnh viễn bản ghi ticket (không hoàn tác). Phòng chat + tin nhắn
 * liên quan (nếu có) được GIỮ NGUYÊN — chỉ gỡ handoffToken/handoffResolvedAt
 * khỏi phòng để phòng trở về thành cuộc trò chuyện thường, không còn hiện badge
 * "Yêu cầu hỗ trợ" hay nút "Hoàn tất" tham chiếu tới 1 ticket không còn tồn tại. */
async function deleteHandoffTicket(handoffToken, adminId) {
  const requesterIsAdmin = await isAdmin(adminId);
  if (!requesterIsAdmin) {
    throw new Error('Chỉ admin mới có thể xóa ticket');
  }

  const ticket = await ChatTicket.findOne({ handoffToken });
  if (!ticket) {
    throw new Error('Ticket không tồn tại');
  }

  if (ticket.phongChatId) {
    await PhongChat.findByIdAndUpdate(ticket.phongChatId, {
      handoffToken: null,
      handoffResolvedAt: null,
    });
  }

  await ChatTicket.deleteOne({ handoffToken });

  console.log(`🗑️ [Handoff] Ticket ${handoffToken} deleted by admin ${adminId}`);

  return {
    success: true,
    handoffToken,
    message: 'Đã xóa ticket',
  };
}

export { createHandoffTicket, getHandoffStatus, getPendingTickets, getAllTickets, acceptHandoffTicket, getActiveStaffUsers, isStaff, isAdmin, formatTicketForClient, dismissHandoffTicket, dismissAllHandoffNotifications, resolveHandoffTicket, cancelHandoffTicket, cancelHandoffTicketByGuest, reopenHandoffTicket, deleteHandoffTicket, STAFF_ROLE_NAMES };
<<<<<<< HEAD
export default { createHandoffTicket, getHandoffStatus, getPendingTickets, getAllTickets, acceptHandoffTicket, getActiveStaffUsers, isStaff, isAdmin, formatTicketForClient, dismissHandoffTicket, dismissAllHandoffNotifications, resolveHandoffTicket, cancelHandoffTicket, cancelHandoffTicketByGuest, reopenHandoffTicket, deleteHandoffTicket, STAFF_ROLE_NAMES };
=======
export default { createHandoffTicket, getHandoffStatus, getPendingTickets, getAllTickets, acceptHandoffTicket, getActiveStaffUsers, isStaff, isAdmin, formatTicketForClient, dismissHandoffTicket, dismissAllHandoffNotifications, resolveHandoffTicket, cancelHandoffTicket, cancelHandoffTicketByGuest, reopenHandoffTicket, deleteHandoffTicket, STAFF_ROLE_NAMES };
>>>>>>> 1275f41 (feat: implement AI-to-human handoff system with real-time socket notification and ticket management services)
