const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs').promises;
const emailConfig = require('../config/emailConfig');
const { setupLogger } = require('./logger');

const logger = setupLogger();

class EmailService {
    constructor() {
        this.transporter = null;
        this.initializeTransporter();
    }

    /**
     * เริ่มต้น transporter สำหรับการส่งเมล
     */
    async initializeTransporter() {
        try {
            this.transporter = nodemailer.createTransport({
                host: emailConfig.smtp.host,
                port: emailConfig.smtp.port,
                secure: emailConfig.smtp.secure,
                auth: {
                    user: emailConfig.smtp.auth.user,
                    pass: emailConfig.smtp.auth.pass
                },
                tls: {
                    rejectUnauthorized: false
                }
            });

            // ทดสอบการเชื่อมต่อ
            await this.transporter.verify();
            logger.info('Email transporter initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize email transporter:', error);
            this.transporter = null;
        }
    }

    /**
     * ส่งเมลแบบพื้นฐาน
     * @param {Object} options - ตัวเลือกการส่งเมล
     * @param {string|Array} options.to - อีเมลผู้รับ
     * @param {string|Array} options.cc - อีเมล CC (optional)
     * @param {string} options.subject - หัวข้อเมล
     * @param {string} options.text - เนื้อหาเมลแบบข้อความ
     * @param {string} options.html - เนื้อหาเมลแบบ HTML
     * @param {Array} options.attachments - ไฟล์แนบ
     * @param {string} options.from - อีเมลผู้ส่ง
     * @returns {Promise<Object>} ผลลัพธ์การส่งเมล
     */
    async sendEmail(options) {
        try {
            if (!this.transporter) {
                await this.initializeTransporter();
                if (!this.transporter) {
                    throw new Error('Email transporter not available');
                }
            }

            const mailOptions = {
                from: options.from || `${emailConfig.defaultFrom.name} <${emailConfig.defaultFrom.email}>`,
                to: options.to,
                cc: options.cc || undefined, // เพิ่ม cc
                subject: options.subject,
                text: options.text,
                html: options.html,
                attachments: options.attachments || []
            };

            const result = await this.transporter.sendMail(mailOptions);
            logger.info('Email sent successfully', { 
                messageId: result.messageId, 
                to: options.to,
                subject: options.subject 
            });

            return {
                success: true,
                messageId: result.messageId,
                message: 'อีเมลถูกส่งเรียบร้อยแล้ว'
            };
        } catch (error) {
            logger.error('Failed to send email:', error);
            return {
                success: false,
                error: error.message,
                message: 'ไม่สามารถส่งอีเมลได้'
            };
        }
    }

    /**
     * ส่งเมลต้อนรับสำหรับผู้ใช้ใหม่
     * @param {Object} userData - ข้อมูลผู้ใช้
     * @param {string} userData.email - อีเมลผู้ใช้
     * @param {string} userData.fullName - ชื่อ-นามสกุล
     * @param {string} userData.employeeID - รหัสพนักงาน
     * @param {string} userData.department - แผนก
     * @param {string} userData.position - ตำแหน่ง
     * @returns {Promise<Object>} ผลลัพธ์การส่งเมล
     */
    async sendWelcomeEmail(userData) {
        try {
            const template = emailConfig.templates.welcome;
            const html = template.html
                .replace('{fullName}', userData.fullName)
                .replace('{employeeID}', userData.employeeID)
                .replace('{department}', userData.department)
                .replace('{position}', userData.position);

            return await this.sendEmail({
                to: userData.email,
                subject: template.subject,
                html: html
            });
        } catch (error) {
            logger.error('Failed to send welcome email:', error);
            return {
                success: false,
                error: error.message,
                message: 'ไม่สามารถส่งอีเมลต้อนรับได้'
            };
        }
    }

    /**
     * ส่งเมลรีเซ็ตรหัสผ่าน
     * @param {Object} userData - ข้อมูลผู้ใช้
     * @param {string} userData.email - อีเมลผู้ใช้
     * @param {string} userData.fullName - ชื่อ-นามสกุล
     * @param {string} resetCode - รหัสรีเซ็ต
     * @returns {Promise<Object>} ผลลัพธ์การส่งเมล
     */
    async sendPasswordResetEmail(userData, resetCode) {
        try {
            const template = emailConfig.templates.passwordReset;
            const html = template.html
                .replace('{fullName}', userData.fullName)
                .replace('{resetCode}', resetCode);

            return await this.sendEmail({
                to: userData.email,
                subject: template.subject,
                html: html
            });
        } catch (error) {
            logger.error('Failed to send password reset email:', error);
            return {
                success: false,
                error: error.message,
                message: 'ไม่สามารถส่งอีเมลรีเซ็ตรหัสผ่านได้'
            };
        }
    }

