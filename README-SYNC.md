# 🔄 Bolt.new → Lokaal Project Sync

Deze backup bevat alle wijzigingen van je Bolt.new sessie.

## 🚀 Snelle Start (Automatisch)

### Windows PowerShell:

1. **Download** `bolt-project-sync-XXXXXXXX.tar.gz`
2. **Unzip** met 7-Zip of WinRAR
3. **Open PowerShell** in de unzipped folder
4. **Run**:
   ```powershell
   .\install.ps1
   ```

Het script doet automatisch:
- ✅ Backup maken van huidige project
- ✅ Files kopieren
- ✅ `npm install`
- ✅ `npm run build`
- ✅ Validatie

### Handmatig:

Zie `INSTALL.md` in de backup folder.

## 📦 Wat zit er in deze backup?

### Nieuwe Features:
- ✨ **GPT Management** - OpenAI API configuratie voor operators
- ✨ **User Activity Dashboard** - Real-time gebruikersmonitoring
- ✨ **Verbeterde Operator Dashboard** - Alle nieuwe features geïntegreerd

### Files:
```
backup-2025-10-03T11-25-59-301Z/
├── install.ps1              # Automatisch installatie script
├── INSTALL.md               # Handmatige instructies
├── backup-info.json         # Metadata
├── src/
│   ├── components/
│   │   └── Operator/
│   │       ├── GPTManagement.tsx        ✨ NIEUW
│   │       ├── UserActivity.tsx         ✨ NIEUW
│   │       ├── OperatorDashboard.tsx    🔧 UPDATED
│   │       ├── SystemHealth.tsx         🔧 UPDATED
│   │       └── UsageMonitoring.tsx      🔧 UPDATED
│   ├── contexts/
│   ├── lib/
│   └── types/
├── supabase/
│   ├── functions/                       🔧 ALL UPDATED
│   └── migrations/
└── [config files]
```

## ⚡ Snel Synchroniseren

Als je later weer wijzigingen van Bolt.new wilt syncen:

```powershell
# In je Bolt.new omgeving:
node backup-project.cjs

# Download de nieuwe backup en run:
.\install.ps1
```

## 🔧 Troubleshooting

### Build errors na sync?
```powershell
cd C:\Users\info\project
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Git conflicts?
```powershell
# Check wat er veranderd is
git status
git diff

# Als je alle wijzigingen wilt behouden:
git add .
git commit -m "Sync from Bolt.new"
```

### Vercel deployment faalt?
1. Check build logs in Vercel dashboard
2. Test lokaal eerst: `npm run build`
3. Check `.env` variabelen in Vercel settings

## 📝 Workflow

```
Bolt.new ──┐
           │
           ├──→ node backup-project.cjs
           │
           └──→ Download backup
                     │
                     ├──→ .\install.ps1
                     │
                     └──→ git push
                              │
                              └──→ Vercel Auto-Deploy ✨
```

## 🎯 Best Practices

1. **Commit eerst** je huidige lokale changes voordat je synct
2. **Test lokaal** met `npm run dev` na sync
3. **Build check** met `npm run build` voordat je pusht
4. **Review changes** met `git diff` voordat je commit

## 💡 Tips

- Gebruik `git stash` om lokale changes tijdelijk op te slaan
- Maak een branch voor grote wijzigingen: `git checkout -b bolt-sync`
- Test de nieuwe features op Vercel preview URL voordat je naar production pushed

## 📞 Hulp Nodig?

Check deze files:
- `INSTALL.md` - Gedetailleerde installatie instructies
- `backup-info.json` - Metadata over de backup

Of vraag in Bolt.new chat!
