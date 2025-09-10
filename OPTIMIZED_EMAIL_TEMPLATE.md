# 📧 Optimized Email Template with Smaller Font Size

## การปรับปรุง Template
ปรับขนาด font และตารางให้เลกลงเพื่อให้ดูเรียบร้อยและประหยัดพื้นที่

## 🔄 การเปลี่ยนแปลง

### ❌ เดิม (ขนาดใหญ่):
```css
/* Container */
font-size: default (16px)

/* หัวข้อ */
<h2>รายการสินค้า</h2> (default size)

/* ตาราง */
padding: 4px
margin: 15px 0
font-size: default (16px)
```

### ✅ ใหม่ (ขนาดเล็กลง):
```css
/* Container */
font-size: 14px

/* หัวข้อ */
<h2 style="font-size: 15px;">รายการสินค้า</h2>
<h2 style="font-size: 16px;">ทดสอบ แจ้งเตือน แพลนพิเศษ PO001 จากฝ่ายผลิต</h2>

/* ตาราง */
padding: 3px
margin: 10px 0
font-size: 14px
```

## 📊 ขนาด Font ที่ปรับปรุง

### Container:
- **Font Size:** `14px` (เดิม: default 16px)

### หัวข้อ:
- **หัวข้อหลัก:** `16px` (เดิม: default)
- **หัวข้อตาราง:** `15px` (เดิม: default)

### ตาราง:
- **Header:** `14px`
- **Data:** `14px`
- **Padding:** `3px` (เดิม: 4px)
- **Margin:** `10px` (เดิม: 15px)

## 📧 ตัวอย่างเมลที่ปรับปรุงแล้ว

```html
<div style="font-family: Arial, sans-serif; font-size: 14px; max-width: 800px; margin: 0 auto; padding: 20px;">
  <h2 style="font-size: 16px;">ทดสอบ แจ้งเตือน แพลนพิเศษ PO001 จากฝ่ายผลิต</h2>

  <h2 style="font-size: 15px;">รายการสินค้า</h2>
  <table style="width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 14px;">
    <thead>
      <tr style="background-color: #f5f5f5;">
        <th style="border: 1px solid #ddd; padding: 3px; text-align: left; font-size: 14px;">รหัสสินค้า</th>
        <th style="border: 1px solid #ddd; padding: 3px; text-align: left; font-size: 14px;">ชื่อสินค้า</th>
        <th style="border: 1px solid #ddd; padding: 3px; text-align: right; font-size: 14px;">จำนวน</th>
        <th style="border: 1px solid #ddd; padding: 3px; text-align: left; font-size: 14px;">หมายเหตุ</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="border: 1px solid #ddd; padding: 3px; font-size: 14px;">PRD001</td>
        <td style="border: 1px solid #ddd; padding: 3px; font-size: 14px;">สินค้า A</td>
        <td style="border: 1px solid #ddd; padding: 3px; text-align: right; font-size: 14px;">100</td>
        <td style="border: 1px solid #ddd; padding: 3px; font-size: 14px;">หมายเหตุ1</td>
      </tr>
    </tbody>
  </table>

  <p>
    <a href="http://localhost:5173/12lms/mms/manage/special-plan" target="_blank" style="color: #1976d2; text-decoration: underline;">
      คลิกลิ้งนี้เพื่อตรวจสอบข้อมูล Special Plan
    </a>
  </p>
  
  <hr>
  <p style="font-size: 12px; color: #666;">
    ข้อความนี้ถูกส่งจากระบบอัตโนมัติ กรุณาอย่าตอบกลับ
  </p>
</div>
```

## 📊 ผลลัพธ์

### ✅ ประโยชน์:
- **ประหยัดพื้นที่** - ตารางเล็กลง
- **อ่านง่าย** - font size เหมาะสม
- **ดูเรียบร้อย** - spacing ที่เหมาะสม
- **Responsive** - รองรับทุกอุปกรณ์

### 📏 ขนาดที่ปรับปรุง:
- **Container Font:** 14px
- **หัวข้อหลัก:** 16px
- **หัวข้อตาราง:** 15px
- **ตาราง Font:** 14px
- **Padding:** 3px
- **Margin:** 10px

## 🔍 การเปรียบเทียบ

### เดิม:
```
┌─────────────────────────────────────────┐
│           หัวข้อใหญ่ (16px)              │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ รหัสสินค้า │ ชื่อสินค้า │ จำนวน │   │
│  │ (padding:4px)                   │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### ใหม่:
```
┌─────────────────────────────────────────┐
│        หัวข้อเล็กลง (16px)              │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ รหัสสินค้า │ ชื่อสินค้า │ จำนวน │   │
│  │ (padding:3px, font:14px)        │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

## 🚀 การใช้งาน

### ไม่ต้องเปลี่ยนอะไร:
- API endpoint เหมือนเดิม
- Request/Response เหมือนเดิม
- เพียงแค่เมลจะดูเล็กลงและเรียบร้อยขึ้น

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

---

**หมายเหตุ:** เมลจะแสดงด้วย font size 14px และตารางที่เล็กลงเพื่อความเรียบร้อย
