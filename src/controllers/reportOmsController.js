const { exec } = require('../config/sequelize');
const { setupLogger } = require('../utils/logger');
const { 
  getPrdPlan, 
  getPrdPlanWithFormattedDates, 
  getPrdPlanMultipleWithFormattedDates, 
  getPrdPlanMultipleWithFormattedDatesBatch,
  extractPlanDatesList,
  extractFormattedPlanDatesList,
  groupPlanDates,
  groupFormattedPlanDates,
  getUniquePlanDates,
  getUniqueFormattedPlanDates,
  convertPrdPlanDataToObject,
  getAllUniqueDateFields,
  addDefaultDateFieldsToProducts,
  getProductsWithDefaultDateFields
} = require('../utils/getPrdPlan');

const logger = setupLogger();

/**
 * Format number to 2 decimal places
 * @param {number|string} value - Value to format
 * @returns {string} Formatted number with 2 decimal places
 */
const formatNumber = (value) => {
  if (value === null || value === undefined || value === '') {
    return '0.00';
  }
  
  const num = parseFloat(value);
  if (isNaN(num)) {
    return '0.00';
  }
  
  return num.toFixed(2);
};

/**
 * Format specific numeric fields to 2 decimal places
 * @param {Object|Array} obj - Object or Array to format
 * @returns {Object|Array} Formatted object or array
 */
const formatNumericFields = (obj) => {
  if (!obj) {
    return obj;
  }

  // ถ้าเป็น array ให้ map แต่ละ item
  if (Array.isArray(obj)) {
    return obj.map(item => formatNumericFields(item));
  }

  // ถ้าไม่ใช่ object ให้ return ค่าเดิม
  if (typeof obj !== 'object') {
    return obj;
  }

  const formatted = {};
  for (const [key, value] of Object.entries(obj)) {
    // ตรวจสอบเฉพาะฟิลด์ที่ต้องการแปลง
    const numericFields = [
      'FG_AMOUNT', 'FORCOST', 'Cost_transport', 'SP_Cost', 'Total_cost',
      'COST', 'BPERCTN', 'helper_cost', 'ISPERCEN', 'EXTRA', 'palletcost'
    ];
    
    if (numericFields.includes(key) && (typeof value === 'number' || (typeof value === 'string' && !isNaN(parseFloat(value))))) {
      formatted[key] = formatNumber(value);
    } else if (Array.isArray(value)) {
      formatted[key] = value.map(item => formatNumericFields(item));
    } else if (typeof value === 'object' && value !== null) {
      formatted[key] = formatNumericFields(value);
    } else {
      formatted[key] = value;
    }
  }
  return formatted;
};

/**
 * Clean string fields by trimming trailing spaces
 * @param {Object} record - Database record
 * @returns {Object} Cleaned record
 */
const cleanStringFields = (record) => {
  const cleaned = { ...record };
  
  // Iterate through all fields and trim string values
  Object.keys(cleaned).forEach(key => {
    if (typeof cleaned[key] === 'string') {
      cleaned[key] = cleaned[key].trim();
    }
  });
  
  return cleaned;
};

/**
 * Get daily stock data
 */
const getDailyStockData = async (params) => {
  const {
    hcase = 'select_item_ds',
    p1 = '', p2 = '', p3 = ''
  } = params;

  return await exec('page_Daily_Stock', {
    hcase, p1, p2, p3
  });
};

/**
 * Get daily stock head data (สร้าง head)
 */
const getDailyStockHeadData = async (params = {}) => {
  const { p1 = '', p2 = '', p3 = '' } = params;

  return await exec('page_Daily_Stock', {
    hcase: 'insertdatadailystock', p1, p2, p3
  });
};

/**
 * Get daily stock line data (สร้าง line)
 */
const getDailyStockLineData = async (params = {}) => {
  const { p1 = '', p2 = '', p3 = '' } = params;

  return await exec('page_Daily_Stock', {
    hcase: 'insertdatas', p1, p2, p3
  });
};