    /**
     * ส่งเมลแจ้งเตือน
     * @param {Object} options - ตัวเลือกการส่งเมล
     * @param {string|Array} options.to - อีเมลผู้รับ
     * @param {string} options.title - หัวข้อการแจ้งเตือน
     * @param {string} options.message - ข้อความแจ้งเตือน
     * @returns {Promise<Object>} ผลลัพธ์การส่งเมล
     */
    async sendNotificationEmail(options) {
        try {
            const template = emailConfig.templates.notification;
            const html = template.html
                .replace('{title}', options.title)
                .replace('{message}', options.message);

            return await this.sendEmail({
                to: options.to,
                subject: template.subject,
                html: html
            });
        } catch (error) {
            logger.error('Failed to send notification email:', error);
            return {
                success: false,
                error: error.message,
                message: 'ไม่สามารถส่งอีเมลแจ้งเตือนได้'
            };
        }
    }

    /**
     * ส่งเมลพร้อมรายงาน
     * @param {Object} options - ตัวเลือกการส่งเมล
     * @param {string|Array} options.to - อีเมลผู้รับ
     * @param {string} options.reportType - ประเภทรายงาน
     * @param {string} options.title - หัวข้อรายงาน
     * @param {string} options.createdDate - วันที่สร้าง
     * @param {string} options.createdBy - สร้างโดย
     * @param {string} options.reportDetails - รายละเอียดรายงาน
     * @param {string} options.filePath - เส้นทางไฟล์รายงาน
     * @param {string} options.fileName - ชื่อไฟล์รายงาน
     * @returns {Promise<Object>} ผลลัพธ์การส่งเมล
     */
    async sendReportEmail(options) {
        try {
            const template = emailConfig.templates.report;
            let html = template.html
                .replace('{title}', options.title)
                .replace('{reportType}', options.reportType)
                .replace('{createdDate}', options.createdDate)
                .replace('{createdBy}', options.createdBy)
                .replace('{reportDetails}', options.reportDetails || '');

            const attachments = [];
            
            // เพิ่มไฟล์แนบถ้ามี
            if (options.filePath && options.fileName) {
                try {
                    const fileContent = await fs.readFile(options.filePath);
                    attachments.push({
                        filename: options.fileName,
                        content: fileContent
                    });
                } catch (fileError) {
                    logger.warn('Failed to attach report file:', fileError);
                }
            }

            return await this.sendEmail({
                to: options.to,
                subject: template.subject,
                html: html,
                attachments: attachments
            });
        } catch (error) {
            logger.error('Failed to send report email:', error);
            return {
                success: false,
                error: error.message,
                message: 'ไม่สามารถส่งอีเมลรายงานได้'
            };
        }
    }

    /**
     * ส่งเมลแบบกำหนดเอง
     * @param {Object} options - ตัวเลือกการส่งเมล
     * @param {string|Array} options.to - อีเมลผู้รับ
     * @param {string} options.subject - หัวข้อเมล
     * @param {string} options.html - เนื้อหาเมลแบบ HTML
     * @param {string} options.text - เนื้อหาเมลแบบข้อความ
     * @param {Array} options.attachments - ไฟล์แนบ
     * @returns {Promise<Object>} ผลลัพธ์การส่งเมล
     */
    async sendCustomEmail(options) {
        try {
            return await this.sendEmail({
                to: options.to,
                subject: options.subject,
                html: options.html,
                text: options.text,
                attachments: options.attachments
            });
        } catch (error) {
            logger.error('Failed to send custom email:', error);
            return {
                success: false,
                error: error.message,
                message: 'ไม่สามารถส่งอีเมลได้'
            };
        }
    }

    /**
     * ส่งเมลแบบ bulk (หลายคนพร้อมกัน)
     * @param {Array} recipients - รายการผู้รับ
     * @param {Object} emailOptions - ตัวเลือกการส่งเมล
     * @returns {Promise<Array>} ผลลัพธ์การส่งเมลทั้งหมด
     */
    async sendBulkEmail(recipients, emailOptions) {
        try {
            const results = [];
            
            for (const recipient of recipients) {
                const result = await this.sendEmail({
                    ...emailOptions,
                    to: recipient
                });
                results.push({
                    recipient,
                    result
                });
            }

            logger.info(`Bulk email sent to ${recipients.length} recipients`);
            return results;
        } catch (error) {
            logger.error('Failed to send bulk email:', error);
            return [{
                error: error.message,
                message: 'ไม่สามารถส่งอีเมลแบบ bulk ได้'
            }];
        }
    }

    /**
     * ตรวจสอบสถานะการเชื่อมต่อ SMTP
     * @returns {Promise<boolean>} สถานะการเชื่อมต่อ
     */
    async checkConnection() {
        try {
            if (!this.transporter) {
                await this.initializeTransporter();
            }
            
            if (this.transporter) {
                await this.transporter.verify();
                return true;
            }
            return false;
        } catch (error) {
            logger.error('SMTP connection check failed:', error);
            return false;
        }
    }

    /**
     * ปิดการเชื่อมต่อ transporter
     */
    async closeConnection() {
        try {
            if (this.transporter) {
                await this.transporter.close();
                this.transporter = null;
                logger.info('Email transporter connection closed');
            }
        } catch (error) {
            logger.error('Failed to close email transporter connection:', error);
        }
    }
}

// สร้าง instance เดียวของ EmailService
const emailService = new EmailService();

module.exports = emailService;
