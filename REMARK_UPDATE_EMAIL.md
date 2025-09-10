# 📧 Remark Update Email for Special Plan

## ภาพรวม
ระบบจะส่งเมลแจ้งเตือนเมื่อมีการอัพเดท remark ใน Special Plan โดยอัตโนมัติ

## 🔄 การทำงาน

### เมื่อเรียก Update Remark:
```javascript
POST /api/special-plan/update-remark
{
  "po_no": "PO001",
  "prd_id": "PRD001", 
  "note": "หมายเหตุใหม่",
  "empId": "EMP001"
}
```

### ระบบจะทำการ:
1. **อัพเดท remark** ในฐานข้อมูล
2. **ส่งเมลแจ้งเตือน** อัตโนมัติ
3. **รายงานผล** การอัพเดท

## 📧 Email Template

### หัวข้อเมล:
```
แจ้งเตือน แพลนพิเศษ PO001 จากฝ่ายผลิต
```

### เนื้อหาเมล:
```html
แจ้งเตือน แพลนพิเศษ PO001 จากฝ่ายผลิต

รหัสสินค้า: PRD001
หมายเหตุ: หมายเหตุใหม่
อัพเดทโดย: EMP001
วันที่: 8/9/2567 10:30:45

คลิกลิ้งนี้เพื่อตรวจสอบข้อมูล Special Plan
─────────────────────────────────────────
ข้อความนี้ถูกส่งจากระบบอัตโนมัติ กรุณาอย่าตอบกลับ
```

## 📊 การตั้งค่าเมล

### ผู้รับเมล:
- **To:** `woraphat.sris@onetwotrading.co.th`
- **CC:** `thanatnon.jai@onetwotrading.co.th`

### ลิ้งค์:
- **URL:** `http://localhost:5173/12lms/mms/manage/special-plan`

## 📝 ตัวอย่างการใช้งาน

### JavaScript/Node.js
```javascript
const axios = require('axios');

const updateRemark = async () => {
  try {
    const response = await axios.post('/api/special-plan/update-remark', {
      po_no: 'PO001',
      prd_id: 'PRD001',
      note: 'หมายเหตุใหม่จากฝ่ายผลิต',
      empId: 'EMP001'
    });
    
    console.log('อัพเดท remark สำเร็จ:', response.data);
    // ระบบจะส่งเมลแจ้งเตือนอัตโนมัติ
  } catch (error) {
    console.error('อัพเดท remark ไม่สำเร็จ:', error.response.data);
  }
};
```

### cURL
```bash
curl -X POST http://localhost:3000/api/special-plan/update-remark \
  -H "Content-Type: application/json" \
  -d '{
    "po_no": "PO001",
    "prd_id": "PRD001",
    "note": "หมายเหตุใหม่จากฝ่ายผลิต",
    "empId": "EMP001"
  }'
```

## 🔍 Log Information

### Log ที่จะเห็น:
```
info: Executing page_Special_Plan with updateRemarkSp: {"po_no":"PO001","prd_id":"PRD001","note":"หมายเหตุใหม่","empId":"EMP001"}
info: Special plan remark updated successfully: {"po_no":"PO001","prd_id":"PRD001","empId":"EMP001"}
info: Sending remark update email: {"po_no":"PO001","prd_id":"PRD001","empId":"EMP001"}
info: Remark update email sent successfully: {"po_no":"PO001","prd_id":"PRD001","messageId":"..."}
```

## ⚠️ Error Handling

### หากส่งเมลไม่สำเร็จ:
- **ไม่หยุดการทำงาน** ของการอัพเดท remark
- **บันทึก error** ใน log
- **ส่งคืนผลลัพธ์** การอัพเดท remark ตามปกติ

### Log Error:
```
error: Failed to send remark update email: Error message
```

## 📊 Response Format

### Success Response:
```json
{
  "success": true,
  "data": { /* stored procedure result */ },
  "message": "Special plan remark updated successfully"
}
```

### Error Response:
```json
{
  "success": false,
  "error": "Failed to update special plan remark",
  "message": "Error details"
}
```

## 🔧 การตั้งค่า

### เปลี่ยนผู้รับเมล:
แก้ไขในฟังก์ชัน `sendRemarkUpdateEmail`:
```javascript
const emailResult = await emailService.sendEmail({
  to: 'your-email@company.com', // เปลี่ยนเป็นอีเมลที่ต้องการ
  cc: ['cc-email@company.com'], // เปลี่ยนเป็นอีเมล CC ที่ต้องการ
  subject: subject,
  html: htmlContent
});
```

### เปลี่ยนลิ้งค์:
แก้ไขในฟังก์ชัน `createRemarkUpdateEmailTemplate`:
```javascript
<a href="https://your-domain.com/special-plan" target="_blank">
  คลิกลิ้งนี้เพื่อตรวจสอบข้อมูล Special Plan
</a>
```

## 🚀 การใช้งานใน Production

1. ตั้งค่า SMTP credentials
2. กำหนดผู้รับเมลที่เหมาะสม
3. ตั้งค่าลิ้งค์ให้ถูกต้อง
4. ทดสอบการส่งเมล
5. Monitor log files

---

**หมายเหตุ:** ระบบจะส่งเมลแจ้งเตือนอัตโนมัติทุกครั้งที่มีการอัพเดท remark ใน Special Plan