/**
 * Get no bill data
 */
const getNoBillData = async (params) => {
  const {
    hcase = 'getdata_nobill',
    warehouse = '',
    dateStart = '',
    dateEnd = ''
  } = params;

  logger.info('Executing page_nobill for no bill data', { hcase, warehouse, dateStart, dateEnd });

  try {
    const result = await exec('page_nobill', {
      hcase,
      p1: warehouse,
      p2: dateStart,
      p3: dateEnd
    });

    logger.info('No bill data result:', { 
      resultType: typeof result, 
      isArray: Array.isArray(result), 
      length: Array.isArray(result) ? result.length : 'N/A' 
    });

    return result;
  } catch (error) {
    logger.error('Error in getNoBillData:', {
      error: error.message,
      stack: error.stack,
      params: { hcase, warehouse, dateStart, dateEnd }
    });
    throw error;
  }
};

const getWharehouse = async (params) => {
  const {
    hcase = 'show_wh',
    p1 = '',
    p2 = '',
    p3 = ''
  } = params;

  logger.info('Executing page_nobill for no bill data', { hcase, p1, p2, p3 });

  return await exec('page_nobill', {
    hcase,
    p1: '',
    p2: '',
    p3: ''
  });
};


/**
 * Get transport cost data (รวม 2 stored procedures)
 */
const getTransportCostDataOption = async (params) => {
  const {
    p1 = '', p2 = '', p3 = '', p4 = '', p5 = '', p6 = '', p7 = ''
  } = params;

  logger.info('Executing page_Rpt_TransCost for transport cost data', { p1, p2, p3, p4, p5, p6, p7 });

  try {
    // เรียก stored procedure แรก: ROUDCOS_PAY
    const roudcosPayData = await exec('page_Rpt_TransCost', {
      hcase: 'ROUDCOS_PAY',
      p1, p2, p3, p4, p5, p6, p7
    });

    // เรียก stored procedure ที่สอง: Code_truck
    const codeTruckData = await exec('page_Rpt_TransCost', {
      hcase: 'Code_truck',
      p1, p2, p3, p4, p5, p6, p7
    });

    // ส่งกลับข้อมูลแยกกัน
    return {
      roudcos_pay: roudcosPayData || [],
      code_truck: codeTruckData || []
    };
  } catch (error) {
    logger.error('Error executing transport cost stored procedures:', error);
    throw error;
  }
};

/**
 * Get transport cost show data
 */
const getTransportCostShowData = async (params) => {
  const {
    shipmentId = '', channelId = '', truckId = '', p4 = '', p5 = '', p6 = '', p7 = ''
  } = params;

  logger.info('Executing page_Rpt_TransCost for show data', { 
    shipmentId, channelId, truckId, p4, p5, p6, p7 
  });

  try {
    // เรียก stored procedure หลัก: show_data
    const showData = await exec('page_Rpt_TransCost', {
      hcase: 'show_data',
      p1: shipmentId,
      p2: channelId,
      p3: truckId,
      p4, p5, p6, p7
    });

    // เรียก stored procedure: show_truck
    const showTruckData = await exec('page_Rpt_TransCost', {
      hcase: 'show_truck',
      p1: shipmentId,
      p2: channelId,
      p3: truckId,
      p4, p5, p6, p7
    });

    // เรียก stored procedure: calpallet
    const calPalletData = await exec('page_Rpt_TransCost', {
      hcase: 'calpallet',
      p1: shipmentId,
      p2: channelId,
      p3: truckId,
      p4, p5, p6, p7
    });

    // รวม palletcost + COST ใน calPalletData แล้วเก็บในฟิลด์ COST เดิม
    if (Array.isArray(calPalletData)) {
      calPalletData.forEach(item => {
        if (item.palletcost && item.COST) {
          const palletCost = parseFloat(item.palletcost) || 0;
          const cost = parseFloat(item.COST) || 0;
          item.COST = (palletCost + cost).toFixed(2);
        }
      });
    }

    // จัดรูปแบบตัวเลขให้เป็นทศนิยม 2 จุด
    const formattedShowData = formatNumericFields(showData || []);
    const formattedShowTruckData = formatNumericFields(showTruckData || []);
    const formattedCalPalletData = formatNumericFields(calPalletData || []);

    // ส่งกลับข้อมูลแยกกัน
    return {
      show_data: formattedShowData,
      summaryDataObj: {
        show_truck: formattedShowTruckData,
        calpallet: formattedCalPalletData
      }
    };
  } catch (error) {
    logger.error('Error executing transport cost show data stored procedures:', error);
    throw error;
  }
};

