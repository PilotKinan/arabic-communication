const xlsx = require('xlsx');
const fs = require('fs');

console.log('Starting Excel to JSON conversion...');

// 1. Define the path to your Excel file and the output JSON file.
//    Place your Excel file in the project root and name it 'data.xlsx'.
const excelFilePath = './data.xlsx';
const jsonOutputPath = './data/words.json';

// 2. Read the Excel file.
let workbook;
try {
    workbook = xlsx.readFile(excelFilePath);
} catch (error) {
    console.error(`\nError: Could not read the Excel file at "${excelFilePath}".`);
    console.error('Please make sure the file exists and is not open elsewhere.\n');
    return; // Stop the script
}

const sheetName = workbook.SheetNames[0]; // Get the first sheet's name
const worksheet = workbook.Sheets[sheetName];

// 3. Convert the sheet to a JSON array.
//    Using {header: 1} converts the sheet to an array of arrays.
//    Using {defval: null} ensures empty cells are represented as null.
const sheetJson = xlsx.utils.sheet_to_json(worksheet, { defval: null });

// 4. Restructure the data to match the format your app expects.
//    This new logic identifies subtitles and groups terms under them.
const structuredData = [];
let currentCategory = null;

sheetJson.forEach(row => {
    // Ensure your Excel column headers are exactly 'English', 'Pronunciation', 'Arabic'
    const english = row.English;
    const pronunciation = row.Pronunciation;
    const arabic = row.Arabic;
    const image = row.Image;

    // Rule: A row is a subtitle if English has a value, but the others are empty.
    if (english && !pronunciation && !arabic) {
        currentCategory = {
            category: english,
            terms: [],
            image: image || ""
        };
        structuredData.push(currentCategory);
    } 
    // Rule: A row is a term if all three columns have values AND we are inside a category.
    else if (english && pronunciation && arabic && currentCategory) {
        currentCategory.terms.push({
            english: english,
            pronunciation: pronunciation,
            arabic: arabic
        });
    }
    // Other rows (like blank rows) are ignored.
});

// 5. Write the structured data to the words.json file.
fs.writeFileSync(jsonOutputPath, JSON.stringify(structuredData, null, 2), 'utf-8');

console.log(`\nSuccess!`);
console.log(`Processed ${sheetJson.length} rows from Excel.`);
console.log(`Found ${structuredData.length} categories.`);
console.log(`The file "${jsonOutputPath}" has been updated.`);
console.log('You can now view the changes in your web app.\n');