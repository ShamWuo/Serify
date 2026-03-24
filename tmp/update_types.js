
const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\abcde\\.gemini\\antigravity\\brain\\cbd6383b-6581-46fa-9f93-69938de26559\\.system_generated\\steps\\1003\\output.txt', 'utf8');
const data = JSON.parse(content);
fs.writeFileSync('c:\\Users\\abcde\\OneDrive\\Desktop\\codes\\Apps\\Serify\\types\\db_types_new.ts', data.types);
console.log('Successfully updated types/db_types_new.ts');
