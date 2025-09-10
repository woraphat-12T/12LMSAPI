# 📧 Auto Email Sending for Sync Data

## ภาพรวม
ระบบจะส่งเมลอัตโนมัติเมื่อมีการ sync ข้อมูล Special Plan โดยจะวน loop ข้อมูล result และส่งเมลแยกตาม po_no ผ่านการเรียก API

## 🔄 การทำงาน

### 1. เมื่อเรียก Sync Data
```javascript
POST /api/special-plan/sync-data
```

### 2. ระบบจะทำการ:
1. **Sync ข้อมูล** จาก stored procedure `page_Special_Plan`
2. **จัดกลุ่มข้อมูล** ตาม `po_no`
3. **ตรวจสอบข้อมูลใหม่** (status_op = '000' และ send_mail_status = '0')
4. **ส่งเมลแยก** สำหรับแต่ละ PO ที่มีข้อมูลใหม่
5. **รายงานผล** การส่งเมล

## 📊 Response Format

```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Sync completed successfully",
    "dateNow": "20250908",
    "dateBackThreeMonth": "20250608",
    "insertedRecords": 15,
    "emailsSent": 8,
    "emailResults": [
      {
        "po_no": "1254100007",
        "success": true,
        "recordCount": 2,
        "emailResponse": {
          "success": true,
          "data": {
            "success": true,
            "message": "ส่งเมลเรียบร้อยแล้ว",
            "emailResult": {
              "success": true,
              "messageId": "message-id-123"
            }
          }
        }
      },
      {
        "po_no": "1254100008",
        "success": true,
        "recordCount": 0,
        "message": "No new records to send email"
      }
    ],
    "errors": []
  },
  "message": "Special plan data synced successfully"
}
```

## ⚙️ การตั้งค่า

### Environment Variables
```env
API_BASE_URL=http://localhost:3000
```

### Email Recipients
ในฟังก์ชัน `sendEmailsForNewRecords` สามารถแก้ไขผู้รับเมลได้:
```javascript
recipients: 'woraphat.sris@onetwotrading.co.th', // เปลี่ยนเป็นอีเมลที่ต้องการ
```

## 🔍 เงื่อนไขการส่งเมล

ระบบจะส่งเมลเฉพาะเมื่อ:
- `status_op = '000'` (รอดำเนินการ)
- `send_mail_status1 = '0'` (ยังไม่ส่งเมลครั้งที่ 1)
- `send_mail_status2 = '0'` (ยังไม่ส่งเมลครั้งที่ 2)

## 📝 Log Information

### Log ที่จะเห็น:
```
info: Starting to send emails for new records: {"recordCount":15}
info: Sending email for PO: 1254100007 {"recordCount":2}
info: Email sent successfully for PO: 1254100007 {"recordCount":2,"messageId":"..."}
info: Email sending completed: {"totalPOs":8,"successfulEmails":6,"failedEmails":2}
```

## 🚀 การใช้งาน

### เรียก Sync พร้อมส่งเมล
```bash
curl -X POST http://localhost:3000/api/special-plan/sync-data \
  -H "Content-Type: application/json" \
  -d '{
    "dateNow": "20250908",
    "dateBackThreeMonth": "20250608"
  }'
```

### Response จะรวม:
- ข้อมูลที่ sync ได้
- จำนวนเมลที่ส่ง
- ผลการส่งเมลแต่ละ PO
- ข้อผิดพลาด (ถ้ามี)

## ⚡ Performance

- **หน่วงเวลา**: 1 วินาทีระหว่างการส่งเมลแต่ละ PO
- **Error Handling**: หากส่งเมลไม่สำเร็จ จะไม่หยุดการทำงาน
- **Logging**: บันทึกผลการส่งเมลทุกครั้ง

## 🔧 Customization

### เปลี่ยนผู้รับเมล
แก้ไขใน `sendEmailsForNewRecords`:
```javascript
recipients: 'your-email@company.com',
```

### เปลี่ยนประเภทเมล
```javascript
emailType: 'reminder', // หรือ 'status_update'
```

### เปลี่ยนข้อความ
```javascript
customMessage: `ข้อมูลใหม่จาก Sync: ${newRecords.length} รายการ`,
```

---

**หมายเหตุ:** ระบบจะส่งเมลอัตโนมัติทุกครั้งที่มีการ sync ข้อมูลใหม่
