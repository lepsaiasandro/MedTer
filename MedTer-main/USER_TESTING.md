# MedTer — User testing (business meeting)

## Open the app
- **Hosted (share this):** http://medter.runasp.net  
- **Local with latest UI:** http://localhost:5173  
  (frontend talks to the hosted API)

## Demo accounts
Password for all: `pass123`

| Role | Email | Use for |
|------|--------|---------|
| Doctor | `nino@medter.ge` | Browse centers, chat, interest in trainings |
| Doctor | `giorgi@medter.ge` | Second doctor (chat from two sides) |
| Training center | `promed@medter.ge` | Publish / manage announcements |
| Training center | `medlearn@medter.ge` | Second center |
| Admin | `admin@medter.ge` | Approvals dashboard |

## 10-minute test script
1. **Doctor login** → `nino@medter.ge` / `pass123`
2. **Home** → see training centers, open **Details** on one
3. **Announcements** → browse trainings, mark interest if available
4. **Message** a center → send a short chat message
5. **Log out** → register flow OR log in as `promed@medter.ge`
6. **Center** → **My announcements** → create or edit a training
7. (Optional) **Admin** → `admin@medter.ge` → approval queue

## What to ask testers
- Is registration clear for both roles?
- Can they find a relevant training quickly?
- Is messaging a center intuitive?
- What feels missing for day-to-day use?

## Notes
- Language toggle: Georgian / English (top bar)
- Certificates / points are partly mock on the frontend
- Live chat uses SignalR (needs network)
