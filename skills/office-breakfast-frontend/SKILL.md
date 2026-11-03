---
name: office-breakfast-frontend
description: تعديل أو إضافة شاشة أو زرار أو ميزة في واجهة موقع «فطار المكتب» (docs/index.html) — الطلبيات، الحساب، التحويلات، المنيوهات، الأزرار السريعة.
---

# الفرونت — فطار المكتب

## الهيكل
كل الكود في `docs/index.html`: CSS فوق (tokens على `:root` + dark mode) ثم `<script type="module">`.

| الجزء | الدور |
|---|---|
| `S` | الحالة كلها (users, orders, items, transfers, rests, admins, carry, notes) |
| `startListeners()` | onSnapshot لكل مجموعة ← يملأ `S` ← `render()` |
| `doRender()` | يقرا `location.hash` (`#home`, `#order/<id>`, `#history`, `#money`, `#transfers`, `#menus`, `#profile`) وينادي `vXxx()` |
| `vXxx()` | دوال بترجّع HTML string — **بلا state جوّاها** |
| `A = {…}` | كل الأوامر؛ أي عنصر فيه `data-act="name" data-id data-x` بينادي `A.name(id, x)` |
| `modal(title, body, onSubmit)` | أي فورم يتعمل في نافذة — علشان إعادة الرسم ما تمسحش اللي بيتكتب |

## قواعد
1. **أي input يتكتب فيه يبقى في modal** — الصفحات بتترسم من أول مع كل تحديث realtime. الاستثناء الوحيد: حقل بحث بـ `id` (بيرجع له الفوكس تلقائيًا).
2. أي نص من المستخدم يعدّي على `esc()` قبل ما يدخل HTML.
3. الفلوس بـ `money()` والتقريب بـ `r2()`.
4. التواريخ: `day` نص `YYYY-MM-DD` محلي (`todayStr` / `yesterdayStr`)، والأوقات من `createdAt` بـ `timeOf`.
5. الواجهة عربي مصري، RTL، تشتغل على الموبايل (عرض 360px) من غير scroll أفقي.
6. ميزة جديدة = `vXxx` أو جزء فيها + أمر في `A` + (لو بتكتب بيانات) قاعدة في `firestore.rules` ← شوف سكيل الباك.

## التجربة
- `node --check` على السكريبت بعد استخراجه للتأكد من الـsyntax.
- افتح الموقع على GitHub Pages بحسابين مختلفين: اطلب، عدّل، جرّب تعدّل طلب الحساب التاني (لازم يترفض)، اقفل الطلبية، شوف الحساب، سجّل تحويل وأكّده من الحساب التاني.
