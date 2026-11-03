# دليل المشروع — فطار المكتب

## الفكرة
موقع ملف واحد (`docs/index.html`) بيكلّم Firebase مباشرة من المتصفح — مفيش سيرفر. الأمان كله في `firestore.rules`.

## القواعد الثابتة
- **بسيط وسريع:** ملف واحد، بلا build، بلا framework. Firebase SDK v10.12.2 من gstatic.
- **كل واحد يعدّل حاجته بس** — أي ميزة جديدة لازم يتعمل لها قاعدة في `firestore.rules` في نفس التعديل.
- **الحساب ما يضيعش:** أي تغيير في طريقة الحساب يتعمل في `orderCalc` و`ledger` و`contribution` مع بعض.
- **توفير الليمت المجاني:** متضفش listener على مجموعة كبيرة إلا لو لازم؛ البيانات الخاصة بصفحة واحدة (زي الملاحظات) تتسمع وانت فاتحها بس.
- **العربي:** الواجهة باللهجة المصرية وRTL.

## Firebase
- Project: `office-breakfast-c9338` · Firestore location `eur3` · Auth: Email/Password.
- الدومين بتاع GitHub Pages لازم يكون في Authentication ← Settings ← Authorized domains.

## السكيلات
- `skills/office-breakfast-frontend` — الواجهة.
- `skills/office-breakfast-backend` — Firestore والقواعد والبيانات.
