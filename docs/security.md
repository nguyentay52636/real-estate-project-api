# Đã vá (shipped)

Lộ trình: [SECURITY_IMPROVEMENT_ROADMAP.md](./SECURITY_IMPROVEMENT_ROADMAP.md)

## Code đã xong

- Early: favorite, avatar, user privacy, viewings, auth RL  
- P1: helmet, swagger, role, JWT TTL, SESSION_SECRET, json limit  
- AI RL + `human/send` staff  
- OAuth `code` + `/oauth/exchange`  
- Global / upload / contact RL  
- **Chat room IDOR** (membership, bỏ body.userId spoof)

## Còn lại (ops / P2)

- Phase 0: rotate secrets, Cloudinary create, Render env  
- Phase 3 ops: Cloudflare + load test — [CLOUDFLARE_SETUP.md](./CLOUDFLARE_SETUP.md)  
- Phase 4: cookie access token, audit log, Redis RL store  

## Prompt FE

- [FE_OAUTH_EXCHANGE_PROMPT.md](./FE_OAUTH_EXCHANGE_PROMPT.md)  
- [FE_CHAT_ROOM_IDOR_PROMPT.md](./FE_CHAT_ROOM_IDOR_PROMPT.md)  
- [FE_AUTH_COOKIE_PROMPT.md](./FE_AUTH_COOKIE_PROMPT.md)  
- [FE_CHAT_GROUP_DISBAND_PROMPT.md](./FE_CHAT_GROUP_DISBAND_PROMPT.md)  
- [FE_CHAT_MEMBER_TYPING_SEARCH_PROMPT.md](./FE_CHAT_MEMBER_TYPING_SEARCH_PROMPT.md)  
- [CHAT_MEMBER_TYPING_SEARCH_ROLLOUT.md](./CHAT_MEMBER_TYPING_SEARCH_ROLLOUT.md) — các bước triển khai  
