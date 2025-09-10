# 📊 Special Plan Summary Email API

## ภาพรวม
API สำหรับส่งเมลสรุปข้อมูลใหม่ในระบบ Special Plan โดยแสดงจำนวนรายการทั้งหมดและรายการ PO ที่มีข้อมูลใหม่

## 🚀 Endpoints

### 1. ส่งเมลสรุปข้อมูลใหม่
**POST** `/api/special-plan/send-summary-email`

#### Request Body
```json
{
  "totalRecords": 15,
  "poList": ["PO001", "PO002", "PO003"],
  "poDetails": [
    {
      "po_no": "PO001",
      "recordCount": 5
    },
    {
      "po_no": "PO002", 
      "recordCount": 7
    },
    {
      "po_no": "PO003",
      "recordCount": 3
    }
  ],
  "recipients": "user1@example.com,user2@example.com",
  "empId": "EMP001"
}
```

#### Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `totalRecords` | number | ✅ | จำนวนรายการทั้งหมด |
| `poList` | array | ✅ | รายการรหัส PO |
| `poDetails` | array | ❌ | รายละเอียด PO พร้อมจำนวนรายการ |
| `recipients` | string/array | ✅ | อีเมลผู้รับ |
| `empId` | string | ✅ | รหัสพนักงานที่ส่งเมล |

#### Response
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "ส่งเมลสรุปเรียบร้อยแล้ว",
    "emailResult": {
      "success": true,
      "messageId": "message-id-123",
      "message": "อีเมลถูกส่งเรียบร้อยแล้ว"
    },
    "totalRecords": 15,
    "poCount": 3
  },
  "message": "ส่งเมลสรุปเรียบร้อยแล้ว"
}
```

### 2. Sync Data พร้อมส่งเมลสรุปอัตโนมัติ
**POST** `/api/special-plan/sync-data`

ระบบจะส่งเมลสรุปอัตโนมัติเมื่อมีข้อมูลใหม่

#### Response
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Sync completed successfully",
    "dateNow": "20250908",
    "dateBackThreeMonth": "20250608",
    "insertedRecords": 15,
    "emailSent": true,
    "emailResult": {
      "success": true,
      "message": "Summary email sent successfully",
      "totalRecords": 12,
      "poList": ["PO001", "PO002", "PO003"],
      "emailResult": {
        "success": true,
        "messageId": "message-id-123"
      }
    },
    "errors": []
  },
  "message": "Special plan data synced successfully"
}
```

## 📧 Email Template

### สรุปข้อมูลใหม่ Special Plan
- **หัวข้อ:** 📊 สรุปข้อมูลใหม่ Special Plan - X รายการ
- **เนื้อหา:**
  - แสดงจำนวนรายการทั้งหมด
  - แสดงจำนวน PO
  - รายการ PO แต่ละตัวพร้อมจำนวนรายการ
  - วันที่และเวลาที่ส่ง
  - หมายเหตุและคำแนะนำ

### คุณสมบัติของเมล:
- **Responsive Design** - รองรับทุกอุปกรณ์
- **Grid Layout** - แสดงรายการ PO แบบ grid
- **Color Coding** - ใช้สีเขียวสำหรับข้อมูลใหม่
- **Thai Language** - ภาษาไทยทั้งหมด
- **Professional Design** - ดีไซน์สวยงาม

## 📝 ตัวอย่างการใช้งาน

### JavaScript/Node.js
```javascript
const axios = require('axios');

// ส่งเมลสรุป
const sendSummary = async () => {
  try {
    const response = await axios.post('/api/special-plan/send-summary-email', {
      totalRecords: 15,
      poList: ['PO001', 'PO002', 'PO003'],
      poDetails: [
        { po_no: 'PO001', recordCount: 5 },
        { po_no: 'PO002', recordCount: 7 },
        { po_no: 'PO003', recordCount: 3 }
      ],
      recipients: 'manager@company.com,sales@company.com',
      empId: 'EMP001'
    });
    
    console.log('ส่งเมลสรุปสำเร็จ:', response.data);
  } catch (error) {
    console.error('ส่งเมลสรุปไม่สำเร็จ:', error.response.data);
  }
};

// Sync พร้อมส่งเมลอัตโนมัติ
const syncWithEmail = async () => {
  try {
    const response = await axios.post('/api/special-plan/sync-data', {
      dateNow: '20250908',
      dateBackThreeMonth: '20250608'
    });
    
    console.log('Sync พร้อมส่งเมลสำเร็จ:', response.data);
  } catch (error) {
    console.error('Sync ไม่สำเร็จ:', error.response.data);
  }
};
```

### cURL
```bash
# ส่งเมลสรุป
curl -X POST http://localhost:3000/api/special-plan/send-summary-email \
  -H "Content-Type: application/json" \
  -d '{
    "totalRecords": 15,
    "poList": ["PO001", "PO002", "PO003"],
    "recipients": "user@example.com",
    "empId": "EMP001"
  }'

# Sync พร้อมส่งเมลอัตโนมัติ
curl -X POST http://localhost:3000/api/special-plan/sync-data \
  -H "Content-Type: application/json" \
  -d '{
    "dateNow": "20250908",
    "dateBackThreeMonth": "20250608"
  }'
```

## 🔄 การทำงานของระบบ

### เมื่อเรียก Sync Data:
1. **Sync ข้อมูล** จาก stored procedure
2. **ตรวจสอบข้อมูลใหม่** (status_op = '000' และ send_mail_status = '0')
3. **นับจำนวนรายการ** และจัดกลุ่มตาม PO
4. **ส่งเมลสรุป** แค่ครั้งเดียว (ไม่ส่งแยกตาม PO)
5. **รายงานผล** การส่งเมล

### เงื่อนไขการส่งเมล:
- ส่งเมลเฉพาะเมื่อมีข้อมูลใหม่
- ถ้าไม่มีข้อมูลใหม่ จะไม่ส่งเมล
- ส่งเมลแค่ครั้งเดียว ไม่ส่งแยกตาม PO

## ⚙️ การตั้งค่า

### ผู้รับเมล
แก้ไขในฟังก์ชัน `sendSummaryEmailForNewRecords`:
```javascript
recipients: 'woraphat.sris@onetwotrading.co.th', // เปลี่ยนเป็นอีเมลที่ต้องการ
```

### Environment Variables
```env
API_BASE_URL=http://localhost:3000
```

## 📊 Log Information

### Log ที่จะเห็น:
```
info: Starting to send summary email for new records: {"recordCount":15}
info: Sending special plan summary email: {"totalRecords":12,"poCount":3}
info: Summary email sent successfully: {"totalRecords":12,"poCount":3,"messageId":"..."}
```

## ⚠️ Error Handling

### Common Errors
- `400 Bad Request` - ข้อมูลไม่ครบถ้วน
- `500 Internal Server Error` - ข้อผิดพลาดของเซิร์ฟเวอร์

### Error Response Format
```json
{
  "success": false,
  "error": "Missing required field",
  "message": "totalRecords is required"
}
```

## 🚀 การใช้งานใน Production

1. ตั้งค่า SMTP credentials
2. กำหนดผู้รับเมล
3. ทดสอบการส่งเมลสรุป
4. Monitor log files
5. ตรวจสอบการส่งเมล

---

**หมายเหตุ:** ระบบจะส่งเมลสรุปอัตโนมัติทุกครั้งที่มีการ sync ข้อมูลใหม่ และจะส่งเมลแค่ครั้งเดียวเพื่อแจ้งจำนวนรายการทั้งหมดพร้อมรายการ PO