/**
 * Extract and group brand_item from planning data
 * @param {Array} data - Planning data array
 * @returns {Array} Array of unique brand_item values
 */
const extractAndGroupBrandItems = (data) => {
  if (!Array.isArray(data)) {
    return [];
  }

  const brandItems = new Set();
  
  data.forEach(item => {
    if (item.brand_item && typeof item.brand_item === 'string' && item.brand_item.trim() !== '') {
      brandItems.add(item.brand_item.trim());
    }
  });

  return Array.from(brandItems).sort();
};

/**
 * Extract and group group_item from planning data
 * @param {Array} data - Planning data array
 * @returns {Array} Array of unique group_item values
 */
const extractAndGroupGroupItems = (data) => {
  if (!Array.isArray(data)) {
    return [];
  }

  const groupItems = new Set();
  
  data.forEach(item => {
    if (item.group_item && typeof item.group_item === 'string' && item.group_item.trim() !== '') {
      groupItems.add(item.group_item.trim());
    }
  });

  return Array.from(groupItems).sort();
};

/**
 * Group products by brand and include product data
 * @param {Array} data - Planning data array
 * @returns {Object} Object with brand as key and array of products as value
 */
const groupProductsByBrand = (data) => {
  if (!Array.isArray(data)) {
    return {};
  }

  const brandGroups = {};
  
  data.forEach(item => {
    if (item.brand_item && typeof item.brand_item === 'string' && item.brand_item.trim() !== '') {
      const brand = item.brand_item.trim();
      
      if (!brandGroups[brand]) {
        brandGroups[brand] = [];
      }
      
      brandGroups[brand].push(item);
    }
  });

  return brandGroups;
};

/**
 * Get planning all data
 */
