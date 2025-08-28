const { exec } = require('../config/sequelize');
const { setupLogger } = require('../utils/logger');

const logger = setupLogger();

/**
 * Get backlog data
 * @param {Object} params - Parameters object
 * @param {string} params.who - User identifier
 * @returns {Promise<Object>} Backlog data
 */
const getBacklogData = async (params) => {
  const { who = '' } = params;

  logger.info('Executing page_Backlog for backlog data', { who });

  try {
    const result = await exec('page_Backlog', {
      hcase: 'show_datamain',
      p1: who,
      p2: '', p3: '', p4: '', p5: '', p6: '', p7: '', p8: '', p9: '', p10: ''
    });

    logger.info('Backlog data result:', { 
      resultType: typeof result, 
      isArray: Array.isArray(result), 
      length: Array.isArray(result) ? result.length : 'N/A',
      who: who
    });

    return {
      success: true,
      data: result || [],
      who: who,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    logger.error('Error in getBacklogData:', {
      error: error.message,
      stack: error.stack,
      params: { who }
    });
    
    return {
      success: false,
      error: error.message,
      data: [],
      who: who,
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Get backlog detail data (raw data only)
 * @param {Object} params - Parameters object
 * @param {string} params.who - User identifier
 * @param {string} params.provinceCode - Province code
 * @param {string} params.date - Date in YYYY-MM-DD format
 * @returns {Promise<Object>} Backlog detail data
 */
const getBacklogDetail = async (params) => {
  const { who = '', provinceCode = '', date = '' } = params;

  logger.info('Executing page_Backlog for backlog detail data', { who, provinceCode, date });

  try {
    const result = await exec('page_Backlog', {
      hcase: 'show_po_detail',
      p1: who,
      p2: provinceCode,
      p3: date,
      p4: '', p5: '', p6: '', p7: '', p8: '', p9: '', p10: ''
    });

    logger.info('Backlog detail data result:', { 
      resultType: typeof result, 
      isArray: Array.isArray(result), 
      length: Array.isArray(result) ? result.length : 'N/A',
      who: who,
      provinceCode: provinceCode,
      date: date
    });

    return {
      success: true,
      data: result || [],
      who: who,
      provinceCode: provinceCode,
      date: date,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    logger.error('Error in getBacklogDetail:', {
      error: error.message,
      stack: error.stack,
      params: { who, provinceCode, date }
    });
    
    return {
      success: false,
      error: error.message,
      data: [],
      who: who,
      provinceCode: provinceCode,
      date: date,
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Get backlog data (reorganized data only)
 * @param {Object} params - Parameters object
 * @param {string} params.who - User identifier
 * @returns {Promise<Object>} Reorganized backlog data
 */
const getBacklogDataReorganized = async (params) => {
  const { who = '' } = params;

  logger.info('Executing page_Backlog for reorganized backlog data', { who });

  try {
    const result = await exec('page_Backlog', {
      hcase: 'show_datamain',
      p1: who,
      p2: '', p3: '', p4: '', p5: '', p6: '', p7: '', p8: '', p9: '', p10: ''
    });

    logger.info('Backlog data result for reorganization:', { 
      resultType: typeof result, 
      isArray: Array.isArray(result), 
      length: Array.isArray(result) ? result.length : 'N/A',
      who: who
    });

    // จัดข้อมูลใหม่ตามโครงสร้างที่ต้องการ
    const reorganizedData = reorganizeBacklogData(result || []);

    return {
      success: true,
      who: who,
      data: reorganizedData, 
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    logger.error('Error in getBacklogDataReorganized:', {
      error: error.message,
      stack: error.stack,
      params: { who }
    });
    
    return {
      success: false,
      error: error.message,
      reorganizedData: {
        provinceGroups: [],
        dateRangeTable: [],
        dateRange: {
          minDate: null,
          maxDate: null,
          allDates: []
        }
      },
      who: who,
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Reorganize backlog data by province and customer
 * @param {Array} data - Raw backlog data
 * @returns {Object} Reorganized data with province groups and date range table
 */
const reorganizeBacklogData = (data) => {
  if (!Array.isArray(data) || data.length === 0) {
    return {
      provinceGroups: [],
      dateRangeTable: []
    };
  }

  // หาวันที่เก่าสุดและใหม่สุด
  const allDates = data
    .map(item => item.date_create)
    .filter(date => date)
    .sort();
  
  const minDate = allDates[0];
  const maxDate = allDates[allDates.length - 1];

  // สร้างรายการวันที่ทั้งหมด
  const dateRange = generateDateRange(minDate, maxDate);

  // จัดกลุ่มตามจังหวัด
  const provinceGroups = {};
  
  data.forEach(item => {
    const provinceKey = `${item.code_province || 'null'}_${item.name_province || 'null'}`;
    
    if (!provinceGroups[provinceKey]) {
      provinceGroups[provinceKey] = {
        code_province: item.code_province,
        name_province: item.name_province,
        listCustomer: {}
      };
    }

    // จัดกลุ่มตามลูกค้า
    const customerKey = `${item.cus_code || 'unknown'}_${item.cus_name || 'unknown'}`;
    
    if (!provinceGroups[provinceKey].listCustomer[customerKey]) {
      provinceGroups[provinceKey].listCustomer[customerKey] = {
        cus_code: item.cus_code,
        cus_name: item.cus_name,
        listDate: []
      };
    }

    // เพิ่มข้อมูลวันที่
    provinceGroups[provinceKey].listCustomer[customerKey].listDate.push({
      date_create: item.date_create,
      po: item.po
    });
  });

  // แปลงเป็น array และจัดเรียงข้อมูล
  const reorganizedProvinceGroups = Object.values(provinceGroups).map(province => ({
    code_province: province.code_province || '00',
    name_province: province.name_province || 'อื่นๆ',
    listCustomer: Object.values(province.listCustomer).map(customer => ({
      cus_code: customer.cus_code,
      cus_name: customer.cus_name,
      listDate: customer.listDate.sort((a, b) => new Date(a.date_create) - new Date(b.date_create))
    }))
  }));

  // สร้างตารางข้อมูลตามช่วงวันที่
  const dateRangeTable = createDateRangeTable(reorganizedProvinceGroups, dateRange);

  return {
    // provinceGroups: reorganizedProvinceGroups,
    dateRangeTable: dateRangeTable,
    dateRange: {
      minDate: minDate,
      maxDate: maxDate,
      allDates: dateRange
    }
  };
};

/**
 * Generate date range between min and max dates
 * @param {string} minDate - Minimum date
 * @param {string} maxDate - Maximum date
 * @returns {Array} Array of dates
 */
const generateDateRange = (minDate, maxDate) => {
  if (!minDate || !maxDate) return [];
  
  const dates = [];
  const currentDate = new Date(minDate);
  const endDate = new Date(maxDate);
  
  while (currentDate <= endDate) {
    dates.push(currentDate.toISOString().split('T')[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dates;
};

/**
 * Create date range table with customer data
 * @param {Array} provinceGroups - Reorganized province groups
 * @param {Array} dateRange - Array of dates
 * @returns {Array} Date range table
 */
const createDateRangeTable = (provinceGroups, dateRange) => {
  const table = [];
  
  provinceGroups.forEach(province => {
    province.listCustomer.forEach(customer => {
      const customerRow = {
        code_province: province.code_province,
        name_province: province.name_province,
        cus_code: customer.cus_code,
        cus_name: customer.cus_name,
        dateData: {}
      };
      
      // สร้าง map ของข้อมูลวันที่
      const dateMap = {};
      customer.listDate.forEach(dateItem => {
        dateMap[dateItem.date_create] = dateItem.po;
      });
      
      // สร้าง dateData ใหม่ที่มีการแทรกข้อมูลรวมยอดระหว่างเดือน
      const newDateData = {};
      let currentMonth = null;
      
      dateRange.forEach(date => {
        const monthKey = date.substring(0, 7); // เอา YYYY-MM
        const monthName = getMonthName(date.substring(5, 7)); // แปลงเป็นชื่อเดือน
        
        // ถ้าเปลี่ยนเดือน ให้เพิ่มข้อมูลรวมยอดของเดือนก่อนหน้า
        if (currentMonth !== null && currentMonth !== monthKey) {
          const prevMonthName = getMonthName(currentMonth.substring(5, 7));
          const sumKey = `Sum_${prevMonthName}`;
          
          // คำนวณรวมยอดของเดือนก่อนหน้า
          let monthSum = 0;
          Object.keys(newDateData).forEach(key => {
            if (key.startsWith(currentMonth) && newDateData[key] !== '-') {
              monthSum += parseFloat(newDateData[key]) || 0;
            }
          });
          
          // เพิ่มข้อมูลรวมยอด
          if (monthSum > 0) {
            newDateData[sumKey] = monthSum;
          } else {
            newDateData[sumKey] = '-';
          }
        }
        
        // เพิ่มข้อมูลของวันที่
        newDateData[date] = dateMap[date] || '-';
        currentMonth = monthKey;
      });
      
      // เพิ่มข้อมูลรวมยอดของเดือนสุดท้าย
      if (currentMonth !== null) {
        const lastMonthName = getMonthName(currentMonth.substring(5, 7));
        const sumKey = `Sum_${lastMonthName}`;
        
        // คำนวณรวมยอดของเดือนสุดท้าย
        let monthSum = 0;
        Object.keys(newDateData).forEach(key => {
          if (key.startsWith(currentMonth) && newDateData[key] !== '-') {
            monthSum += parseFloat(newDateData[key]) || 0;
          }
        });
        
        // เพิ่มข้อมูลรวมยอด
        if (monthSum > 0) {
          newDateData[sumKey] = monthSum;
        } else {
          newDateData[sumKey] = '-';
        }
      }
      
      // กำหนด dateData ใหม่
      customerRow.dateData = newDateData;
      
      table.push(customerRow);
    });
  });
  
  return table;
};

/**
 * Get month name from month number
 * @param {string} monthNum - Month number (01-12)
 * @returns {string} Month name
 */
const getMonthName = (monthNum) => {
  const monthNames = {
    '01': '01', '02': '02', '03': '03', '04': '04',
    '05': '05', '06': '06', '07': '07', '08': '08',
    '09': '09', '10': '10', '11': '11', '12': '12'
  };
  
  return monthNames[monthNum] || monthNum;
};

/**
 * Get backlog customer reason data
 * @param {Object} params - Parameters object
 * @param {string} params.who - User identifier
 * @param {string} params.codeProvince - Province code
 * @param {string} params.date - Date in YYYY-MM-DD format
 * @returns {Promise<Object>} Backlog customer reason data
 */
const getBacklogCustomerReason = async (params) => {
  const { who = '', codeProvince = '', date = '' } = params;

  logger.info('Executing page_Backlog for customer reason data', { who, codeProvince, date });

  try {
    const result = await exec('page_Backlog', {
      hcase: 'show_list_cus_reason',
      p1: who,
      p2: codeProvince,
      p3: date,
      p4: '', p5: '', p6: '', p7: '', p8: '', p9: '', p10: ''
    });

    logger.info('Backlog customer reason data result:', { 
      resultType: typeof result, 
      isArray: Array.isArray(result), 
      length: Array.isArray(result) ? result.length : 'N/A',
      who: who,
      codeProvince: codeProvince,
      date: date
    });

    return {
      success: true,
      data: result || [],
      who: who,
      codeProvince: codeProvince,
      date: date,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    logger.error('Error in getBacklogCustomerReason:', {
      error: error.message,
      stack: error.stack,
      params: { who, codeProvince, date }
    });
    
    return {
      success: false,
      error: error.message,
      data: [],
      who: who,
      codeProvince: codeProvince,
      date: date,
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Get backlog reason options data
 * @param {Object} params - Parameters object (no parameters needed for this case)
 * @returns {Promise<Object>} Backlog reason options data
 */
const getBacklogReasonOptions = async (params = {}) => {
  logger.info('Executing page_Backlog for reason options data');

  try {
    const result = await exec('page_Backlog', {
      hcase: 'show_reason',
      p1: '', p2: '', p3: '', p4: '', p5: '', p6: '', p7: '', p8: '', p9: '', p10: ''
    });

    logger.info('Backlog reason options data result:', { 
      resultType: typeof result, 
      isArray: Array.isArray(result), 
      length: Array.isArray(result) ? result.length : 'N/A'
    });

    return {
      success: true,
      data: result || [],
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    logger.error('Error in getBacklogReasonOptions:', {
      error: error.message,
      stack: error.stack
    });
    
    return {
      success: false,
      error: error.message,
      data: [],
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Update backlog data
 * @param {Object} params - Parameters object
 * @param {string} params.poNo - PO number
 * @param {string} params.note - Note
 * @param {string} params.noteEtc - Additional note
 * @param {string} params.postponeDelivery - Postpone delivery date (YYYY-MM-DD format)
 * @param {string} params.empId - Employee ID
 * @returns {Promise<Object>} Update result
 */
const updateBacklog = async (params) => {
  const { 
    poNo = '', 
    note = '', 
    noteEtc = '', 
    postponeDelivery = '', 
    empId = '' 
  } = params;

  logger.info('Executing page_Backlog for update backlog data', { 
    poNo, note, noteEtc, postponeDelivery, empId 
  });

  try {
    const result = await exec('page_Backlog', {
      hcase: 'update_backlog',
      p1: poNo,
      p2: note,
      p3: noteEtc,
      p4: postponeDelivery,
      p5: empId,
      p6: '', p7: '', p8: '', p9: '', p10: ''
    });

    logger.info('Update backlog result:', { 
      resultType: typeof result, 
      isArray: Array.isArray(result), 
      length: Array.isArray(result) ? result.length : 'N/A',
      poNo, note, noteEtc, postponeDelivery, empId
    });

    return {
      success: true,
      data: result || [],
      poNo,
      note,
      noteEtc,
      postponeDelivery,
      empId,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    logger.error('Error in updateBacklog:', {
      error: error.message,
      stack: error.stack,
      params: { poNo, note, noteEtc, postponeDelivery, empId }
    });
    
    return {
      success: false,
      error: error.message,
      data: [],
      poNo,
      note,
      noteEtc,
      postponeDelivery,
      empId,
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Get backlog item list by PO number
 * @param {Object} params - Parameters object
 * @param {string} params.poNo - PO number
 * @returns {Promise<Object>} Backlog item list data
 */
const getBacklogItemList = async (params) => {
  const { poNo = '' } = params;

  logger.info('Executing page_Backlog for item list data', { poNo });

  try {
    const result = await exec('page_Backlog', {
      hcase: 'get_list_item',
      p1: poNo,
      p2: '', p3: '', p4: '', p5: '', p6: '', p7: '', p8: '', p9: '', p10: ''
    });

    logger.info('Backlog item list result:', { 
      resultType: typeof result, 
      isArray: Array.isArray(result), 
      length: Array.isArray(result) ? result.length : 'N/A',
      poNo
    });

    return {
      success: true,
      data: result || [],
      poNo,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    logger.error('Error in getBacklogItemList:', {
      error: error.message,
      stack: error.stack,
      params: { poNo }
    });
    
    return {
      success: false,
      error: error.message,
      data: [],
      poNo,
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Export data using page_Backlog stored procedure with dataExportEx case
 * @param {Object} params - Parameters object
 * @param {string} params.who - User identifier
 * @returns {Promise<Object>} Export data result
 */
const exportData = async (params) => {
  const { who = '' } = params;

  logger.info('Executing page_Backlog with dataExportEx case for data export', { who });

  try {
    const result = await exec('page_Backlog', {
      hcase: 'dataExportEx',
      p1: who,
      p2: '', p3: '', p4: '', p5: '', p6: '', p7: '', p8: '', p9: '', p10: ''
    });

    logger.info('Data export result:', { 
      resultType: typeof result, 
      isArray: Array.isArray(result), 
      length: Array.isArray(result) ? result.length : 'N/A',
      who
    });

    return {
      success: true,
      data: result || [],
      who,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    logger.error('Error in exportData:', {
      error: error.message,
      stack: error.stack,
      params: { who }
    });
    
    return {
      success: false,
      error: error.message,
      data: [],
      who,
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Get backlog data using page_Backlog stored procedure with getdata_bl case
 * This operation may take 40-60 seconds to complete
 * @param {Object} params - Parameters object (no parameters needed for this case)
 * @returns {Promise<Object>} Backlog data result
 */
const getBacklogDataBl = async (params = {}) => {
  logger.info('Executing page_Backlog with getdata_bl case for backlog data (may take 40-60 seconds)');

  try {
    const result = await exec('page_Backlog', {
      hcase: 'getdata_bl',
      p1: '', p2: '', p3: '', p4: '', p5: '', p6: '', p7: '', p8: '', p9: '', p10: ''
    });

    logger.info('Backlog data (getdata_bl) result:', { 
      resultType: typeof result, 
      isArray: Array.isArray(result), 
      length: Array.isArray(result) ? result.length : 'N/A'
    });

    return {
      success: true,
      data: result || [],
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    logger.error('Error in getBacklogDataBl:', {
      error: error.message,
      stack: error.stack
    });
    
    return {
      success: false,
      error: error.message,
      data: [],
      timestamp: new Date().toISOString()
    };
  }
};

module.exports = {
  getBacklogData,
  getBacklogDetail,
  getBacklogDataReorganized,
  getBacklogCustomerReason,
  getBacklogReasonOptions,
  updateBacklog,
  getBacklogItemList,
  exportData,
  getBacklogDataBl
}; 