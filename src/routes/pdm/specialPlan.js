const express = require('express');
const router = express.Router();
const { setupLogger } = require('../../utils/logger');
const { getSpecialPlanData, updateSpecialPlanRemark, syncSpecialPlanData, sendSpecialPlanEmail, sendSpecialPlanSummaryEmail } = require('../../controllers/specialPlanController');

const logger = setupLogger();

/**
 * GET /api/special-plan
 * Get special plan data by calling page_Special_Plan stored procedure
 * Query Parameters:
 * - p1: Parameter p1 for stored procedure (optional, default: '000')
 */
router.get('/', async (req, res) => {
  try {
    const { p1 } = req.query;
    
    logger.info('Processing special plan request:', { p1 });

    // เรียก function เพื่อดึงข้อมูล พร้อมส่ง parameter p1
    const result = await getSpecialPlanData({ p1 });

    logger.info('Special plan request completed successfully:', {
      p1,
      resultCount: Array.isArray(result) ? result.length : 'N/A'
    });

    res.status(200).json({
      success: true,
      data: result,
      message: 'Special plan data retrieved successfully'
    });

  } catch (error) {
    logger.error('Error in special plan route:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve special plan data',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/special-plan/update-remark
 * Update remark for specific PO and product in special plan
 * Body Parameters:
 * - po_no: Purchase Order number
 * - prd_id: Product ID
 * - note: Note/remark to update
 * - empId: Employee ID
 */
router.post('/update-remark', async (req, res) => {
  try {
    const { po_no, prd_id, note, empId } = req.body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!po_no) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field',
        message: 'po_no is required'
      });
    }

    if (!prd_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field',
        message: 'prd_id is required'
      });
    }

    if (!empId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field',
        message: 'empId is required'
      });
    }

    logger.info('Processing update remark request:', {
      po_no,
      prd_id,
      note: note || '',
      empId
    });

    // เรียก function เพื่อ update remark
    const result = await updateSpecialPlanRemark({
      po_no,
      prd_id,
      note: note || '',
      empId
    });

    logger.info('Update remark completed successfully:', {
      po_no,
      prd_id,
      empId
    });

    res.status(200).json({
      success: true,
      data: result,
      message: 'Special plan remark updated successfully'
    });

  } catch (error) {
    logger.error('Error in update remark route:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update special plan remark',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/special-plan/sync-data
 * Sync special plan data by calling page_Special_Plan stored procedure
 * Body Parameters:
 * - dateNow: Current date for sync (optional, default: current date)
 * - dateBackThreeMonth: Date 3 months back for sync (optional, default: 3 months ago)
 */
router.post('/sync-data', async (req, res) => {
  try {
    let { dateNow, dateBackThreeMonth } = req.body;

    // ถ้าไม่ระบุ dateNow ให้ใช้วันที่ปัจจุบัน
    if (!dateNow) {
      const now = new Date();
      dateNow = now.toISOString().slice(0, 10).replace(/-/g, ''); // Format: YYYYMMDD
    }

    // ถ้าไม่ระบุ dateBackThreeMonth ให้คำนวณจาก 3 เดือนที่แล้ว
    if (!dateBackThreeMonth) {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      dateBackThreeMonth = threeMonthsAgo.toISOString().slice(0, 10).replace(/-/g, ''); // Format: YYYYMMDD
    }

    logger.info('Processing sync data request:', {
      dateNow,
      dateBackThreeMonth
    });

    // เรียก function เพื่อ sync data
    const result = await syncSpecialPlanData({
      dateNow,
      dateBackThreeMonth
    });

    logger.info('Sync data completed successfully:', {
      dateNow,
      dateBackThreeMonth
    });


    res.status(200).json({
      success: true,
      data: result,
      message: 'Special plan data synced successfully'
    });

  } catch (error) {
    logger.error('Error in sync data route:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync special plan data',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/special-plan/send-email
 * Send email notification for special plan
 * Body Parameters:
 * - po_no: Purchase Order number (required)
 * - recipients: Email recipients - can be string or array (required)
 * - emailType: Type of email ('notification', 'reminder', 'status_update') (optional, default: 'notification')
 * - customMessage: Custom message (optional)
 * - empId: Employee ID who triggered the email (required)
 */
router.post('/send-email', async (req, res) => {
  try {
    const { po_no, recipients, emailType, customMessage, empId } = req.body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!po_no) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field',
        message: 'po_no is required'
      });
    }

    if (!recipients) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field',
        message: 'recipients is required'
      });
    }

    if (!empId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field',
        message: 'empId is required'
      });
    }

    // ตรวจสอบรูปแบบ recipients
    let emailRecipients = recipients;
    if (typeof recipients === 'string') {
      // แยกอีเมลหลายตัวด้วย comma หรือ semicolon
      emailRecipients = recipients.split(/[,;]/).map(email => email.trim()).filter(email => email);
    } else if (!Array.isArray(recipients)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid recipients format',
        message: 'recipients must be string or array'
      });
    }

    // ตรวจสอบ emailType ที่อนุญาต
    const allowedEmailTypes = ['notification', 'reminder', 'status_update'];
    if (emailType && !allowedEmailTypes.includes(emailType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email type',
        message: `emailType must be one of: ${allowedEmailTypes.join(', ')}`
      });
    }

    logger.info('Processing send email request:', {
      po_no,
      recipients: emailRecipients,
      emailType: emailType || 'notification',
      empId,
      hasCustomMessage: !!customMessage
    });

    // เรียก function เพื่อส่งเมล
    const result = await sendSpecialPlanEmail({
      po_no,
      recipients: emailRecipients,
      emailType: emailType || 'notification',
      customMessage,
      empId
    });

    logger.info('Send email completed successfully:', {
      po_no,
      emailType: emailType || 'notification',
      empId,
      success: result.success
    });

    res.status(200).json({
      success: true,
      data: result,
      message: 'ส่งเมลเรียบร้อยแล้ว'
    });

  } catch (error) {
    logger.error('Error in send email route:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send email',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/special-plan/send-bulk-email
 * Send bulk email notifications for multiple POs
 * Body Parameters:
 * - po_list: Array of PO numbers (required)
 * - recipients: Email recipients - can be string or array (required)
 * - emailType: Type of email ('notification', 'reminder', 'status_update') (optional, default: 'notification')
 * - customMessage: Custom message (optional)
 * - empId: Employee ID who triggered the email (required)
 */
router.post('/send-bulk-email', async (req, res) => {
  try {
    const { po_list, recipients, emailType, customMessage, empId } = req.body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!po_list || !Array.isArray(po_list) || po_list.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field',
        message: 'po_list is required and must be non-empty array'
      });
    }

    if (!recipients) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field',
        message: 'recipients is required'
      });
    }

    if (!empId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field',
        message: 'empId is required'
      });
    }

    // ตรวจสอบรูปแบบ recipients
    let emailRecipients = recipients;
    if (typeof recipients === 'string') {
      emailRecipients = recipients.split(/[,;]/).map(email => email.trim()).filter(email => email);
    } else if (!Array.isArray(recipients)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid recipients format',
        message: 'recipients must be string or array'
      });
    }

    // ตรวจสอบ emailType ที่อนุญาต
    const allowedEmailTypes = ['notification', 'reminder', 'status_update'];
    if (emailType && !allowedEmailTypes.includes(emailType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email type',
        message: `emailType must be one of: ${allowedEmailTypes.join(', ')}`
      });
    }

    logger.info('Processing send bulk email request:', {
      poCount: po_list.length,
      recipients: emailRecipients,
      emailType: emailType || 'notification',
      empId,
      hasCustomMessage: !!customMessage
    });

    // ส่งเมลทีละ PO
    const results = [];
    const errors = [];

    for (const po_no of po_list) {
      try {
        const result = await sendSpecialPlanEmail({
          po_no,
          recipients: emailRecipients,
          emailType: emailType || 'notification',
          customMessage,
          empId
        });
        results.push({ po_no, success: true, result });
      } catch (error) {
        logger.error(`Error sending email for PO ${po_no}:`, error);
        errors.push({ po_no, success: false, error: error.message });
      }
    }

    const successCount = results.length;
    const errorCount = errors.length;

    logger.info('Send bulk email completed:', {
      totalPOs: po_list.length,
      successCount,
      errorCount,
      emailType: emailType || 'notification',
      empId
    });

    res.status(200).json({
      success: true,
      data: {
        totalPOs: po_list.length,
        successCount,
        errorCount,
        results,
        errors
      },
      message: `ส่งเมลเรียบร้อยแล้ว ${successCount}/${po_list.length} PO${errorCount > 0 ? ` (มีข้อผิดพลาด ${errorCount} PO)` : ''}`
    });

  } catch (error) {
    logger.error('Error in send bulk email route:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send bulk email',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/special-plan/send-summary-email
 * Send summary email for special plan data
 * Body Parameters:
 * - totalRecords: Total number of records (required)
 * - poList: Array of PO numbers (required)
 * - poDetails: Array of PO details with record counts (optional)
 * - recipients: Email recipients - can be string or array (required)
 * - empId: Employee ID who triggered the email (required)
 */
router.post('/send-summary-email', async (req, res) => {
  try {
    const { totalRecords, poList, poDetails, recipients, empId } = req.body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (totalRecords === undefined || totalRecords === null) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field',
        message: 'totalRecords is required'
      });
    }

    if (!poList || !Array.isArray(poList) || poList.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field',
        message: 'poList is required and must be non-empty array'
      });
    }

    if (!recipients) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field',
        message: 'recipients is required'
      });
    }

    if (!empId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field',
        message: 'empId is required'
      });
    }

    // ตรวจสอบรูปแบบ recipients
    let emailRecipients = recipients;
    if (typeof recipients === 'string') {
      emailRecipients = recipients.split(/[,;]/).map(email => email.trim()).filter(email => email);
    } else if (!Array.isArray(recipients)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid recipients format',
        message: 'recipients must be string or array'
      });
    }

    logger.info('Processing send summary email request:', {
      totalRecords,
      poCount: poList.length,
      recipients: emailRecipients,
      empId
    });

    // เรียก function เพื่อส่งเมลสรุป
    const result = await sendSpecialPlanSummaryEmail({
      totalRecords,
      poList,
      poDetails: poDetails || [],
      recipients: emailRecipients,
      empId
    });

    logger.info('Send summary email completed successfully:', {
      totalRecords,
      poCount: poList.length,
      empId,
      success: result.success
    });

    res.status(200).json({
      success: true,
      data: result,
      message: 'ส่งเมลสรุปเรียบร้อยแล้ว'
    });

  } catch (error) {
    logger.error('Error in send summary email route:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send summary email',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
