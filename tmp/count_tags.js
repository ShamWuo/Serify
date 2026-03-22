const fs = require('fs');
const content = fs.readFileSync('c:/Users/abcde/OneDrive/Desktop/codes/VSapps/Serify/pages/index.tsx', 'utf8');

const divOpen = (content.match(/<div/g) || []).length;
const divClose = (content.match(/<\/div>/g) || []).length;
const sectionOpen = (content.match(/<section/g) || []).length;
const sectionClose = (content.match(/<\/section>/g) || []).length;
const linkOpen = (content.match(/<Link/g) || []).length;
const linkClose = (content.match(/<\/Link>/g) || []).length;
const dashboardLayoutOpen = (content.match(/<DashboardLayout/g) || []).length;
const dashboardLayoutClose = (content.match(/<\/DashboardLayout>/g) || []).length;

console.log(`<div>: ${divOpen} open, ${divClose} close`);
console.log(`<section>: ${sectionOpen} open, ${sectionClose} close`);
console.log(`<Link>: ${linkOpen} open, ${linkClose} close`);
console.log(`<DashboardLayout>: ${dashboardLayoutOpen} open, ${dashboardLayoutClose} close`);
