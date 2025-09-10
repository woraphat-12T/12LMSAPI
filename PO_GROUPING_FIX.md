# 🔄 PO Grouping Fix for Special Plan Email

## ปัญหาที่แก้ไข
เดิมระบบนับจำนวนรายการทั้งหมด (`totalNewRecords++`) ทำให้มีเลขซ้ำหาก PO เดียวกันมีหลายรายการ

## การแก้ไข

### ❌ เดิม (มีเลขซ้ำ):
```javascript
let totalNewRecords = 0;

records.forEach(record => {
  if (record.status_op === '000' && 
      record.send_mail_status1 === '0' && 
      record.send_mail_status2 === '0') {
    
    if (!poGroups.has(poNo)) {
      poGroups.set(poNo, 0);
    }
    poGroups.set(poNo, poGroups.get(poNo) + 1);
    totalNewRecords++; // ❌ นับทุก record ทำให้ซ้ำ
  }
});
```

### ✅ ใหม่ (ไม่ซ้ำ):
```javascript
records.forEach(record => {
  if (record.status_op === '000' && 
      record.send_mail_status1 === '0' && 
      record.send_mail_status2 === '0') {
    
    if (!poGroups.has(poNo)) {
      poGroups.set(poNo, 0);
    }
    poGroups.set(poNo, poGroups.get(poNo) + 1);
  }
});

// นับจำนวน PO ที่มีข้อมูลใหม่ (ไม่ซ้ำ)
const totalNewRecords = poGroups.size; // ✅ นับแค่ unique PO
```

## ตัวอย่างการทำงาน

### ข้อมูล Input:
```javascript
const records = [
  { po_no: 'PO001', status_op: '000', send_mail_status1: '0', send_mail_status2: '0' },
  { po_no: 'PO001', status_op: '000', send_mail_status1: '0', send_mail_status2: '0' },
  { po_no: 'PO002', status_op: '000', send_mail_status1: '0', send_mail_status2: '0' },
  { po_no: 'PO003', status_op: '000', send_mail_status1: '0', send_mail_status2: '0' },
  { po_no: 'PO003', status_op: '000', send_mail_status1: '0', send_mail_status2: '0' }
];
```

### ผลลัพธ์:

#### ❌ เดิม:
- `totalNewRecords = 5` (นับทุก record)
- `poList = ['PO001', 'PO002', 'PO003']`
- **เมลแสดง:** "แจ้งเตือน Special Plan เข้าใหม่ 5 รายการ"

#### ✅ ใหม่:
- `totalNewRecords = 3` (นับแค่ unique PO)
- `poList = ['PO001', 'PO002', 'PO003']`
- **เมลแสดง:** "แจ้งเตือน Special Plan เข้าใหม่ 3 รายการ"

## 📊 Log Information

### Log ที่จะเห็น:
```
info: Starting to send summary email for new records: {"recordCount":5}
info: PO grouping completed: {
  "totalRecords": 5,
  "uniquePOs": 3,
  "poGroups": [
    ["PO001", 2],
    ["PO002", 1], 
    ["PO003", 2]
  ]
}
info: Summary email sent successfully: {"totalRecords":3,"poCount":3,"messageId":"..."}
```

## 📧 Email Template

### เมลจะแสดง:
```
แจ้งเตือน Special Plan เข้าใหม่ 3 รายการ

รายการใหม่: PO001,PO002,PO003

คลิกลิ้งนี้เพื่อตรวจสอบข้อมูล Special Plan
─────────────────────────────────────────
ข้อความนี้ถูกส่งจากระบบอัตโนมัติ กรุณาอย่าตอบกลับ
```

## 🔄 การทำงานของระบบ

1. **รับข้อมูล** จาก sync (อาจมี PO ซ้ำ)
2. **Group ตาม PO** และนับจำนวนรายการในแต่ละ PO
3. **นับ unique PO** เท่านั้น (ไม่ซ้ำ)
4. **ส่งเมล** แสดงจำนวน PO ที่ไม่ซ้ำ
5. **อัพเดทสถานะ** สำหรับทุก PO ที่ไม่ซ้ำ

## ✅ ผลลัพธ์

- **จำนวนที่แสดงในเมล** = จำนวน PO ที่ไม่ซ้ำ
- **รายการ PO** = รายการ PO ที่ไม่ซ้ำ
- **การอัพเดทสถานะ** = สำหรับทุก PO ที่ไม่ซ้ำ

---

**หมายเหตุ:** ตอนนี้ระบบจะนับแค่ unique PO เท่านั้น ไม่มีการนับซ้ำแล้ว
