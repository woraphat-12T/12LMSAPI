# 📧 Enhanced Remark Update Email with PO Details

## ภาพรวม
ระบบจะดึงข้อมูลรายละเอียดของ PO จาก stored procedure `page_Special_Plan` ด้วย hcase `getDataDetail` และแสดงรายการ item ในรูปแบบตารางในเมล

## 🔄 การทำงาน

### 1. เมื่อเรียก Update Remark
```javascript
POST /api/special-plan/update-remark
{
  "po_no": "PO001",
  "prd_id": "PRD001", 
  "note": "หมายเหตุใหม่",
  "empId": "EMP001"
}
```

### 2. ระบบจะทำการ:
1. **อัพเดท remark** ในฐานข้อมูล
2. **ตรวจสอบ lastRow = 0**
3. **ดึงข้อมูลรายละเอียด PO** จาก stored procedure
4. **ส่งเมลพร้อมตารางรายการ item**
5. **รายงานผล** การอัพเดท

## 📊 Stored Procedure Call

### ดึงข้อมูลรายละเอียด PO:
```sql
EXEC [dbo].[page_Special_Plan] 
  'getDataDetail',
  'po_no',        -- p1: รหัส PO
  '',             -- p2-p10: ว่าง
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  ''
```

## 📧 Email Template

### หัวข้อเมล:
```
ทดสอบ แจ้งเตือน แพลนพิเศษ PO001 จากฝ่ายผลิต
```

### เนื้อหาเมล:
```html
ทดสอบ แจ้งเตือน แพลนพิเศษ PO001 จากฝ่ายผลิต

รหัสสินค้า: PRD001
หมายเหตุ: หมายเหตุใหม่
อัพเดทโดย: EMP001
วันที่: 8/9/2567 10:30:45

รายการสินค้า
┌─────────────┬─────────────┬─────────┬─────────┬─────────────┐
│ รหัสสินค้า  │ ชื่อสินค้า  │ จำนวน  │ หมายเหตุ│ สถานะ      │
├─────────────┼─────────────┼─────────┼─────────┼─────────────┤
│ PRD001      │ สินค้า A    │ 100     │ หมายเหตุ1│ รอดำเนินการ │
│ PRD002      │ สินค้า B    │ 50      │ หมายเหตุ2│ รอดำเนินการ │
│ PRD003      │ สินค้า C    │ 200     │ หมายเหตุ3│ รอดำเนินการ │
└─────────────┴─────────────┴─────────┴─────────┴─────────────┘

คลิกลิ้งนี้เพื่อตรวจสอบข้อมูล Special Plan
─────────────────────────────────────────
ข้อความนี้ถูกส่งจากระบบอัตโนมัติ กรุณาอย่าตอบกลับ
```

## 📊 ตารางรายการ Item

### คอลัมน์ในตาราง:
- **รหัสสินค้า** - `prd_id`
- **ชื่อสินค้า** - `prd_name`
- **จำนวน** - `quantity`
- **หมายเหตุ** - `note`
- **สถานะ** - `status_op` (แปลงเป็นข้อความไทย)

### การแปลงสถานะ:
- `'000'` → `'รอดำเนินการ'`
- `'001'` → `'ดำเนินการเสร็จสิ้น'`
- อื่นๆ → `'สถานะอื่นๆ'`

## 🔍 Log Information

### Log ที่จะเห็น:
```
info: Sending remark update email: {"po_no":"PO001","prd_id":"PRD001","empId":"EMP001"}
info: PO details retrieved successfully: {"po_no":"PO001","itemCount":3}
info: Remark update email sent successfully: {"po_no":"PO001","prd_id":"PRD001","messageId":"..."}
```

### หากดึงข้อมูลไม่สำเร็จ:
```
error: Failed to get PO details: Error message
info: Remark update email sent successfully: {"po_no":"PO001","prd_id":"PRD001","messageId":"..."}
```

## ⚠️ Error Handling

### หากดึงข้อมูลรายละเอียดไม่สำเร็จ:
- **ไม่หยุดการทำงาน** ของการส่งเมล
- **แสดงข้อความ** "ไม่พบข้อมูลรายการสินค้า"
- **ส่งเมลตามปกติ** พร้อมข้อมูล remark

### หากส่งเมลไม่สำเร็จ:
- **ไม่หยุดการทำงาน** ของการอัพเดท remark
- **บันทึก error** ใน log
- **ส่งคืนผลลัพธ์** การอัพเดท remark ตามปกติ

## 📝 ตัวอย่างการทำงาน

### กรณีที่ 1: ดึงข้อมูลสำเร็จ
```javascript
// ดึงข้อมูลจาก stored procedure
const detailResult = [
  {
    prd_id: 'PRD001',
    prd_name: 'สินค้า A',
    quantity: 100,
    note: 'หมายเหตุ1',
    status_op: '000'
  },
  {
    prd_id: 'PRD002',
    prd_name: 'สินค้า B',
    quantity: 50,
    note: 'หมายเหตุ2',
    status_op: '000'
  }
];

// สร้างตารางในเมล
// แสดงตารางพร้อมข้อมูลครบถ้วน
```

### กรณีที่ 2: ดึงข้อมูลไม่สำเร็จ
```javascript
// detailResult = null หรือ []
// แสดงข้อความ "ไม่พบข้อมูลรายการสินค้า"
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

## 🚀 การใช้งาน

### การทดสอบ:
```bash
curl -X POST http://localhost:3000/api/special-plan/update-remark \
  -H "Content-Type: application/json" \
  -d '{
    "po_no": "PO001",
    "prd_id": "PRD001",
    "note": "หมายเหตุใหม่",
    "empId": "EMP001"
  }'
```

### ผลลัพธ์:
- อัพเดท remark สำเร็จ
- ดึงข้อมูลรายละเอียด PO
- ส่งเมลพร้อมตารางรายการ item

## 📋 สรุป

- **ดึงข้อมูล PO** จาก stored procedure `getDataDetail`
- **แสดงตารางรายการ item** ในเมล
- **Error Handling** ไม่หยุดการทำงานหากดึงข้อมูลไม่สำเร็จ
- **Template** แบบง่ายๆ พร้อมตารางสวยงาม

---

**หมายเหตุ:** ระบบจะดึงข้อมูลรายละเอียด PO และแสดงในรูปแบบตารางในเมล
