const express = require('express');
const router = express.Router();
const { setupLogger } = require('../../utils/logger');
const { getSpecialPlanData, updateSpecialPlanRemark, syncSpecialPlanData } = require('../../controllers/specialPlanController');

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

module.exports = router;
