# Rollout — @Mention · Unread · Reply/Upload · WebRTC ICE

## 1. Deploy BE

1. Push code + deploy Render.
2. (Khuyến nghị production) set TURN:
   ```bash
   WEBRTC_TURN_URLS=turn:…
   WEBRTC_TURN_USERNAME=…
   WEBRTC_TURN_CREDENTIAL=…
   ```
3. Smoke:
   ```bash
   curl -H "Authorization: Bearer $T" "$API/api/webrtc/ice-servers"
   curl -H "Authorization: Bearer $T" "$API/api/notification/unread"
   curl -H "Authorization: Bearer $T" "$API/api/notifications/unread"
   ```

## 2. Verify BE

| Check | Expect |
|-------|--------|
| POST message + `mentions` | field `mentions` populate; noti `loai: mention` |
| Socket reply `phanHoiTinNhan: id` | snapshot `_id/noiDung/nguoiGuiId` |
| GET `/room` | `unreadCount` số |
| GET `/notification/unread` | `{ count, byRoom, data }` |
| GET `/webrtc/ice-servers` | có STUN; có TURN nếu env |

## 3. FE

Làm theo [`FE_CHAT_MENTION_UNREAD_WEBRTC_PROMPT.md`](./FE_CHAT_MENTION_UNREAD_WEBRTC_PROMPT.md).

Thứ tự: unread + reply → upload → typing → @mention → WebRTC ICE.

## 4. File BE chính

- `mentionHelpers.js`, `Message.mentions`, `messageService.createMessage`
- `messageHandlers` → createMessage thật
- `app.js` `req.io = getIO()`
- `notification` unread object + `/notifications` alias + `PUT …/room/:id/read`
- `room` list `unreadCount`
- `webrtc/ice-servers`, `call:invite` kèm ICE

## 5. Liên quan

- Typing/search/add-member: [`FE_CHAT_MEMBER_TYPING_SEARCH_PROMPT.md`](./FE_CHAT_MEMBER_TYPING_SEARCH_PROMPT.md)
- Rollout trước: [`CHAT_MEMBER_TYPING_SEARCH_ROLLOUT.md`](./CHAT_MEMBER_TYPING_SEARCH_ROLLOUT.md)
