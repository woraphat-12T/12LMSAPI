require('dotenv').config();

require('dotenv').config();

const emailConfig = {
    // SMTP Configuration
    smtp: {
        host: process.env.SMTP_HOST || 'smtp.office365.com',
        port: process.env.SMTP_PORT || 587, // Office365 ใช้ port 587 สำหรับ STARTTLS
        secure: process.env.SMTP_SECURE === 'true', // false สำหรับ STARTTLS, true สำหรับ SSL/TLS
        auth: {
            user: process.env.SMTP_USER || 'notification@f-plus.co.th',
            pass: process.env.SMTP_PASS || '123131asdasd'
        },
        // เพิ่มการตั้งค่า TLS สำหรับ Office365
        tls: {
            rejectUnauthorized: false,
            ciphers: 'SSLv3'
        }
    },
    
    // Default sender information
    defaultFrom: {
        name: process.env.EMAIL_FROM_NAME || 'F-Plus Notification System',
        email: process.env.SMTP_USER || 'notification@f-plus.co.th'
    },
    
    // Email templates
    templates: {
        // Welcome email template
        welcome: {
            subject: 'ยินดีต้อนรับสู่ระบบ 12LMS API',
            html: `
                <div style="font-family: 'Sarabun', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #2c3e50; text-align: center;">ยินดีต้อนรับสู่ระบบ 12LMS API</h2>
                    <p>สวัสดีครับ/ค่ะ คุณ {fullName}</p>
                    <p>บัญชีผู้ใช้ของคุณได้ถูกสร้างขึ้นเรียบร้อยแล้วในระบบ 12LMS API</p>
                    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p><strong>ข้อมูลบัญชี:</strong></p>
                        <p>รหัสพนักงาน: {employeeID}</p>
                        <p>ชื่อ-นามสกุล: {fullName}</p>
                        <p>แผนก: {department}</p>
                        <p>ตำแหน่ง: {position}</p>
                    </div>
                    <p>หากมีคำถามหรือต้องการความช่วยเหลือ กรุณาติดต่อทีม IT Support</p>
                    <p>ขอบคุณที่ใช้บริการ</p>
                    <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                    <p style="font-size: 12px; color: #7f8c8d; text-align: center;">
                        ข้อความนี้ถูกส่งจากระบบอัตโนมัติ กรุณาอย่าตอบกลับ
                    </p>
                </div>
            `
        },
        
        // Password reset template
        passwordReset: {
            subject: 'รีเซ็ตรหัสผ่าน - 12LMS API',
            html: `
                <div style="font-family: 'Sarabun', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #e74c3c; text-align: center;">รีเซ็ตรหัสผ่าน</h2>
                    <p>สวัสดีครับ/ค่ะ คุณ {fullName}</p>
                    <p>เราได้รับคำขอรีเซ็ตรหัสผ่านสำหรับบัญชีของคุณ</p>
                    <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border: 1px solid #ffeaa7;">
                        <p><strong>รหัสยืนยัน:</strong></p>
                        <h1 style="text-align: center; color: #e74c3c; letter-spacing: 5px; font-size: 32px;">{resetCode}</h1>
                        <p style="text-align: center; color: #e74c3c;"><strong>รหัสนี้จะหมดอายุใน 10 นาที</strong></p>
                    </div>
                    <p>หากคุณไม่ได้ขอรีเซ็ตรหัสผ่าน กรุณาละเว้นข้อความนี้</p>
                    <p>หากมีปัญหา กรุณาติดต่อทีม IT Support</p>
                    <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                    <p style="font-size: 12px; color: #7f8c8d; text-align: center;">
                        ข้อความนี้ถูกส่งจากระบบอัตโนมัติ กรุณาอย่าตอบกลับ
                    </p>
                </div>
            `
        },
        
        // Notification template
        notification: {
            subject: 'แจ้งเตือน - 12LMS API',
            html: `
                <div style="font-family: 'Sarabun', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #3498db; text-align: center;">{title}</h2>
                    <p>สวัสดีครับ/ค่ะ</p>
                    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p>{message}</p>
                    </div>
                    <p>หากมีคำถามหรือต้องการความช่วยเหลือ กรุณาติดต่อทีม IT Support</p>
                    <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                    <p style="font-size: 12px; color: #7f8c8d; text-align: center;">
                        ข้อความนี้ถูกส่งจากระบบอัตโนมัติ กรุณาอย่าตอบกลับ
                    </p>
                </div>
            `
        },
        
        // Report template
        report: {
            subject: 'รายงาน - 12LMS API',
            html: `
                <div style="font-family: 'Sarabun', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #27ae60; text-align: center;">{title}</h2>
                    <p>สวัสดีครับ/ค่ะ</p>
                    <p>รายงาน {reportType} ได้ถูกสร้างขึ้นเรียบร้อยแล้ว</p>
                    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p><strong>รายละเอียดรายงาน:</strong></p>
                        <p>ประเภท: {reportType}</p>
                        <p>วันที่สร้าง: {createdDate}</p>
                        <p>สร้างโดย: {createdBy}</p>
                        {reportDetails}
                    </div>
                    <p>รายงานนี้ถูกแนบมาพร้อมกับอีเมลนี้</p>
                    <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                    <p style="font-size: 12px; color: #7f8c8d; text-align: center;">
                        ข้อความนี้ถูกส่งจากระบบอัตโนมัติ กรุณาอย่าตอบกลับ
                    </p>
                </div>
            `
        }
    }
};

module.exports = emailConfig;
