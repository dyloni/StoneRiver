/**
 * Button Audit Script
 * Scans all TSX files for Button components and verifies they have proper event handlers
 */

const fs = require('fs');
const path = require('path');

const results = {
    totalButtons: 0,
    buttonsWithOnClick: 0,
    buttonsWithSubmit: 0,
    buttonsWithoutHandlers: [],
    buttonsByFile: {},
    potentialIssues: []
};

function findTsxFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules' && file !== 'dist') {
            findTsxFiles(filePath, fileList);
        } else if (file.endsWith('.tsx')) {
            fileList.push(filePath);
        }
    });

    return fileList;
}

function analyzeFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = filePath.replace(process.cwd() + '/', '');

    // Find all Button components
    const buttonRegex = /<Button[^>]*>/g;
    const buttons = content.match(buttonRegex) || [];

    results.totalButtons += buttons.length;

    if (buttons.length > 0) {
        results.buttonsByFile[relativePath] = {
            count: buttons.length,
            buttons: []
        };
    }

    buttons.forEach((button, index) => {
        const hasOnClick = button.includes('onClick');
        const hasType = button.match(/type="submit"/);
        const hasAsChild = button.includes('asChild');

        const buttonInfo = {
            index: index + 1,
            snippet: button.substring(0, 80) + (button.length > 80 ? '...' : ''),
            hasOnClick,
            hasSubmit: !!hasType,
            hasAsChild
        };

        results.buttonsByFile[relativePath].buttons.push(buttonInfo);

        if (hasOnClick) {
            results.buttonsWithOnClick++;
        }

        if (hasType) {
            results.buttonsWithSubmit++;
        }

        // Check for potential issues
        if (!hasOnClick && !hasType && !hasAsChild) {
            results.buttonsWithoutHandlers.push({
                file: relativePath,
                button: buttonInfo
            });
        }

        // Check for disabled buttons that might need handlers
        if (button.includes('disabled') && !hasOnClick && !hasType) {
            results.potentialIssues.push({
                file: relativePath,
                issue: 'Disabled button without handler',
                button: buttonInfo.snippet
            });
        }
    });
}

// Main execution
console.log('🔍 Starting Button Audit...\n');

const tsxFiles = findTsxFiles(process.cwd());
console.log(`Found ${tsxFiles.length} TSX files\n`);

tsxFiles.forEach(analyzeFile);

// Generate report
console.log('📊 BUTTON AUDIT REPORT');
console.log('='.repeat(80));
console.log(`\nTotal Buttons Found: ${results.totalButtons}`);
console.log(`Buttons with onClick: ${results.buttonsWithOnClick}`);
console.log(`Buttons with type="submit": ${results.buttonsWithSubmit}`);
console.log(`Buttons without handlers: ${results.buttonsWithoutHandlers.length}`);
console.log(`Potential issues: ${results.potentialIssues.length}`);

console.log('\n📁 BUTTONS BY FILE');
console.log('='.repeat(80));
Object.entries(results.buttonsByFile).forEach(([file, data]) => {
    console.log(`\n${file} (${data.count} buttons)`);
    data.buttons.forEach(btn => {
        const status = btn.hasOnClick ? '✅' : btn.hasSubmit ? '📝' : '⚠️';
        console.log(`  ${status} Button ${btn.index}: ${btn.snippet}`);
    });
});

if (results.buttonsWithoutHandlers.length > 0) {
    console.log('\n⚠️  BUTTONS WITHOUT HANDLERS');
    console.log('='.repeat(80));
    results.buttonsWithoutHandlers.forEach(item => {
        console.log(`\n${item.file}`);
        console.log(`  Button ${item.button.index}: ${item.button.snippet}`);
    });
}

if (results.potentialIssues.length > 0) {
    console.log('\n⚠️  POTENTIAL ISSUES');
    console.log('='.repeat(80));
    results.potentialIssues.forEach(issue => {
        console.log(`\n${issue.file}`);
        console.log(`  Issue: ${issue.issue}`);
        console.log(`  Button: ${issue.button}`);
    });
}

console.log('\n✅ SUMMARY');
console.log('='.repeat(80));
const healthPercentage = Math.round((results.buttonsWithOnClick + results.buttonsWithSubmit) / results.totalButtons * 100);
console.log(`Button Health: ${healthPercentage}%`);
console.log(`${results.buttonsWithOnClick + results.buttonsWithSubmit} out of ${results.totalButtons} buttons have proper handlers\n`);

// Save detailed report
const reportPath = 'button-audit-detailed-report.json';
fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
console.log(`📄 Detailed report saved to: ${reportPath}\n`);

process.exit(results.buttonsWithoutHandlers.length > 0 ? 1 : 0);