const getPlanningAllData = async (params) => {
  const {
    hcase = 'show_data_pna',
    p1 = '', p2 = '', p3 = '', p4 = '', p5 = ''
  } = params;

  logger.info('Executing page_Planning_all for planning data', { hcase });

  try {
    const result = await exec('page_Planning_all', {
      hcase,
      p1, p2, p3, p4, p5
    });

    logger.info('Planning all data result:', { 
      resultType: typeof result, 
      isArray: Array.isArray(result), 
      length: Array.isArray(result) ? result.length : 'N/A' 
    });

    // รวบรวม item_codes ทั้งหมด
    const itemCodes = result
      .map(item => item.item_code ? item.item_code.trim() : '')
      .filter(itemCode => itemCode !== '');

    logger.info('Collected item codes for batch processing:', { 
      totalItems: result.length,
      validItemCodes: itemCodes.length 
    });

    let allPrdPlanData = [];

    if (itemCodes.length > 0) {
      try {
        // เรียก getPrdPlanMultipleWithFormattedDatesBatch เพื่อดึงข้อมูลแบบแบ่งชุด
        // ใช้ batch size ที่คำนวณอัตโนมัติเพื่อป้องกันปัญหา nvarchar(max) รับข้อมูลไม่ไหว
        allPrdPlanData = await getPrdPlanMultipleWithFormattedDatesBatch(itemCodes);
        
        logger.info('Successfully retrieved all prd plan data in batches:', { 
          itemCodesCount: itemCodes.length,
          prdPlanDataLength: Array.isArray(allPrdPlanData) ? allPrdPlanData.length : 'N/A',
          estimatedStringLength: itemCodes.length * 15 // ประมาณความยาวของ string ที่จะส่ง
        });

      } catch (prdError) {
        logger.error('Error calling getPrdPlanMultipleWithFormattedDatesBatch:', {
          itemCodes: itemCodes.join(','),
          error: prdError.message
        });
        allPrdPlanData = [];
      }
    }

    // เอาข้อมูลที่ได้จาก getPrdPlan ใส่เข้าไปในแต่ละ object
    const enrichedResult = result.map(item => {
      const itemCode = item.item_code ? item.item_code.trim() : '';
      
      if (!itemCode) {
        logger.warn('Skipping item with empty item_code', { item });
        return {
          ...item,
          prd_plan_data: {}
        };
      }

      // หาข้อมูลที่ตรงกับ item_code นี้
      const matchingPrdData = allPrdPlanData.filter(prdItem => 
        prdItem.product_id === itemCode || prdItem.item_code === itemCode
      );

      logger.info('Matched prd plan data for item:', { 
        itemCode, 
        matchedCount: matchingPrdData.length 
      });

      // แปลง prd_plan_data array เป็น object
      const prdPlanDataObject = convertPrdPlanDataToObject(matchingPrdData);

      return {
        ...item,
        ...prdPlanDataObject // กระจาย object เข้าไปใน item
      };
    });

    // ดึง unique date fields จากข้อมูลทั้งหมดเพื่อเพิ่ม default fields
    const allUniqueDateFields = getAllUniqueDateFields(allPrdPlanData);
    
    // เพิ่ม default date fields ให้กับทุก product ที่ไม่มีข้อมูล
    const finalResult = addDefaultDateFieldsToProducts(enrichedResult, allUniqueDateFields);

    logger.info('Added default date fields to all products:', {
      totalProducts: enrichedResult.length,
      finalProducts: finalResult.length,
      uniqueDateFields: allUniqueDateFields,
      dateFieldsCount: allUniqueDateFields.length
    });

    // ดึง plan_date ออกมาเป็น list แยกต่างหาก
    const planDatesList = extractPlanDatesList(allPrdPlanData);
    const formattedPlanDatesList = extractFormattedPlanDatesList(allPrdPlanData);

    // Get unique plan dates (remove duplicates)
    const uniquePlanDatesList = getUniquePlanDates(planDatesList);
    const uniqueFormattedPlanDatesList = getUniqueFormattedPlanDates(formattedPlanDatesList);

    // Group plan dates
    const groupedPlanDates = groupPlanDates(planDatesList);
    const groupedFormattedPlanDates = groupFormattedPlanDates(formattedPlanDatesList);

    // Extract and group brand_item and group_item
    const brandItems = extractAndGroupBrandItems(finalResult);
    const groupItems = extractAndGroupGroupItems(finalResult);
    
    // Group products by brand and include product data
    const brandProductGroups = groupProductsByBrand(finalResult);

    logger.info('Planning all data enrichment completed', { 
      totalItems: result.length,
      enrichedItems: finalResult.length,
      planDatesCount: planDatesList.length,
      formattedPlanDatesCount: formattedPlanDatesList.length,
      uniquePlanDatesCount: uniquePlanDatesList.length,
      uniqueFormattedPlanDatesCount: uniqueFormattedPlanDatesList.length,
      groupedPlanDatesCount: Object.keys(groupedPlanDates).length,
      groupedFormattedPlanDatesCount: Object.keys(groupedFormattedPlanDates).length,
      brandItemsCount: brandItems.length,
      groupItemsCount: groupItems.length,
      brandProductGroupsCount: Object.keys(brandProductGroups).length
    });

    return {
      data: finalResult,
      planDatesList: planDatesList,
      formattedPlanDatesList: formattedPlanDatesList,
      uniquePlanDatesList: uniquePlanDatesList,
      uniqueFormattedPlanDatesList: uniqueFormattedPlanDatesList,
      groupedPlanDates: groupedPlanDates,
      groupedFormattedPlanDates: groupedFormattedPlanDates,
      brandItems: brandItems,
      groupItems: groupItems,
      brandProductGroups: brandProductGroups
    };
  } catch (error) {
    logger.error('Error in getPlanningAllData:', {
      error: error.message,
      stack: error.stack,
      params: { hcase, p1, p2, p3, p4, p5 }
    });
    throw error;
  }
};

