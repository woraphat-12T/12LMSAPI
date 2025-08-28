const express = require('express');
const router = express.Router();
const { getBacklogData, getBacklogDetail, getBacklogDataReorganized, getBacklogCustomerReason, getBacklogReasonOptions, updateBacklog, getBacklogItemList, exportData, getBacklogDataBl } = require('../../../controllers/manageOmsController');
const { validateRequiredParams } = require('../../../middleware/validation');

/**
 * @route GET /api/oms/manage/backlog
 * @desc Get backlog data
 * @access Private
 */
router.get('/', validateRequiredParams(['who']), async (req, res) => {
  try {
    const { who } = req.query;
    const result = await getBacklogData({ who });
    
    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(500).json(result);
    }

  } catch (error) {
    console.error('Error in backlog route:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route GET /api/oms/manage/backlog/reorganized
 * @desc Get backlog data (reorganized data)
 * @access Private
 */
router.get('/reorganized', validateRequiredParams(['who']), async (req, res) => {
  try {
    const { who } = req.query;
    const result = await getBacklogDataReorganized({ who });
    
    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(500).json(result);
    }

  } catch (error) {
    console.error('Error in backlog reorganized route:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route GET /api/oms/manage/backlog/detail
 * @desc Get backlog detail data (raw data)
 * @access Private
 */
router.get('/detail', validateRequiredParams(['who', 'provinceCode', 'date']), async (req, res) => {
  try {
    const { who, provinceCode, date } = req.query;
    const result = await getBacklogDetail({ who, provinceCode, date });
    
    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(500).json(result);
    }

  } catch (error) {
    console.error('Error in backlog detail route:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route GET /api/oms/manage/backlog/customer-reason
 * @desc Get backlog customer reason data
 * @access Private
 */
router.get('/customer-reason', validateRequiredParams(['who', 'codeProvince', 'date']), async (req, res) => {
  try {
    const { who, codeProvince, date } = req.query;
    const result = await getBacklogCustomerReason({ who, codeProvince, date });
    
    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(500).json(result);
    }

  } catch (error) {
    console.error('Error in backlog customer reason route:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route GET /api/oms/manage/backlog/reason-options
 * @desc Get backlog reason options data
 * @access Private
 */
router.get('/reason-options', async (req, res) => {
  try {
    const result = await getBacklogReasonOptions();
    
    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(500).json(result);
    }

  } catch (error) {
    console.error('Error in backlog reason options route:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route PUT /api/oms/manage/backlog/update
 * @desc Update backlog data
 * @access Private
 */
router.put('/update', validateRequiredParams(['poNo', 'note', 'noteEtc', 'postponeDelivery', 'empId']), async (req, res) => {
  try {
    const { poNo, note, noteEtc, postponeDelivery, empId } = req.body;
    const result = await updateBacklog({ poNo, note, noteEtc, postponeDelivery, empId });
    
    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(500).json(result);
    }

  } catch (error) {
    console.error('Error in backlog update route:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route GET /api/oms/manage/backlog/items
 * @desc Get backlog item list by PO number
 * @access Private
 */
router.get('/items', validateRequiredParams(['poNo']), async (req, res) => {
  try {
    const { poNo } = req.query;
    const result = await getBacklogItemList({ poNo });
    
    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(500).json(result);
    }

  } catch (error) {
    console.error('Error in backlog items route:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route GET /api/oms/manage/backlog/export
 * @desc Export data using dataExportEx stored procedure
 * @access Private
 */
router.get('/export', validateRequiredParams(['who']), async (req, res) => {
  try {
    const { who } = req.query;
    const result = await exportData({ who });
    
    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(500).json(result);
    }

  } catch (error) {
    console.error('Error in backlog export route:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route GET /api/oms/manage/backlog/data-bl
 * @desc Get backlog data using getdata_bl case (may take 40-60 seconds)
 * @access Private
 */
router.get('/data-bl', async (req, res) => {
  try {
    // ตั้งค่า timeout ให้ยาวขึ้นสำหรับ operation ที่ใช้เวลานาน
    req.setTimeout(120000); // 2 นาที
    
    const result = await getBacklogDataBl();
    
    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(500).json(result);
    }

  } catch (error) {
    console.error('Error in backlog data-bl route:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router; 