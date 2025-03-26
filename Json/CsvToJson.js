const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

/**
 * CSV Format:
 * manufacturer,device,section,parameter_name,parameter_description,cc_msb,cc_lsb,cc_min_value,cc_max_value,nrpn_msb,nrpn_lsb,nrpn_min_value,nrpn_max_value,orientation,notes,usage
 * Example:
 * Lofty,Trundler,Oscillators,Glide rate,"Adjusts the glide (portmanteau) time",5,,0,127,1,1,0,127,0-based,Default is zero.,
 * Lofty,Trundler,Oscillators,Glide switch,Enables or disables glide.,65,,0,127,1,2,0,127,0-based,,0-63: Off; 64-127: On
 * Lofty,Trundler,Oscillators,Note sync,Enables and disables Note Sync,81,,0,127,,,,,0-based,,0: Off; 1-127: On
 * Lofty,Trundler,Amp,Pan,Pans between left to right channel,10,,0,127,30,0,0,127,Centered,Left…Centered…Right,0~127: Pan amount
 *
 * JSON Format:
 * {
 *   "version": "1.0.0", // Database version
 *   "generatedAt": "timestamp", // Timestamp of database generation
 *   "devices": [
 *     {
 *       "name": "Device Name", // Device name from CSV
 *       "manufacturer": "Manufacturer", // Manufacturer name from CSV
 *       "commands": [
 *         {
 *           "name": "Parameter Name", // Parameter name from CSV
 *           "section": "Section", // Section from CSV
 *           "description": "Description", // Parameter description from CSV
 *           "cc": {
 *             "msb": msb, // MSB value
 *             "lsb": lsb, // LSB value (if present)
 *             "min": min, // Minimum CC value
 *             "max": max  // Maximum CC value
 *           },
 *           "nrpn": {
 *             "msb": msb, // NRPN MSB value (if present)
 *             "lsb": lsb, // NRPN LSB value (if present)
 *             "min": min, // Minimum NRPN value
 *             "max": max  // Maximum NRPN value
 *           },
 *           "orientation": "Orientation", // Orientation from CSV
 *           "notes": "Notes", // Optional notes
 *           "usage": "Usage" // Optional usage instructions
 *         },
 *         // more commands here
 *       ]
 *     },
 *     // more devices here
 *   ]
 * }
 */



const VERSION = "1.1.0"; //Updated devices
const rootPath = path.join(__dirname, '..');
const outputDir = path.join(rootPath, 'Json');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`Created output directory: ${outputDir}`);
}

function removeOldDatabases(directory) {
    console.log('🧹 Cleaning old database files...');
    const removed = [];
    fs.readdirSync(directory).forEach(file => {
        if (file.startsWith('midi-database')) {
            fs.unlinkSync(path.join(directory, file));
            removed.push(file);
        }
    });
    
    if (removed.length > 0) {
        console.log(`✅ Removed ${removed.length} old files:`);
        removed.forEach(file => console.log(`  - ${file}`));
    } else {
        console.log('ℹ️ No old database files found to remove');
    }
}

function writeFiles(database) {
    const timestamp = database.generatedAt;
    const versionFile = path.join(outputDir, 'midi-database-version.json');
    const jsonFile = path.join(outputDir, `midi-database-v${VERSION}.json`);
    const gzipFile = jsonFile + '.gz';

    fs.writeFileSync(versionFile, JSON.stringify({ version: VERSION, lastUpdated: timestamp, filename: path.basename(gzipFile) }, null, 2));
    const minified = JSON.stringify(database);
    fs.writeFileSync(jsonFile, minified);
    fs.writeFileSync(gzipFile, zlib.gzipSync(minified));

    console.log(`\n✅ Database saved to ${outputDir}`);
    console.log(`- ${path.basename(versionFile)}`);
    console.log(`- ${path.basename(jsonFile)}`);
    console.log(`- ${path.basename(gzipFile)}`);
}

function parseCSV(csvText) {
    const lines = csvText.split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('manufacturer'));

    return lines.map(line => {
        const fields = line.split(',').map(field => field.trim());
        return {
            manufacturer: fields[0],
            device: fields[1],
            section: fields[2],
            name: fields[3],
            description: fields[4],
            cc: {
                msb: fields[5] ? parseInt(fields[5]) : null,
                lsb: fields[6] ? parseInt(fields[6]) : null,
                min: fields[7] ? parseInt(fields[7]) : 0,
                max: fields[8] ? parseInt(fields[8]) : 127
            },
            nrpn: {
                msb: fields[9] ? parseInt(fields[9]) : null,
                lsb: fields[10] ? parseInt(fields[10]) : null,
                min: fields[11] ? parseInt(fields[11]) : 0,
                max: fields[12] ? parseInt(fields[12]) : 127
            },
            orientation: fields[13] || null,
            notes: fields[14] || null,
            usage: fields[15] || null
        };
    });
}

function convertDatabase() {
    console.log('\n🚀 Starting MIDI database conversion...');
    removeOldDatabases(outputDir);
    const timestamp = new Date().toISOString();
    const database = { version: VERSION, generatedAt: timestamp, devices: [] };

    const manufacturerFolders = fs.readdirSync(rootPath).filter(file => fs.statSync(path.join(rootPath, file)).isDirectory() && file !== 'Json');

    manufacturerFolders.forEach(folder => {
        console.log(`📦 Processing folder: ${folder}`);
        const csvFiles = fs.readdirSync(path.join(rootPath, folder)).filter(file => file.endsWith('.csv'));
        console.log(`Found ${csvFiles.length} CSV file(s) in manufacturer folder: ${folder}`);

        csvFiles.forEach(file => {
            try {
                const csvContent = fs.readFileSync(path.join(rootPath, folder, file), 'utf8');
                const deviceData = parseCSV(csvContent);
                if (deviceData.length > 0) {
                    const manufacturer = deviceData[0].manufacturer;
                    const deviceName = deviceData[0].device;
                    const deviceEntry = database.devices.find(d => d.name === `${manufacturer} ${deviceName}`);
                    if (!deviceEntry) {
                        database.devices.push({
                            name: `${manufacturer} ${deviceName}`,
                            manufacturer,
                            commands: []
                        });
                    }
                    const device = database.devices.find(d => d.name === `${manufacturer} ${deviceName}`);
                    device.commands.push(...deviceData.map(param => ({
                        name: param.name,
                        section: param.section,
                        description: param.description,
                        midi: {
                            cc: param.cc.msb !== null ? [176, param.cc.msb, param.cc.min, param.cc.max] : null,
                            nrpn: param.nrpn.msb !== null ? [99, param.nrpn.msb, 98, param.nrpn.lsb, 6, param.nrpn.min, 38, param.nrpn.max] : null
                        },
                        orientation: param.orientation,
                        notes: param.notes,
                        usage: param.usage
                    })));
                }
            } catch (error) {
                console.error(`❌ Error processing ${file}:`, error);
            }
        });
    });

    writeFiles(database);

    console.log('\n✅ Conversion complete!');
    console.log(`📂 Devices: ${database.devices.length}`);
    console.log(`📌 Version: ${VERSION}`);
    console.log(`📅 Generated: ${timestamp}`);
}

convertDatabase();
