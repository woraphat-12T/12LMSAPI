// myCronJobFunction.js
require('dotenv').config();
const jwt = require('jsonwebtoken');
const axios = require('axios')
async function SpecialPlanCronFunc() {

    const token = jwt.sign(
      { username: 'systemm3' },
      // process.env.TOKEN_getDataPrintReceiptKEY,
      process.env.TOKEN_KEY,
      { expiresIn: '2h' }) 

    // const response = await axios.put('http://192.168.2.97:8383/zort/order/OrderManage/addOrderBydate',{ token:token },{});
    // const response2 = await axios.put('http://192.168.2.97:8383/zort/order/OrderManage/updateStatusOrder',{ token:token },{});
    // const response3 = await axios.put('http://192.168.2.97:8383/zort/order/OrderManage/addOrderMakroPro',{ token:token }, {});
    // const response4 = await axios.put('http://192.168.2.97:8383/zort/product/ProductManage/addProduct',{ token:token }, {});
    // console.log(response.data);
    // console.log(response2.data);
    // console.log(response3.data);
    // console.log(response4.data);
    
    // console.log(token);
  }

  async function BacklogCronFunc() {

  }
  
  module.exports = {SpecialPlanCronFunc,BacklogCronFunc};