/**
 * Get planning all data with show_pna_dc case
 */
const getPlanningAllDataShowPnaDc = async (params) => {
  const {
    hcase = 'show_pna_dc',
    p1 = '',
    p2 = '',
    p3 = '',
    p4 = '',
    p5 = ''
  } = params;

  logger.info('Executing page_Planning_all with show_pna_dc case', { 
    hcase, p1, p2, p3, p4, p5 
  });

  try {
    const result = await exec('page_Planning_all', {
      hcase,
      p1,
      p2,
      p3,
      p4,
      p5
    });

    logger.info('Planning all data (show_pna_dc) result:', { 
      resultType: typeof result, 
      isArray: Array.isArray(result), 
      length: Array.isArray(result) ? result.length : 'N/A' 
    });

    // Add balance calculation to each item
    if (Array.isArray(result)) {
      const enrichedResult = result.map(item => {
        // Ensure numeric values for calculation
        // const tco = parseFloat(item.tco) || 0;
       
        const oco = parseFloat(item.oco) || 0;
        const pco = parseFloat(item.pco) || 0;
        const cco = parseFloat(item.cco) || 0;
        const stock = parseFloat(item.stock) || 0;
        const tco = oco + pco + cco

        // Calculate balance: tco - stock
        const balance = parseFloat(stock) - parseFloat(tco) ;

        // Verify tco calculation: tco = oco + pco + cco
        // const calculatedTco = oco + pco + cco;
        // const tcoMatches = Math.abs(tco - calculatedTco) < 0.01; // Allow for floating point precision

        logger.info('Processing item with balance calculation:', {
          item_no: item.item_no,
          tco: tco,
          oco: oco,
          pco: pco,
          cco: cco,
          stock: stock,
          balance: balance,
          // calculatedTco: calculatedTco,
          // tcoMatches: tcoMatches
        });

        return {
          ...item,
          tco: tco,
          oco: oco,
          balance: balance,
          // calculated_tco: calculatedTco,
          // tco_verification: tcoMatches
        };
      });

      logger.info('Successfully added balance calculations:', {
        totalItems: result.length,
        enrichedItems: enrichedResult.length
      });

      // Extract and group brand_item and group_item
      const brandItems = extractAndGroupBrandItems(enrichedResult);
      const groupItems = extractAndGroupGroupItems(enrichedResult);
      
      // Group products by brand and include product data
      const brandProductGroups = groupProductsByBrand(enrichedResult);

      logger.info('Extracted brand and group items:', {
        brandItemsCount: brandItems.length,
        groupItemsCount: groupItems.length,
        brandProductGroupsCount: Object.keys(brandProductGroups).length
      });

      return {
        data: enrichedResult,
        brandItems: brandItems,
        groupItems: groupItems,
        brandProductGroups: brandProductGroups
      };
    }

    // Extract and group brand_item and group_item from original result
    const brandItems = extractAndGroupBrandItems(result);
    const groupItems = extractAndGroupGroupItems(result);
    
    // Group products by brand and include product data
    const brandProductGroups = groupProductsByBrand(result);

    logger.info('Extracted brand and group items from original result:', {
      brandItemsCount: brandItems.length,
      groupItemsCount: groupItems.length,
      brandProductGroupsCount: Object.keys(brandProductGroups).length
    });

    return {
      data: result,
      brandItems: brandItems,
      groupItems: groupItems,
      brandProductGroups: brandProductGroups
    };
  } catch (error) {
    logger.error('Error in getPlanningAllDataShowPnaDc:', {
      error: error.message,
      stack: error.stack,
      params: { hcase, p1, p2, p3, p4, p5 }
    });
    throw error;
  }
};

