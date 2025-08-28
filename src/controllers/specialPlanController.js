const { exec } = require('../config/sequelize');
const { setupLogger } = require('../utils/logger');

const logger = setupLogger();

/**
 * Get status name based on status_op values in line items
 * @param {Array} lineItems - Array of line items
 * @returns {string} Status name in Thai
 */
const getStatusName = (lineItems) => {
  try {
    if (!Array.isArray(lineItems) || lineItems.length === 0) {
      return 'ไม่ระบุสถานะ';
    }

    // ตรวจสอบว่ามี status_op = '000' อยู่หรือไม่
    const hasPendingStatus = lineItems.some(item => item.status_op === '000');
    
    if (hasPendingStatus) {
      return 'รอดำเนินการ';
    }

    // ตรวจสอบว่าทุก status_op เป็น '001' หรือไม่
    const allCompleted = lineItems.every(item => item.status_op === '001');
    
    if (allCompleted) {
      return 'ดำเนินการเสร็จสิ้น';
    }

    // กรณีอื่นๆ (เช่น มี status_op อื่นๆ)
    return 'สถานะอื่นๆ';
  } catch (error) {
    logger.error('Error determining status name:', error);
    return 'ไม่ระบุสถานะ';
  }
};

/**
 * Process and group special plan data by PO number
 * @param {Array} rawData - Raw data from stored procedure
 * @returns {Array} Grouped data structure
 */
const processSpecialPlanData = (rawData) => {
  try {
    if (!Array.isArray(rawData) || rawData.length === 0) {
      return [];
    }

    // ใช้ Map เพื่อจัดกลุ่มข้อมูลตาม po_no
    const poGroups = new Map();

    rawData.forEach(item => {
      const poNo = item.po_no;
      
      if (!poGroups.has(poNo)) {
        // สร้างข้อมูล header สำหรับ PO นี้
        poGroups.set(poNo, {
          po_no: poNo,
          date_po: item.date_po,
          ref_po_no: item.ref_po_no,
          status_po: item.status_po,
          wh_code: item.wh_code,
          cus_code: item.cus_code,
          cus_name: item.cus_name,
          cus_tel: item.cus_tel,
          cus_addr: item.cus_addr,
          sale_code: item.sale_code,
          sale_descript: item.sale_descript,
          created_at: item.created_at,
          last_update_at: item.last_update_at,
          date_send_mail1: item.date_send_mail1,
          send_mail_status1: item.send_mail_status1,
          send_mail_status2: item.send_mail_status2,
          create_date: item.create_date,
          date_send_mail2: item.date_send_mail2,
          line_items: []
        });
      }

      // เพิ่ม line item พร้อมข้อมูล note, empId, status_op
      const poGroup = poGroups.get(poNo);
      poGroup.line_items.push({
        line_no: item.line_no,
        prd_id: item.prd_id,
        prd_name: item.prd_name,
        quantity: item.quantity,
        note: item.note,
        empId: item.empId,
        status_op: item.status_op
      });
    });

    // แปลง Map เป็น Array และเพิ่ม statusName
    const result = Array.from(poGroups.values()).map(poGroup => {
      // เพิ่ม statusName ตาม status_op ของ line items
      poGroup.statusName = getStatusName(poGroup.line_items);
      return poGroup;
    });
    
    logger.info('Special plan data processed successfully:', {
      originalCount: rawData.length,
      groupedCount: result.length,
      totalLineItems: result.reduce((sum, po) => sum + po.line_items.length, 0)
    });

    return result;
  } catch (error) {
    logger.error('Error processing special plan data:', error);
    throw new Error(`Failed to process special plan data: ${error.message}`);
  }
};

/**
 * Get special plan data by calling page_Special_Plan stored procedure
 * @param {Object} params - Parameters for the stored procedure
 * @param {string} params.p1 - Parameter p1 for stored procedure (default: '000')
 * @returns {Promise<Array>} Processed special plan data grouped by PO
 */
