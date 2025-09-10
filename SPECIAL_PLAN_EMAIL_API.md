# 📧 Special Plan Email API Documentation

## ภาพรวม
API สำหรับส่งเมลแจ้งเตือนในระบบ Special Plan ที่รองรับการส่งเมลแบบเดี่ยวและแบบ bulk พร้อม template ที่สวยงาม

## 🚀 Endpoints

### 1. ส่งเมลสำหรับ PO เดียว
**POST** `/api/special-plan/send-email`

#### Request Body
```json
{
  "po_no": "PO001",
  "recipients": "user1@example.com,user2@example.com",
  "emailType": "notification",
  "customMessage": "กรุณาตรวจสอบข้อมูล",
  "empId": "EMP001"
}
```

#### Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `po_no` | string | ✅ | รหัส Purchase Order |
| `recipients` | string/array | ✅ | อีเมลผู้รับ (รองรับหลายคน) |
| `emailType` | string | ❌ | ประเภทเมล: `notification`, `reminder`, `status_update` |
| `customMessage` | string | ❌ | ข้อความเพิ่มเติม |
| `empId` | string | ✅ | รหัสพนักงานที่ส่งเมล |

#### Response
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "ส่งเมลเรียบร้อยแล้ว",
    "emailResult": {
      "success": true,
      "messageId": "message-id-123",
      "message": "อีเมลถูกส่งเรียบร้อยแล้ว"
    },
    "po_no": "PO001",
    "emailType": "notification",
    "recipients": ["user1@example.com", "user2@example.com"]
  },
  "message": "ส่งเมลเรียบร้อยแล้ว"
}
```

### 2. ส่งเมลสำหรับหลาย PO
**POST** `/api/special-plan/send-bulk-email`

#### Request Body
```json
{
  "po_list": ["PO001", "PO002", "PO003"],
  "recipients": ["user1@example.com", "user2@example.com"],
  "emailType": "reminder",
  "customMessage": "กรุณาดำเนินการโดยเร็ว",
  "empId": "EMP001"
}
```

#### Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `po_list` | array | ✅ | รายการรหัส PO |
| `recipients` | string/array | ✅ | อีเมลผู้รับ |
| `emailType` | string | ❌ | ประเภทเมล |
| `customMessage` | string | ❌ | ข้อความเพิ่มเติม |
| `empId` | string | ✅ | รหัสพนักงานที่ส่งเมล |

#### Response
```json
{
  "success": true,
  "data": {
    "totalPOs": 3,
    "successCount": 2,
    "errorCount": 1,
    "results": [
      {
        "po_no": "PO001",
        "success": true,
        "result": { /* email result */ }
      },
      {
        "po_no": "PO002",
        "success": true,
        "result": { /* email result */ }
      }
    ],
    "errors": [
      {
        "po_no": "PO003",
        "success": false,
        "error": "ไม่พบข้อมูล PO PO003"
      }
    ]
  },
  "message": "ส่งเมลเรียบร้อยแล้ว 2/3 PO (มีข้อผิดพลาด 1 PO)"
}
```

## 📧 ประเภทของเมล

### 1. Notification (แจ้งเตือน)
- แสดงข้อมูล PO ครบถ้วน
- รายการสินค้าทั้งหมด
- สถานะปัจจุบัน
- ใช้สีน้ำเงิน (#2c3e50)

### 2. Reminder (เตือนความจำ)
- เน้นรายการที่รอดำเนินการ
- แสดงเฉพาะสินค้าที่ status_op = '000'
- ใช้สีส้ม (#e67e22)
- มีข้อความเตือนเร่งด่วน

### 3. Status Update (อัพเดทสถานะ)
- แสดงการเปลี่ยนแปลงสถานะ
- ใช้สีเขียว (#27ae60)
- แสดงสถานะรายการสินค้าด้วย emoji

## 🎨 คุณสมบัติของเมล

- **Responsive Design** - รองรับทุกอุปกรณ์
- **ข้อมูลครบถ้วน** - PO, ลูกค้า, รายการสินค้า, สถานะ
- **Custom Message** - ข้อความเพิ่มเติมได้
- **Status Tracking** - บันทึกสถานะการส่งเมล
- **Error Handling** - จัดการข้อผิดพลาด
- **Thai Language** - ภาษาไทยทั้งหมด

## 📝 ตัวอย่างการใช้งาน

### JavaScript/Node.js
```javascript
const axios = require('axios');

// ส่งเมลแจ้งเตือน
const sendNotification = async () => {
  try {
    const response = await axios.post('/api/special-plan/send-email', {
      po_no: 'PO001',
      recipients: 'manager@company.com,sales@company.com',
      emailType: 'notification',
      customMessage: 'กรุณาตรวจสอบข้อมูล PO ใหม่',
      empId: 'EMP001'
    });
    
    console.log('ส่งเมลสำเร็จ:', response.data);
  } catch (error) {
    console.error('ส่งเมลไม่สำเร็จ:', error.response.data);
  }
};

// ส่งเมลหลาย PO
const sendBulkReminder = async () => {
  try {
    const response = await axios.post('/api/special-plan/send-bulk-email', {
      po_list: ['PO001', 'PO002', 'PO003'],
      recipients: ['warehouse@company.com'],
      emailType: 'reminder',
      empId: 'EMP001'
    });
    
    console.log('ส่งเมล bulk สำเร็จ:', response.data);
  } catch (error) {
    console.error('ส่งเมล bulk ไม่สำเร็จ:', error.response.data);
  }
};
```

### cURL
```bash
# ส่งเมลแจ้งเตือน
curl -X POST http://localhost:3000/api/special-plan/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "po_no": "PO001",
    "recipients": "user@example.com",
    "emailType": "notification",
    "empId": "EMP001"
  }'

# ส่งเมลหลาย PO
curl -X POST http://localhost:3000/api/special-plan/send-bulk-email \
  -H "Content-Type: application/json" \
  -d '{
    "po_list": ["PO001", "PO002"],
    "recipients": "user@example.com",
    "emailType": "reminder",
    "empId": "EMP001"
  }'
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
  "message": "po_no is required"
}
```

## 🔧 Configuration

### Environment Variables
```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=notification@f-plus.co.th
SMTP_PASS=your_password
EMAIL_FROM_NAME=F-Plus Notification System
```

## 📊 Monitoring & Logging

- ทุกการส่งเมลจะถูกบันทึกใน log
- ติดตามสถานะการส่งเมลในฐานข้อมูล
- รายงานผลการส่งแบบละเอียด

## 🚀 การใช้งานใน Production

1. ตั้งค่า SMTP credentials
2. ทดสอบการเชื่อมต่อ
3. ตรวจสอบ log files
4. Monitor email delivery

---

**หมายเหตุ:** API นี้ใช้ระบบ email service ที่มีอยู่แล้วในโปรเจค และรองรับการส่งเมลแบบ bulk เพื่อประสิทธิภาพที่ดี