/**
 * Get product import plan data and enrich with stored procedure data
 */
const getProductImportPlanData = async (params) => {
  const { data = [] } = params;

  logger.info('Processing product import plan data', { 
    itemCount: data.length 
  });

  try {
    const enrichedData = [];

    // วนลูปผ่านแต่ละ item ในข้อมูล
    for (const item of data) {
      const itemCode = item.item_code ? item.item_code.trim() : '';
      
      if (!itemCode) {
        logger.warn('Skipping item with empty item_code', { item });
        enrichedData.push(item);
        continue;
      }

      logger.info('Processing item:', { itemCode });

      try {
        // เรียก stored procedure page_Import_Prd_plan
        const storedProcResult = await exec('page_Import_Prd_plan', {
          hcase: 'SELECT_PRD',
          p1: itemCode,
          p2: '', p3: '', p4: '', p5: '', p6: '', p7: '', p8: '', p9: '', p10: ''
        });

        // รวมข้อมูลเดิมกับข้อมูลจาก stored procedure
        const enrichedItem = {
          ...item,
          stored_proc_data: storedProcResult || []
        };

        enrichedData.push(enrichedItem);

        logger.info('Successfully enriched item data', { 
          itemCode, 
          storedProcDataLength: Array.isArray(storedProcResult) ? storedProcResult.length : 'N/A' 
        });

      } catch (procError) {
        logger.error('Error calling stored procedure for item:', {
          itemCode,
          error: procError.message
        });

        // ถ้าเกิด error ให้เก็บข้อมูลเดิมไว้
        enrichedData.push({
          ...item,
          stored_proc_data: [],
          error: procError.message
        });
      }
    }

    logger.info('Product import plan data processing completed', { 
      totalItems: data.length,
      processedItems: enrichedData.length 
    });

    return enrichedData;

  } catch (error) {
    logger.error('Error in getProductImportPlanData:', {
      error: error.message,
      stack: error.stack,
      params: { dataLength: data.length }
    });
    throw error;
  }
};

/**
 * Get credit limit data from store procedure
 */
