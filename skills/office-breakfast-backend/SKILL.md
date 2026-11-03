---
name: office-breakfast-backend
description: شغل الباك بتاع «فطار المكتب» — شكل البيانات في Firestore، قواعد الأمان firestore.rules، الحساب والترحيل، التنظيف، والليمت المجاني لـ Firebase.
---

# الباك — Firebase بتاع فطار المكتب

Project `office-breakfast-c9338` · Firestore (eur3) · Auth Email/Password. مفيش سيرفر — المتصفح بيكلّم Firestore والأمان كله في القواعد.

## شكل البيانات
| المسار | الحقول | مين يكتب |
|---|---|---|
| `users/{uid}` | name, email, payInfo | صاحبه |
| `orders/{id}` | title, day, restaurantId, restaurantName, payerUid, fee, deadline, note, status (`open`/`closed`/`cancelled`), createdBy | اللي عملها أو اللي بيدفع · المسح للأدمن |
| `orders/{id}/items/{id}` | uid, orderId, name, qty, price, note | صاحبه وطول ما الطلبية `open` |
| `orders/{id}/notes/{id}` | uid, text | أي حد يضيف · صاحبها/الأدمن يمسح |
| `transfers/{id}` | fromUid, toUid, amount, note, confirmed | المحوّل يسجّل · المستلم بس يأكد |
| `restaurants/{id}` | name, phone, items[{name,price}], createdBy | أي حد |
| `config/app` | admins[] | أول واحد يعمل نفسه · بعدها الأدمن |
| `carry/pairs` | pairs{ "a_b": رقم } | الأدمن (التنظيف) |

## الحساب
- طلبية `closed` بس: كل مشارك عليه لـ`payerUid` = أصنافه + (fee ÷ عدد المشاركين).
- التحويل المتأكد من A لـ B بيقلّل دين A.
- `carry/pairs`: المفتاح `a_b` والـuids مترتبة (a < b) — **موجب = b عليه لـ a**، سالب العكس.
- `ledger()` = الطلبيات + التحويلات + carry. `contribution()` بتحسب نفس الحاجة لمجموعة سجلات قبل مسحها.

## التنظيف
`A.cleanup(days)`: لكل دفعة (≤400 عملية) في **نفس الـbatch**: `increment` على carry + مسح الأصناف والملاحظات والطلبية/التحويل. ده بيضمن إن الدفعة يا تتحسب وتتمسح يا لأ — مفيش ازدواج. الطلبيات المفتوحة والتحويلات غير المتأكدة مبتتمسحش.

## قواعد عند التعديل
1. أي collection أو حقل جديد ← قاعدة في `firestore.rules` في نفس التعديل، وبمبدأ «كل واحد حاجته بس».
2. القواعد اللي بتعمل `get()` بتتحسب قراءة — متكترهاش.
3. نشر القواعد: Firebase Console ← Firestore ← Rules ← Publish (أو `firebase deploy --only firestore:rules`).
4. الليمت المجاني (Spark): 50K قراءة · 20K كتابة · 20K مسح في اليوم · 1GB تخزين. فتح الموقع بيقرا كل المجموعات مرة ← التنظيف الدوري بيخلّي الرقم صغير.
5. ممنوع `allow read, write: if true` حتى للتجربة.