const getSpecialPlanData = async (params = {}) => {
  try {
    // ใช้ค่า p1 จาก params หรือใช้ค่า default '000'
    const p1Value = params.p1 || '000';
    
    logger.info('Executing page_Special_Plan with getData:', { p1: p1Value, ...params });

    const result = await exec('page_Special_Plan', {
      hcase: 'getData',
      p1: p1Value,
      p2: '',
      p3: '',
      p4: '',
      p5: '',
      p6: '',
      p7: '',
      p8: '',
      p9: '',
      p10: ''
    });

    logger.info('Raw special plan data retrieved successfully:', { 
      resultType: typeof result, 
      isArray: Array.isArray(result), 
      length: Array.isArray(result) ? result.length : 'N/A' 
    });

    // ประมวลผลและจัดกลุ่มข้อมูล
    const processedData = processSpecialPlanData(result);

    return processedData;
  } catch (error) {
    logger.error('Error in getSpecialPlanData:', {
      error: error.message,
      stack: error.stack,
      params
    });
    throw error;
  }
};

/**
 * Update special plan remark by calling page_Special_Plan stored procedure
 * @param {Object} params - Parameters for the stored procedure
 * @param {string} params.po_no - Purchase Order number
 * @param {string} params.prd_id - Product ID
 * @param {string} params.note - Note/remark to update
 * @param {string} params.empId - Employee ID
 * @returns {Promise<Object>} Update result from stored procedure
 */
const updateSpecialPlanRemark = async (params) => {
  try {
    const { po_no, prd_id, note, empId } = params;

    logger.info('Executing page_Special_Plan with updateRemarkSp:', {
      po_no,
      prd_id,
      note,
      empId
    });

    const result = await exec('page_Special_Plan', {
      hcase: 'updateRemarkSp',
      p1: po_no || '',
      p2: prd_id || '',
      p3: note || '',
      p4: empId || '',
      p5: '',
      p6: '',
      p7: '',
      p8: '',
      p9: '',
      p10: ''
    });

    logger.info('Special plan remark updated successfully:', { 
      po_no,
      prd_id,
      empId,
      resultType: typeof result, 
      isArray: Array.isArray(result), 
      length: Array.isArray(result) ? result.length : 'N/A' 
    });

    return result;
  } catch (error) {
    logger.error('Error in updateSpecialPlanRemark:', {
      error: error.message,
      stack: error.stack,
      params: { po_no, prd_id, note, empId }
    });
    throw error;
  }
};

/**
 * Sync special plan data by calling page_Special_Plan stored procedure
 * @param {Object} params - Parameters for the stored procedure
 * @param {string} params.dateNow - Current date for sync (format: YYYYMMDD)
 * @param {string} params.dateBackThreeMonth - Date 3 months back for sync (format: YYYYMMDD)
 * @returns {Promise<Object>} Sync result from stored procedure
 */
const syncSpecialPlanData = async (params) => {
  try {
    const { dateNow, dateBackThreeMonth } = params;

    logger.info('Executing page_Special_Plan with SyncData:', {
      dateNow,
      dateBackThreeMonth
    });

    const result = await exec('page_Special_Plan', {
      hcase: 'SyncData',
      p1: dateNow || '',
      p2: dateBackThreeMonth || '',
      p3: '',
      p4: '',
      p5: '',
      p6: '',
      p7: '',
      p8: '',
      p9: '',
      p10: ''
    });

    logger.info('Special plan data synced successfully:', { 
      dateNow,
      dateBackThreeMonth,
      resultType: typeof result, 
      isArray: Array.isArray(result), 
      length: Array.isArray(result) ? result.length : 'N/A' 
    });

    return result;
  } catch (error) {
    logger.error('Error in syncSpecialPlanData:', {
      error: error.message,
      stack: error.stack,
      params: { dateNow, dateBackThreeMonth }
    });
    throw error;
  }
};

module.exports = {
  getSpecialPlanData,
  processSpecialPlanData,
  getStatusName,
  updateSpecialPlanRemark,
  syncSpecialPlanData
};