const getCreditLimitData = async (params) => {
  const { hcase = 'CreditLimit', warehouse = '', p2 = '', p3 = '' } = params;

  logger.info('Getting credit limit data', { hcase, warehouse, p2, p3 });

  try {
    // เรียก stored procedure PAGE_SELECT_TO_OMS
    const result = await exec('page_creditlimit', {
      hcase: 'list',
      p1: warehouse,
      p2: p2,
      p3: p3
    });

    // แปลงข้อมูล list_inv และ list_co จาก string เป็น JSON object และคำนวณ sum/count
    const processedResult = Array.isArray(result) ? result.map(item => {
      const processedItem = { ...item };
      
      // แปลง list_inv จาก string เป็น JSON object
      if (item.list_inv && typeof item.list_inv === 'string') {
        try {
          processedItem.list_inv = JSON.parse(item.list_inv);
        } catch (parseError) {
          logger.warn('Failed to parse list_inv JSON:', {
            error: parseError.message,
            list_inv: item.list_inv
          });
          processedItem.list_inv = [];
        }
      }
      
      // แปลง list_co จาก string เป็น JSON object
      if (item.list_co && typeof item.list_co === 'string') {
        try {
          processedItem.list_co = JSON.parse(item.list_co);
        } catch (parseError) {
          logger.warn('Failed to parse list_co JSON:', {
            error: parseError.message,
            list_co: item.list_co
          });
          processedItem.list_co = [];
        }
      }
      
      // คำนวณ sum_inv และ count_inv จาก list_inv
      if (Array.isArray(processedItem.list_inv)) {
        processedItem.count_inv = processedItem.list_inv.length;
        processedItem.sum_inv = processedItem.list_inv.reduce((sum, inv) => {
          // ใช้ dio_cal_amount ถ้ามี หรือแปลง dio_amount จาก string เป็น number
          const amount = inv.dio_cal_amount || parseFloat(inv.dio_amount?.replace(/,/g, '') || 0);
          return sum + amount;
        }, 0);
      } else {
        processedItem.count_inv = 0;
        processedItem.sum_inv = 0;
      }
      
      // คำนวณ sum_co และ count_co จาก list_co
      if (Array.isArray(processedItem.list_co)) {
        processedItem.count_co = processedItem.list_co.length;
        processedItem.sum_co = processedItem.list_co.reduce((sum, co) => {
          // ใช้ dco_cal_amount ถ้ามี หรือแปลง dco_amount จาก string เป็น number
          const amount = co.dco_cal_amount || parseFloat(co.dco_amount?.replace(/,/g, '') || 0);
          return sum + amount;
        }, 0);
      } else {
        processedItem.count_co = 0;
        processedItem.sum_co = 0;
      }
      
      // หาวันที่มากที่สุดใน list_inv.dio_due_date และ list_co.dco_send_date
      let maxDueDate = null;
      let maxSendDate = null;
      
      // หาวันที่มากที่สุดใน list_inv และคำนวณจำนวนวันสำหรับแต่ละรายการ
      if (Array.isArray(processedItem.list_inv) && processedItem.list_inv.length > 0) {
        const dueDates = [];
        
        // คำนวณจำนวนวันสำหรับแต่ละรายการใน list_inv
        processedItem.list_inv = processedItem.list_inv.map(inv => {
          if (inv.dio_due_date && inv.dio_due_date.length === 8) {
            const year = parseInt(inv.dio_due_date.substring(0, 4));
            const month = parseInt(inv.dio_due_date.substring(4, 6));
            const day = parseInt(inv.dio_due_date.substring(6, 8));
            
            // ตรวจสอบว่าวันที่ถูกต้องหรือไม่
            if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
              const dueDate = new Date(year, month - 1, day);
              
              // ตรวจสอบว่าวันที่ที่สร้างขึ้นตรงกับข้อมูลเดิมหรือไม่
              if (dueDate.getFullYear() === year && 
                  dueDate.getMonth() === month - 1 && 
                  dueDate.getDate() === day) {
                
                const today = new Date();
                const timeDiff = dueDate.getTime() - today.getTime();
                const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
                
                dueDates.push(dueDate);
                
                return {
                  ...inv,
                  days_from_today: daysDiff < 0 ? daysDiff : '-'
                };
              }
            }
            
            return {
              ...inv,
              days_from_today: '-'
            };
          } else {
            return {
              ...inv,
              days_from_today: '-'
            };
          }
        });
        
        if (dueDates.length > 0) {
          maxDueDate = new Date(Math.max(...dueDates));
        }
      }
      
      // หาวันที่มากที่สุดใน list_co และคำนวณจำนวนวันสำหรับแต่ละรายการ
      if (Array.isArray(processedItem.list_co) && processedItem.list_co.length > 0) {
        const sendDates = [];
        
        // คำนวณจำนวนวันสำหรับแต่ละรายการใน list_co
        processedItem.list_co = processedItem.list_co.map(co => {
          if (co.dco_send_date && co.dco_send_date.length === 8) {
            const year = parseInt(co.dco_send_date.substring(0, 4));
            const month = parseInt(co.dco_send_date.substring(4, 6));
            const day = parseInt(co.dco_send_date.substring(6, 8));
            
            // ตรวจสอบว่าวันที่ถูกต้องหรือไม่
            if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
              const sendDate = new Date(year, month - 1, day);
              
              // ตรวจสอบว่าวันที่ที่สร้างขึ้นตรงกับข้อมูลเดิมหรือไม่
              if (sendDate.getFullYear() === year && 
                  sendDate.getMonth() === month - 1 && 
                  sendDate.getDate() === day) {
                
                const today = new Date();
                const timeDiff = sendDate.getTime() - today.getTime();
                const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
                
                sendDates.push(sendDate);
                
                return {
                  ...co,
                  days_from_today: daysDiff < 0 ? daysDiff : '-'
                };
              }
            }
            
            return {
              ...co,
              days_from_today: '-'
            };
          } else {
            return {
              ...co,
              days_from_today: '-'
            };
          }
        });
        
        if (sendDates.length > 0) {
          maxSendDate = new Date(Math.max(...sendDates));
        }
      }
      
      // แยกวันที่มากที่สุดเป็น co_max_send_date และ inv_max_due_date
      if (maxDueDate) {
        const today = new Date();
        const timeDiff = maxDueDate.getTime() - today.getTime();
        const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
        
        processedItem.inv_max_due_date = maxDueDate.toISOString().split('T')[0]; // วันที่มากที่สุดของ invoice ในรูปแบบ YYYY-MM-DD
        
        // คำนวณ inv_days_from_today เฉพาะรายการที่มีวันที่น้อยกว่าวันปัจจุบัน
        const overdueInvoices = processedItem.list_inv.filter(inv => 
          inv.days_from_today !== null && inv.days_from_today < 0
        );
        
        if (overdueInvoices.length > 0) {
          // หาจำนวนวันที่น้อยที่สุด (ลบมากที่สุด) ในรายการที่เกินกำหนด
          const minDays = Math.min(...overdueInvoices.map(inv => inv.days_from_today));
          processedItem.inv_days_from_today = minDays;
        } else {
          processedItem.inv_days_from_today = '-';
        }
      } else {
        processedItem.inv_max_due_date = null;
        processedItem.inv_days_from_today = null;
      }
      
      if (maxSendDate) {
        const today = new Date();
        const timeDiff = maxSendDate.getTime() - today.getTime();
        const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
        
        processedItem.co_max_send_date = maxSendDate.toISOString().split('T')[0]; // วันที่มากที่สุดของ CO ในรูปแบบ YYYY-MM-DD
        processedItem.co_days_from_today = daysDiff; // จำนวนวันที่ห่างจากวันปัจจุบันสำหรับ CO
      } else {
        processedItem.co_max_send_date = null;
        processedItem.co_days_from_today = null;
      }
      
      return processedItem;
    }) : [];

    logger.info('Credit limit data retrieved and processed successfully', { 
      recordCount: processedResult.length 
    });

    return processedResult;

  } catch (error) {
    logger.error('Error in getCreditLimitData:', {
      error: error.message,
      stack: error.stack,
      params: { hcase, warehouse, p2, p3 }
    });
    throw error;
  }
};

