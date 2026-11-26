# બલર પરિવાર — વંશાવળી વેબસાઇટ

- **`index.html`** — બધા માટે વ્યૂ પેજ: વંશ વૃક્ષ, વંશાવળી, પરિવાર ની યાદી, નામ શોધ
- **`admin.html`** — એડમિન: લૉગિન કરી નામ ઉમેરો / બદલો / કાઢો, દિકરા-દિકરી એક સાથે ઉમેરો, બેકઅપ
- ડેટા **Firebase Firestore** માં, કોડ **GitHub** પર, વેબસાઇટ **GitHub Pages** પર (મફત)

Firebase જોડ્યા વગર પણ બંને પેજ **ડેમો મોડ** માં ચાલે છે (ડેટા ફક્ત એ બ્રાઉઝર માં રહે).

---

## 1. Firebase સેટઅપ (એક જ વાર)

1. <https://console.firebase.google.com> → **Add project** → નામ દા.ત. `balar-parivar` (Google Analytics ની જરૂર નથી).
2. **Build → Firestore Database → Create database** → લોકેશન `asia-south1 (Mumbai)` → **Production mode**.
3. **Firestore → Rules** ટેબ માં આ રિપો ની `firestore.rules` ફાઇલ આખી પેસ્ટ કરી **Publish**.
4. **Build → Authentication → Get started → Sign-in method → Email/Password → Enable**.
5. **Authentication → Users → Add user** → તમારો ઇમેઇલ અને પાસવર્ડ. બન્યા પછી એ લાઇન નો **User UID** કોપી કરો.
6. **Firestore → Data → Start collection** → Collection ID: `admins` → Document ID: **ઉપર કોપી કરેલ UID** → એક field ઉમેરો (દા.ત. `name` = તમારું નામ) → Save.
   બીજા એડમિન ઉમેરવા હોય તો 5-6 ફરી કરો.
7. **Project settings (⚙) → General → Your apps → Web (`</>`)** → એપ નું નામ → Register.
   જે `firebaseConfig` દેખાય એની કિંમતો `assets/js/firebase-config.js` માં મૂકો.

## 2. GitHub પર મૂકો

1. <https://github.com/new> → નવો રિપો (દા.ત. `balar-parivar`). **Public** રાખો તો GitHub Pages મફત છે.
2. આ ફોલ્ડર માં:
   ```bash
   git remote add origin https://github.com/<તમારું-યુઝરનેમ>/balar-parivar.git
   git push -u origin main
   ```
3. રિપો → **Settings → Pages** → Source: **Deploy from a branch** → Branch: `main` / `/ (root)` → Save.
   થોડી મિનિટ માં સાઇટ `https://<યુઝરનેમ>.github.io/balar-parivar/` પર ખુલશે.
4. Firebase → **Authentication → Settings → Authorized domains → Add domain** → `<યુઝરનેમ>.github.io`.

> ફોટા (`*.jpeg`) `.gitignore` માં છે, એટલે GitHub પર નથી જતા.

## 3. પહેલી વાર ડેટા નાખો

1. `https://<યુઝરનેમ>.github.io/balar-parivar/admin.html` ખોલી લૉગિન કરો.
2. **⋯ સાધનો → 🌱 શરૂઆત નો ડેટા નાખો** — ચિત્ર 4, 5, 6, 7 અને જૂના પેજ ના 263 નામ એક ક્લિક માં ઉમેરાશે.
   (આ **એક જ વાર** કરવું, નહીં તો નામ બે વાર થશે.)
3. હવે વ્યૂ પેજ ખોલો — ફેરફાર તરત દેખાશે.

## એડમિન માં કામ

| કામ | કેવી રીતે |
|---|---|
| નામ શોધવું | ડાબી બાજુ શોધ — એક જ નામ ઘણી વાર હોય તો નીચે પિતા/દાદા નું નામ દેખાય |
| નામ / ઉપનામ / નોંધ બદલવી | નામ પસંદ કરો → ફેરફાર → **સાચવો** (અથવા `Ctrl+S`) |
| દિકરા / દિકરી ઉમેરવા | પિતા પસંદ કરો → નીચે બોક્સ માં **એક લીટી માં એક નામ** → ઉમેરો. ઉપનામ કૌંસ માં: `ધ્રુવીત (કાનો)` |
| ક્રમ બદલવો | ↑ ↓ બટન |
| ખોટા પિતા હેઠળ નામ હોય | નામ પસંદ કરો → પિતા **બદલો** → સાચવો (એમના દિકરા પણ સાથે ખસે છે) |
| કાઢી નાખવું | પહેલા એમના દિકરા-દિકરી કાઢો/ખસેડો, પછી **કાઢી નાખો** |
| બેકઅપ | **⋯ સાધનો → બેકઅપ ડાઉનલોડ** — સમયાંતરે કરતા રહો |

**બહેન** અલગ થી નાખવાની જરૂર નથી — પિતા ની દિકરીઓ જ આપમેળે બહેન તરીકે દેખાય છે.

## ફાઇલો

```
index.html               વ્યૂ પેજ
admin.html               એડમિન પેજ
assets/css/app.css       ડિઝાઇન (લાઇટ + ડાર્ક, મોબાઇલ)
assets/js/firebase-config.js   Firebase સેટિંગ ← અહીં તમારી કિંમતો
assets/js/core.js        ડેટાબેઝ, લૉગિન, પરિવાર ગણતરી
assets/js/view.js        વ્યૂ પેજ નો કોડ
assets/js/admin.js       એડમિન નો કોડ
assets/js/seed.js        શરૂઆત નો ડેટા
firestore.rules          ડેટાબેઝ સુરક્ષા નિયમો
```

ડેટા નું માળખું (`people` કલેક્શન, દરેક વ્યક્તિ એક ડોક્યુમેન્ટ):
`name, alias, gender ('m'/'f'), fatherId, order, note, uncertain, pinned`
