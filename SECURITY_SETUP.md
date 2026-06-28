# إعداد الأمان والطلبات

تم نقل إنشاء الطلب وخصم المخزون إلى API server-side:

- المسار: `/api/orders`
- ملف التنفيذ: `src/app/api/orders/route.ts`
- يعتمد على Firebase Admin SDK

## متغيرات البيئة المطلوبة

أضف القيم التالية في بيئة الاستضافة، ويمكن استخدامها محليًا في `.env.local`:

```env
FIREBASE_PROJECT_ID=store-manager-8d619
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@store-manager-8d619.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
```

القيم تأتي من Firebase Console:

Project settings -> Service accounts -> Generate new private key.

## قواعد Firestore

ملف القواعد المقترح موجود في:

```text
firestore.rules
```

الفكرة:

- المنتجات قابلة للقراءة فقط إذا كانت ظاهرة في السوق.
- لا يوجد تعديل مباشر للمنتجات من المتصفح.
- الطلبات لا تقرأ ولا تكتب من المتصفح.
- إنشاء الطلبات يتم فقط عبر API السيرفر باستخدام Admin SDK.

## رقم الطلب

الـAPI ينشئ رقم طلب مختصر بصيغة:

```text
GM-YYYYMMDD-HHMMXXX
```

ويحفظه في حقل `orderNumber` داخل مستند الطلب.