/**
 * Get planning all data panel from stored procedure
 */
const getPlanningAllGenDataPnl = async (params) => {
  const { hcase = 'gendatapnl', p1 = '', p2 = '', p3 = '', p4 = '', p5 = '' } = params;

  logger.info('Getting planning all data panel', { hcase, p1, p2, p3, p4, p5 });

  try {
    // เรียก stored procedure page_Planning_all
    const result = await exec('page_Planning_all', {
      hcase: hcase,
      p1: p1,
      p2: p2,
      p3: p3,
      p4: p4,
      p5: p5
    });

    logger.info('Planning all data panel retrieved successfully', { 
      recordCount: Array.isArray(result) ? result.length : 0 
    });

    return result || [];

  } catch (error) {
    logger.error('Error in getPlanningAllGenDataPnl:', {
      error: error.message,
      stack: error.stack,
      params: { hcase, p1, p2, p3, p4, p5 }
    });
    throw error;
  }
};

module.exports = {
  getDailyStockData,
  getDailyStockHeadData,
  getDailyStockLineData,
  getNoBillData,
  getWharehouse,
  getTransportCostDataOption,
  getTransportCostShowData,
  getPlanningAllData,
  getPlanningAllDataShowPnaDc,
  getProductImportPlanData,
  getCreditLimitData,
  getPlanningAllGenDataPnl
}; 