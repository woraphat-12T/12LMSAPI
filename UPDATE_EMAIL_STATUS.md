# 📧 Update Email Status for Special Plan

## ภาพรวม
ระบบจะอัพเดทสถานะการส่งเมลสำหรับแต่ละ PO หลังจากส่งเมลสรุปสำเร็จ โดยเรียก stored procedure `page_Special_Plan` ด้วย hcase `updateStatusSendmail`

## 🔄 การทำงาน

### 1. เมื่อส่งเมลสรุปสำเร็จ
ระบบจะเรียกฟังก์ชัน `updateEmailStatusForPOs()` อัตโนมัติ

### 2. ระบบจะทำการ:
1. **วน loop** รายการ PO ทั้งหมด
2. **เรียก stored procedure** สำหรับแต่ละ PO
3. **อัพเดทสถานะ** การส่งเมล
4. **รายงานผล** การอัพเดท

## 📊 Stored Procedure Call

### สำหรับแต่ละ PO:
```sql
EXEC [dbo].[page_Special_Plan] 
  'updateStatusSendmail',
  'po_no',        -- p1: รหัส PO
  '01',           -- p2: สถานะการส่งเมล
  '',             -- p3-p10: ว่าง
  '',
  '',
  '',
  '',
  '',
  '',
  ''
```

## 📝 ตัวอย่างการทำงาน

### เมื่อมี PO ใหม่ 3 รายการ:
```javascript
// หลังจากส่งเมลสำเร็จ
const poList = ['PO001', 'PO002', 'PO003'];

// ระบบจะเรียก stored procedure 3 ครั้ง:
// 1. EXEC [dbo].[page_Special_Plan] 'updateStatusSendmail','PO001','01','','','','','','','',''
// 2. EXEC [dbo].[page_Special_Plan] 'updateStatusSendmail','PO002','01','','','','','','','',''
// 3. EXEC [dbo].[page_Special_Plan] 'updateStatusSendmail','PO003','01','','','','','','','',''
```

## 📊 Log Information

### Log ที่จะเห็น:
```
info: Updating email status for POs: {"poCount":3,"poList":["PO001","PO002","PO003"]}
info: Email status updated for PO: PO001
info: Email status updated for PO: PO002
info: Email status updated for PO: PO003
info: Email status update completed: {"totalPOs":3,"successCount":3,"errorCount":0}
```

## 🔧 ฟังก์ชัน `updateEmailStatusForPOs`

### Parameters:
- `poList` (Array) - รายการรหัส PO

### Returns:
```javascript
{
  success: true,
  message: "Updated email status for 3/3 POs",
  results: [
    {
      po_no: "PO001",
      success: true,
      result: { /* stored procedure result */ }
    },
    {
      po_no: "PO002", 
      success: true,
      result: { /* stored procedure result */ }
    },
    {
      po_no: "PO003",
      success: true,
      result: { /* stored procedure result */ }
    }
  ],
  successCount: 3,
  errorCount: 0
}
```

## ⚠️ Error Handling

### หากอัพเดทไม่สำเร็จ:
```javascript
{
  po_no: "PO001",
  success: false,
  error: "Error message"
}
```

### ระบบจะ:
- **ไม่หยุดการทำงาน** หาก PO ใดอัพเดทไม่สำเร็จ
- **บันทึก error** ใน log
- **รายงานผล** ทั้งหมดรวมถึง error

## 🚀 การใช้งาน

### อัตโนมัติ:
ระบบจะเรียกใช้อัตโนมัติเมื่อส่งเมลสรุปสำเร็จ

### Manual Call:
```javascript
const { updateEmailStatusForPOs } = require('./controllers/specialPlanController');

const result = await updateEmailStatusForPOs(['PO001', 'PO002', 'PO003']);
console.log(result);
```

## 📊 Response ใน Sync Data

### Response จะรวม:
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Sync completed successfully",
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
  }
}
```

## 🔧 Configuration

### สถานะการส่งเมล:
- `'01'` - ส่งเมลแล้ว (default)
- สามารถเปลี่ยนได้ในฟังก์ชัน `updateEmailStatusForPOs`

### Error Handling:
- หาก stored procedure ไม่สำเร็จ จะบันทึก error แต่ไม่หยุดการทำงาน
- รายงานผลการอัพเดททั้งหมด

---

**หมายเหตุ:** ระบบจะอัพเดทสถานะการส่งเมลสำหรับทุก PO ที่ส่งเมลไปแล้ว โดยเรียก stored procedure แยกสำหรับแต่ละ PO
