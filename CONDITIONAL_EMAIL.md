# 📧 Conditional Email for Remark Update

## เงื่อนไขการส่งเมล
ระบบจะส่งเมลแจ้งเตือนเฉพาะเมื่อ `lastRow = 0` เท่านั้น

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
2. **ตรวจสอบ lastRow** ในผลลัพธ์
3. **ส่งเมลเฉพาะเมื่อ lastRow = 0**
4. **รายงานผล** การอัพเดท

## 📊 เงื่อนไขการส่งเมล

### ✅ ส่งเมลเมื่อ:
```json
{
  "success": true,
  "data": [
    {
      "lastRow": 0
    }
  ],
  "message": "Special plan remark updated successfully"
}
```

### ❌ ไม่ส่งเมลเมื่อ:
```json
{
  "success": true,
  "data": [
    {
      "lastRow": 1
    }
  ],
  "message": "Special plan remark updated successfully"
}
```

## 🔍 Log Information

### เมื่อ lastRow = 0 (ส่งเมล):
```
info: Special plan remark updated successfully: {"po_no":"PO001","prd_id":"PRD001","empId":"EMP001"}
info: lastRow = 0, sending remark update email: {"po_no":"PO001","prd_id":"PRD001","lastRow":0}
info: Sending remark update email: {"po_no":"PO001","prd_id":"PRD001","empId":"EMP001"}
info: Remark update email sent successfully: {"po_no":"PO001","prd_id":"PRD001","messageId":"..."}
```

### เมื่อ lastRow != 0 (ไม่ส่งเมล):
```
info: Special plan remark updated successfully: {"po_no":"PO001","prd_id":"PRD001","empId":"EMP001"}
info: lastRow != 0, skipping email: {"po_no":"PO001","prd_id":"PRD001","lastRow":1}
```

## 📝 ตัวอย่างการทำงาน

### กรณีที่ 1: lastRow = 0 (ส่งเมล)
```javascript
// Response จาก stored procedure
{
  "success": true,
  "data": [
    {
      "lastRow": 0
    }
  ]
}

// ระบบจะส่งเมล
// หัวข้อ: "ทดสอบ แจ้งเตือน แพลนพิเศษ PO001 จากฝ่ายผลิต"
```

### กรณีที่ 2: lastRow = 1 (ไม่ส่งเมล)
```javascript
// Response จาก stored procedure
{
  "success": true,
  "data": [
    {
      "lastRow": 1
    }
  ]
}

// ระบบจะไม่ส่งเมล
// บันทึก log: "lastRow != 0, skipping email"
```

## 🔧 Code Logic

```javascript
// ตรวจสอบเงื่อนไข lastRow = 0 ก่อนส่งเมล
let shouldSendEmail = false;
if (Array.isArray(result) && result.length > 0) {
  const firstResult = result[0];
  if (firstResult && firstResult.lastRow === 0) {
    shouldSendEmail = true;
    logger.info('lastRow = 0, sending remark update email');
  } else {
    logger.info('lastRow != 0, skipping email');
  }
}

// ส่งเมลแจ้งเตือนเฉพาะเมื่อ lastRow = 0
if (shouldSendEmail) {
  await sendRemarkUpdateEmail(po_no, prd_id, note, empId);
}
```

## 📊 Response Format

### Success Response (ไม่เปลี่ยนแปลง):
```json
{
  "success": true,
  "data": [
    {
      "lastRow": 0
    }
  ],
  "message": "Special plan remark updated successfully"
}
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

## 🚀 การใช้งาน

### การทดสอบ:
```bash
# ทดสอบอัพเดท remark
curl -X POST http://localhost:3000/api/special-plan/update-remark \
  -H "Content-Type: application/json" \
  -d '{
    "po_no": "PO001",
    "prd_id": "PRD001",
    "note": "หมายเหตุใหม่",
    "empId": "EMP001"
  }'

# ตรวจสอบ log ว่า lastRow เป็นเท่าไหร่
# หาก lastRow = 0 จะส่งเมล
# หาก lastRow != 0 จะไม่ส่งเมล
```

## 📋 สรุป

- **ส่งเมลเมื่อ:** `lastRow = 0`
- **ไม่ส่งเมลเมื่อ:** `lastRow != 0`
- **Log:** บันทึกการตัดสินใจส่งเมลหรือไม่
- **Error Handling:** ไม่หยุดการทำงานหากส่งเมลไม่สำเร็จ

---

**หมายเหตุ:** ระบบจะตรวจสอบ `lastRow` ในผลลัพธ์จาก stored procedure ก่อนตัดสินใจส่งเมล
