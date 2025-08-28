const express = require('express');
const app = express();
const cron = require('node-cron');

const {SpecialPlanCronFunc,BacklogCronFunc} = require('./SyncDataList');

let count = 0;
// cron.schedule('*/5 * * * *',async () => {
//     const startTime = new Date();
//     count++;
//     zortCronFunc();
//   const endTime = new Date();
//   const elapsedTime = (endTime - startTime) / 1000; // เวลาในหน่วยวินาที

//   console.log(`Cron job has run ${count} times.`);
//   console.log(`Start time: ${startTime}`);
//   console.log(`End time: ${endTime}`);
//   console.log(`Elapsed time: ${elapsedTime} seconds`);
// });

cron.schedule('0 */2 * * *',async () => {
  const startTime = new Date();
  count++;
  // SpecialPlanCronFunc(); 
  // BacklogCronFunc();
const endTime = new Date(); 
const elapsedTime = (endTime - startTime) / 1000; // เวลาในหน่วยวินาที

console.log(`Cron job has run ${count} times.`);
console.log(`Start time: ${startTime}`);
console.log(`End time: ${endTime}`);
console.log(`Elapsed time: ${elapsedTime} seconds`);

});


