const { exec } = require('../config/sequelize');
const { setupLogger } = require('../utils/logger');
const emailService = require('../utils/emailService');
const axios = require('axios');

const logger = setupLogger();

const getStatusPoName = (statusPo) => {
  try {
    if (!statusPo) {
      return 'ไม่ระบุสถานะ';
    }

    // กำหนดชื่อสถานะตามแผนผังลำดับงาน
    const statusNames = {
      '22': 'ออเดอร์เข้า',
      '33': 'จองของเพื่อส่ง',
      '44': 'จัดสินค้า',
      '66': 'ตัด stock',
      '77': 'ออก inv',
      '90': 'ยกเลิก',
      '99': 'ยกเลิก'
    };

    return statusNames[statusPo] || `สถานะที่ไม่รู้จัก: ${statusPo}`;
  } catch (error) {
    logger.error('Error getting PO status name:', error);
    return 'ไม่ระบุสถานะ';
  }
};

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
          status_po_name: getStatusPoName(item.status_po),
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

const sendRemarkUpdateEmail = async (po_no, prd_id, note, empId) => {
  try {
    logger.info('Sending remark update email:', { po_no, prd_id, empId });

    // ดึงข้อมูลรายละเอียด PO
    let poDetails = null;
    try {
      const detailResult = await exec('page_Special_Plan', {
        hcase: 'getDataDetail',
        p1: po_no || '',
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

      if (Array.isArray(detailResult) && detailResult.length > 0) {
        poDetails = detailResult;
        logger.info('PO details retrieved successfully:', { 
          po_no, 
          itemCount: detailResult.length 
        });
      }
    } catch (detailError) {
      logger.error('Failed to get PO details:', detailError);
      // ไม่หยุดการทำงาน หากดึงข้อมูลไม่สำเร็จ
    }

    // สร้างเนื้อหาเมล
    const subject = `ทดสอบ แจ้งเตือน แพลนพิเศษ ${po_no} จากฝ่ายผลิต`;
    const htmlContent = createRemarkUpdateEmailTemplate(po_no, prd_id, note, empId, poDetails);

    // ส่งเมล
    const emailResult = await emailService.sendEmail({
      to: 'woraphat.sris@onetwotrading.co.th',
      cc: ['thanatnon.jai@onetwotrading.co.th'],
      subject: subject,
      html: htmlContent
    });

    logger.info('Remark update email sent successfully:', {
      po_no,
      prd_id,
      messageId: emailResult.messageId
    });

    return emailResult;

  } catch (error) {
    logger.error('Error in sendRemarkUpdateEmail:', error);
    throw error;
  }
};

const createRemarkUpdateEmailTemplate = (po_no, prd_id, note, empId, poDetails) => {
  const currentDate = new Date().toLocaleDateString('th-TH');
  const currentTime = new Date().toLocaleTimeString('th-TH');
  
  // สร้างตารางรายการ item
  let itemsTable = '';
  if (poDetails && Array.isArray(poDetails) && poDetails.length > 0) {
    itemsTable = `
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
          ${poDetails.map(item => `
            <tr>
              <td style="border: 1px solid #ddd; padding: 3px; font-size: 14px;">${item.prd_id || ''}</td>
              <td style="border: 1px solid #ddd; padding: 3px; font-size: 14px;">${item.prd_name || ''}</td>
              <td style="border: 1px solid #ddd; padding: 3px; text-align: right; font-size: 14px;">${item.quantity || ''}</td>
              <td style="border: 1px solid #ddd; padding: 3px; font-size: 14px;">${item.note || ''}</td> 
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } else {
    itemsTable = '<p><em>ไม่พบข้อมูลรายการสินค้า</em></p>';
  }
  
  return `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
      <h2 style="font-size: 24px;">ทดสอบ แจ้งเตือน แพลนพิเศษ ${po_no} จากฝ่ายผลิต</h2>

      ${itemsTable}
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
  `;
};

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

    // ตรวจสอบเงื่อนไข lastRow = 0 ก่อนส่งเมล
    let shouldSendEmail = false;
    if (Array.isArray(result) && result.length > 0) {
      const firstResult = result[0];
      if (firstResult && firstResult.lastRow == 0) {
        shouldSendEmail = true;
        logger.info('lastRow = 0, sending remark update email:', { 
          po_no, 
          prd_id, 
          lastRow: firstResult.lastRow 
        });
      } else {
        logger.info('lastRow != 0, skipping email:', { 
          po_no, 
          prd_id, 
          lastRow: firstResult?.lastRow 
        });
      }
    }

    // ส่งเมลแจ้งเตือนเฉพาะเมื่อ lastRow = 0
    if (shouldSendEmail) {
      try {
        await sendRemarkUpdateEmail(po_no, prd_id, note, empId);
      } catch (emailError) {
        logger.error('Failed to send remark update email:', emailError);
        // ไม่ throw error เพื่อไม่ให้ส่งผลต่อการอัพเดท remark
      }
    }

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

const sendSpecialPlanSummaryEmail = async (params) => {
  try {
    const { totalRecords, poList, poDetails, recipients, empId, cc } = params;

    logger.info('Sending special plan summary email:', {
      totalRecords,
      poCount: poList.length,
      recipients,
      empId
    });

    // สร้างเนื้อหาเมลสรุป
    const subject = `ทดสอบ แจ้งเตือนแพลนพิเศษใหม่ ${totalRecords} รายการ`;
    const htmlContent = createSummaryEmailTemplate(totalRecords, poList, poDetails);

    // ส่งเมล
    // ถ้าต้องการ cc ให้เพิ่ม field cc ใน object ที่ส่งเข้าไป
    // ตัวอย่าง: cc: ['someone@example.com', 'another@example.com']
    const emailResult = await emailService.sendEmail({
      to: recipients,
      cc: cc || undefined, // เพิ่ม cc ถ้ามีใน params
      subject: subject,
      html: htmlContent
    });

    logger.info('Special plan summary email sent successfully:', {
      totalRecords,
      poCount: poList.length,
      messageId: emailResult.messageId
    });

    return {
      success: true,
      message: 'ส่งเมลสรุปเรียบร้อยแล้ว',
      emailResult,
      totalRecords,
      poCount: poList.length
    };

  } catch (error) {
    logger.error('Error in sendSpecialPlanSummaryEmail:', {
      error: error.message,
      stack: error.stack,
      params
    });
    throw error;
  }
};

const createSummaryEmailTemplate = (totalRecords, poList, poDetails) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2>แจ้งเตือน Special Plan เข้าใหม่ ${totalRecords} รายการ</h2>
      
      <p><strong>รายการใหม่:</strong> ${poList.join(',')}</p>
      
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
  `;
};

const updateEmailStatusForPOs = async (poList) => {
  try {
    logger.info('Updating email status for POs:', { poCount: poList.length, poList });

    const updateResults = [];
    
    // อัพเดทสถานะการส่งเมลสำหรับแต่ละ PO
    for (const poNo of poList) {
      try {
        const result = await exec('page_Special_Plan', {
          hcase: 'updateStatusSendmail',
          p1: poNo || '',
          p2: '01', // สถานะการส่งเมล
          p3: '',
          p4: '',
          p5: '',
          p6: '',
          p7: '',
          p8: '',
          p9: '',
          p10: ''
        });

        updateResults.push({
          po_no: poNo,
          success: true,
          result: result
        });

        logger.info(`Email status updated for PO: ${poNo}`);

      } catch (error) {
        logger.error(`Failed to update email status for PO: ${poNo}`, error);
        updateResults.push({
          po_no: poNo,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = updateResults.filter(r => r.success).length;
    const errorCount = updateResults.filter(r => !r.success).length;

    logger.info('Email status update completed:', {
      totalPOs: poList.length,
      successCount,
      errorCount
    });

    return {
      success: true,
      message: `Updated email status for ${successCount}/${poList.length} POs`,
      results: updateResults,
      successCount,
      errorCount
    };

  } catch (error) {
    logger.error('Error in updateEmailStatusForPOs:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to update email status for POs'
    };
  }
};

const sendSummaryEmailForNewRecords = async (records) => {
  try {
    logger.info('Starting to send summary email for new records:', { recordCount: records.length });

    // จัดกลุ่มข้อมูลตาม po_no และนับจำนวนรายการใหม่
    const poGroups = new Map();
    
    records.forEach(record => {
      const poNo = record.po_no;
      
      // ตรวจสอบว่ามีข้อมูลใหม่หรือไม่ (status_op = '000' และ send_mail_status = '0')
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
    const totalNewRecords = poGroups.size;

    logger.info('PO grouping completed:', {
      totalRecords: records.length,
      uniquePOs: totalNewRecords,
      poGroups: Array.from(poGroups.entries())
    });

    // ถ้าไม่มีข้อมูลใหม่ ไม่ต้องส่งเมล
    if (totalNewRecords === 0) {
      logger.info('No new records found, skipping email');
      return {
        success: true,
        message: 'No new records to send email',
        totalRecords: 0,
        poList: []
      };
    }

    // สร้างรายการ PO
    const poList = Array.from(poGroups.keys());
    
    // ส่งเมลสรุป
      const emailResult = await sendSpecialPlanSummaryEmail({
        totalRecords: totalNewRecords,
        poList: poList,
        poDetails: Array.from(poGroups.entries()).map(([poNo, count]) => ({
          po_no: poNo,
          recordCount: count
        })),    
        // recipients: 'demand.supply@onetwotrading.co.th',
        recipients: 'woraphat.sris@onetwotrading.co.th',
        empId: 'SYSTEM_SYNC',
        cc: ['thanatnon.jai@onetwotrading.co.th']
      });

    // อัพเดทสถานะการส่งเมลสำหรับแต่ละ PO
    if (emailResult.success && poList.length > 0) {
      await updateEmailStatusForPOs(poList);
    }

    logger.info('Summary email sent successfully:', {
      totalRecords: totalNewRecords,
      poCount: poList.length,
      messageId: emailResult.emailResult?.messageId
    });

    return {
      success: true,
      message: 'Summary email sent successfully',
      totalRecords: totalNewRecords,
      poList: poList,
      emailResult: emailResult
    };

  } catch (error) {
    logger.error('Error in sendSummaryEmailForNewRecords:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to send summary email'
    };
  }
};

const syncSpecialPlanData = async (params) => {
  try {
    const { dateNow, dateBackThreeMonth } = params;

    logger.info('Executing page_Special_Plan with SyncData:', {
      dateNow,
      dateBackThreeMonth
    });

    // เรียก stored procedure และรอ response
    const result = await exec('page_Special_Plan', {
      hcase: 'SyncData',
      p1: dateBackThreeMonth || '',
      p2:  dateNow || '',
      p3: '',
      p4: '',
      p5: '',
      p6: '',
      p7: '',
      p8: '',
      p9: '',
      p10: ''
    });

    console.log('result', result);
    
    // ส่งเมลสรุปสำหรับข้อมูลใหม่
    let emailResult = null;
    if (Array.isArray(result) && result.length > 0) {
      emailResult = await sendSummaryEmailForNewRecords(result);
    }

    logger.info('Special plan data synced successfully:', { 
      dateNow,
      dateBackThreeMonth,
      resultType: typeof result, 
      isArray: Array.isArray(result), 
      length: Array.isArray(result) ? result.length : 'N/A',
      emailSent: emailResult ? emailResult.success : false
    });

    // ตรวจสอบและประมวลผล response
    let syncResult = {
      success: true,
      message: 'Sync completed successfully',
      dateNow,
      dateBackThreeMonth,
      data: null,
      insertedRecords: 0,
      emailSent: emailResult ? emailResult.success : false,
      emailResult: emailResult,
      errors: []
    };

    // ตรวจสอบว่า result เป็น array หรือไม่
    if (Array.isArray(result)) {
      syncResult.data = result;
      syncResult.insertedRecords = result.length;
      
      // ตรวจสอบข้อมูลที่ถูก insert ใหม่
      const newRecords = result.filter(record => 
        record.send_mail_status1 === '0' && 
        record.send_mail_status2 === '0' && 
        record.status_op === '000'
      );
      
      console.log('newRecords', newRecords); 
      if (newRecords.length > 0) {
        logger.info(`New records inserted: ${newRecords.length}`, {
          sampleRecords: newRecords.slice(0, 3) // แสดงตัวอย่าง 3 รายการแรก
        });
      }
      
    } else if (result && typeof result === 'object') {
      // กรณีที่ result เป็น object
      syncResult.data = result;
      
      // ตรวจสอบว่ามี error หรือไม่
      if (result.error || result.message) {
        syncResult.success = false;
        syncResult.message = result.error || result.message;
        syncResult.errors.push(result.error || result.message);
      }
      
    } else {
      // กรณีที่ result เป็น null หรือ undefined
      syncResult.success = false;
      syncResult.message = 'No data returned from sync operation';
      syncResult.errors.push('No data returned from sync operation');
    }

    // Log ผลลัพธ์สุดท้าย
    logger.info('Sync operation completed:', {
      success: syncResult.success,
      insertedRecords: syncResult.insertedRecords,
      message: syncResult.message
    });

    return syncResult;
  } catch (error) {
    logger.error('Error in syncSpecialPlanData:', {
      error: error.message,
      stack: error.stack,
      params: { dateNow, dateBackThreeMonth }
    });
    
    // ส่งคืน error response ที่มีโครงสร้างเดียวกัน
    return {
      success: false,
      message: 'Sync operation failed',
      dateNow,
      dateBackThreeMonth,
      data: null,
      insertedRecords: 0,
      errors: [error.message]
    };
  }
};

const sendSpecialPlanEmail = async (params) => {
  try {
    const { po_no, recipients, emailType = 'notification', customMessage, empId } = params;

    logger.info('Sending special plan email:', {
      po_no,
      recipients,
      emailType,
      empId
    });

    // ดึงข้อมูล special plan สำหรับ PO นี้
    const specialPlanData = await getSpecialPlanData({ p1: '000' });
    const poData = specialPlanData.find(po => po.po_no === po_no);

    if (!poData) {
      throw new Error(`ไม่พบข้อมูล PO ${po_no}`);
    }

    // สร้างเนื้อหาเมลตามประเภท
    let subject = '';
    let htmlContent = '';

    switch (emailType) {
      case 'notification':
        subject = `แจ้งเตือน Special Plan - PO: ${po_no}`;
        htmlContent = createNotificationEmailTemplate(poData, customMessage);
        break;
      case 'reminder':
        subject = `แจ้งเตือน Special Plan - เตือนความจำ PO: ${po_no}`;
        htmlContent = createReminderEmailTemplate(poData, customMessage);
        break;
      case 'status_update':
        subject = `อัพเดทสถานะ Special Plan - PO: ${po_no}`;
        htmlContent = createStatusUpdateEmailTemplate(poData, customMessage);
        break;
      default:
        subject = `Special Plan - PO: ${po_no}`;
        htmlContent = createDefaultEmailTemplate(poData, customMessage);
    }

    // ส่งเมล
    const emailResult = await emailService.sendEmail({
      to: recipients,
      cc: cc || undefined, // เพิ่ม cc ถ้ามีใน params
      subject: subject,
      html: htmlContent
    });

    // อัพเดทสถานะการส่งเมลในฐานข้อมูล
    if (emailResult.success) {
      await updateEmailStatus(po_no, emailType, empId);
    }

    logger.info('Special plan email sent successfully:', {
      po_no,
      emailType,
      recipients,
      messageId: emailResult.messageId
    });

    return {
      success: true,
      message: 'ส่งเมลเรียบร้อยแล้ว',
      emailResult,
      po_no,
      emailType,
      recipients
    };

  } catch (error) {
    logger.error('Error in sendSpecialPlanEmail:', {
      error: error.message,
      stack: error.stack,
      params
    });
    throw error;
  }
};

const createNotificationEmailTemplate = (poData, customMessage) => {
  const currentDate = new Date().toLocaleDateString('th-TH');
  
  return `
    <div style="font-family: 'Sarabun', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2c3e50; text-align: center;">แจ้งเตือน Special Plan</h2>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #34495e; margin-top: 0;">ข้อมูล Purchase Order</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #dee2e6;"><strong>PO Number:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${poData.po_no}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #dee2e6;"><strong>วันที่ PO:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${poData.date_po || 'ไม่ระบุ'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #dee2e6;"><strong>สถานะ:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${poData.status_po_name}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #dee2e6;"><strong>ลูกค้า:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${poData.cus_name} (${poData.cus_code})</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #dee2e6;"><strong>ผู้ขาย:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${poData.sale_descript} (${poData.sale_code})</td>
          </tr>
        </table>
      </div>

      <div style="background-color: #e8f4fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #2980b9; margin-top: 0;">รายการสินค้า</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #3498db; color: white;">
              <th style="padding: 10px; text-align: left;">รหัสสินค้า</th>
              <th style="padding: 10px; text-align: left;">ชื่อสินค้า</th>
              <th style="padding: 10px; text-align: right;">จำนวน</th>
              <th style="padding: 10px; text-align: left;">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            ${poData.line_items.map(item => `
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${item.prd_id}</td>
                <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${item.prd_name}</td>
                <td style="padding: 8px; border-bottom: 1px solid #dee2e6; text-align: right;">${item.quantity}</td>
                <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${item.status_op === '000' ? 'รอดำเนินการ' : item.status_op === '001' ? 'ดำเนินการเสร็จสิ้น' : 'สถานะอื่นๆ'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      ${customMessage ? `
        <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #ffeaa7;">
          <h3 style="color: #856404; margin-top: 0;">ข้อความเพิ่มเติม</h3>
          <p style="margin: 0;">${customMessage}</p>
        </div>
      ` : ''}

      <div style="background-color: #d4edda; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; color: #155724;"><strong>หมายเหตุ:</strong> กรุณาตรวจสอบข้อมูลและดำเนินการตามที่กำหนด</p>
      </div>

      <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
      <p style="font-size: 12px; color: #7f8c8d; text-align: center;">
        ส่งเมื่อ: ${currentDate} | ข้อความนี้ถูกส่งจากระบบอัตโนมัติ กรุณาอย่าตอบกลับ
      </p>
    </div>
  `;
};

const createReminderEmailTemplate = (poData, customMessage) => {
  const currentDate = new Date().toLocaleDateString('th-TH');
  
  return `
    <div style="font-family: 'Sarabun', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #e67e22; text-align: center;">🔔 เตือนความจำ Special Plan</h2>
      
      <div style="background-color: #fef9e7; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #f39c12;">
        <h3 style="color: #d68910; margin-top: 0;">⚠️ PO ที่ต้องดำเนินการ</h3>
        <p><strong>PO Number:</strong> ${poData.po_no}</p>
        <p><strong>สถานะปัจจุบัน:</strong> ${poData.status_po_name}</p>
        <p><strong>ลูกค้า:</strong> ${poData.cus_name}</p>
        <p><strong>วันที่สร้าง:</strong> ${poData.created_at || 'ไม่ระบุ'}</p>
      </div>

      <div style="background-color: #e8f4fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #2980b9; margin-top: 0;">รายการสินค้าที่รอดำเนินการ</h3>
        ${poData.line_items.filter(item => item.status_op === '000').map(item => `
          <div style="background-color: white; padding: 10px; margin: 5px 0; border-radius: 5px; border-left: 4px solid #f39c12;">
            <strong>${item.prd_id}</strong> - ${item.prd_name} (จำนวน: ${item.quantity})
            ${item.note ? `<br><em>หมายเหตุ: ${item.note}</em>` : ''}
          </div>
        `).join('')}
      </div>

      ${customMessage ? `
        <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #ffeaa7;">
          <h3 style="color: #856404; margin-top: 0;">ข้อความเตือน</h3>
          <p style="margin: 0;">${customMessage}</p>
        </div>
      ` : ''}

      <div style="background-color: #f8d7da; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; color: #721c24;"><strong>⚠️ กรุณาดำเนินการโดยเร็ว:</strong> รายการนี้รอดำเนินการมานานแล้ว</p>
      </div>

      <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
      <p style="font-size: 12px; color: #7f8c8d; text-align: center;">
        ส่งเมื่อ: ${currentDate} | ข้อความนี้ถูกส่งจากระบบอัตโนมัติ กรุณาอย่าตอบกลับ
      </p>
    </div>
  `;
};

const createStatusUpdateEmailTemplate = (poData, customMessage) => {
  const currentDate = new Date().toLocaleDateString('th-TH');
  
  return `
    <div style="font-family: 'Sarabun', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #27ae60; text-align: center;">✅ อัพเดทสถานะ Special Plan</h2>
      
      <div style="background-color: #d5f4e6; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #27ae60;">
        <h3 style="color: #1e8449; margin-top: 0;">📋 ข้อมูล PO</h3>
        <p><strong>PO Number:</strong> ${poData.po_no}</p>
        <p><strong>สถานะใหม่:</strong> ${poData.status_po_name}</p>
        <p><strong>ลูกค้า:</strong> ${poData.cus_name}</p>
        <p><strong>อัพเดทเมื่อ:</strong> ${poData.last_update_at || currentDate}</p>
      </div>

      <div style="background-color: #e8f4fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #2980b9; margin-top: 0;">สถานะรายการสินค้า</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #3498db; color: white;">
              <th style="padding: 10px; text-align: left;">รหัสสินค้า</th>
              <th style="padding: 10px; text-align: left;">ชื่อสินค้า</th>
              <th style="padding: 10px; text-align: right;">จำนวน</th>
              <th style="padding: 10px; text-align: left;">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            ${poData.line_items.map(item => `
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${item.prd_id}</td>
                <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${item.prd_name}</td>
                <td style="padding: 8px; border-bottom: 1px solid #dee2e6; text-align: right;">${item.quantity}</td>
                <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">
                  ${item.status_op === '000' ? '🟡 รอดำเนินการ' : 
                    item.status_op === '001' ? '🟢 ดำเนินการเสร็จสิ้น' : 
                    '🔴 สถานะอื่นๆ'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      ${customMessage ? `
        <div style="background-color: #d1ecf1; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #0c5460; margin-top: 0;">รายละเอียดการอัพเดท</h3>
          <p style="margin: 0;">${customMessage}</p>
        </div>
      ` : ''}

      <div style="background-color: #d4edda; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; color: #155724;"><strong>✅ สถานะได้รับการอัพเดทเรียบร้อยแล้ว</strong></p>
      </div>

      <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
      <p style="font-size: 12px; color: #7f8c8d; text-align: center;">
        ส่งเมื่อ: ${currentDate} | ข้อความนี้ถูกส่งจากระบบอัตโนมัติ กรุณาอย่าตอบกลับ
      </p>
    </div>
  `;
};

const createDefaultEmailTemplate = (poData, customMessage) => {
  return createNotificationEmailTemplate(poData, customMessage);
};

const updateEmailStatus = async (po_no, emailType, empId) => {
  try {
    logger.info('Updating email status:', { po_no, emailType, empId });

    // อัพเดทสถานะการส่งเมลในฐานข้อมูล
    const result = await exec('page_Special_Plan', {
      hcase: 'updateEmailStatus',
      p1: po_no || '',
      p2: emailType || '',
      p3: empId || '',
      p4: '',
      p5: '',
      p6: '',
      p7: '',
      p8: '',
      p9: '',
      p10: ''
    });

    logger.info('Email status updated successfully:', { po_no, emailType });
    return result;
  } catch (error) {
    logger.error('Error updating email status:', error);
    // ไม่ throw error เพื่อไม่ให้ส่งผลต่อการส่งเมล
    return { success: false, error: error.message };
  }
};

module.exports = {
  getSpecialPlanData,
  processSpecialPlanData,
  getStatusName,
  updateSpecialPlanRemark,
  syncSpecialPlanData,
  getStatusPoName,
  sendSpecialPlanEmail,
  sendSummaryEmailForNewRecords,
  sendSpecialPlanSummaryEmail,
  updateEmailStatusForPOs,
  sendRemarkUpdateEmail
};
