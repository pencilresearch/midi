const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

/*
 CSV Format:
 manufacturer,device,section,parameter_name,parameter_description,cc_msb,cc_lsb,cc_min_value,cc_max_value,nrpn_msb,nrpn_lsb,nrpn_min_value,nrpn_max_value,orientation,notes,usage
 Example:
 Lofty,Trundler,Oscillators,Glide rate,"Adjusts the glide (portmanteau) time",5,,0,127,1,1,0,127,0-based,Default is zero.,
 Lofty,Trundler,Oscillators,Glide switch,Enables or disables glide.,65,,0,127,1,2,0,127,0-based,,0-63: Off; 64-127: On
 Lofty,Trundler,Oscillators,Note sync,Enables and disables Note Sync,81,,0,127,,,,,0-based,,0: Off; 1-127: On
 Lofty,Trundler,Amp,Pan,Pans between left to right channel,10,,0,127,30,0,0,127,Centered,Left…Centered…Right,0~127: Pan amount
 
  JSON Format:
    {
    "brand": {
      "device": {
        "midi_thru": true|false|"", 
        "midi_in": "TRS|DIN|USB|...|"",
        "midi_clock": true|false|"",
        "phantom_power": "None|Required|Optional|...|"",
        "midi_channel": {
          "instructions": "Step by step instructions for setting MIDI channel... or empty string"
        },

        "instructions": "General device instructions or empty string",
        "cc": [
          {
            "name": "Parameter Name",
            "description": "Detailed description or empty string",
            "usage" : "Further Details or empty string",
            "curve": "Toggle|0-based|1-based|Centered",
            "value": 0,
            "min": 0,
            "max": 127,
            "type": "Parameter|System|Scene......",
          },
          {
            "name": "Another Parameter",
            "description": "Detailed description or empty string",
            "usage" : "Further Details or empty string",
            "curve": "Toggle|0-based|1-based|Centered",
            "value": 1,
            "min": 0,
            "max": 127,
            "type": "Parameter|System|Scene......",
          }
        ],
        "nrpn": [
          {
            "name": "NRPN Parameter Name",
            "description": "Detailed description or empty string",
            "usage" : "Further Details or empty string",
            "curve": "Toggle|0-based|1-based|Centered",
            "msb": 99,
            "lsb": 98,
            "min": 0,
            "max": 16383,
            "type": "Parameter|System|Scene......",
          },
          {
            "name": "Another NRPN Parameter",
            "description": "Detailed description or empty string",
            "usage" : "Further Details or empty string",
            "curve": "Toggle|0-based|1-based|Centered",
            "msb": 99,
            "lsb": 99,
            "min": 0,
            "max": 16383,
            "type": "Parameter|System|Scene......",
          }
        ],
        "pc": [
          {
            "name": "Parameter Name",
            "description": "Detailed description or empty string",
            "usage" : "Further Details or empty string",
            "curve": "Toggle|0-based|1-based|Centered",
            "value": 0,
            "min": 0,
            "max": 127,
            "type": "Parameter|System|Scene......",
          },
          {
            "name": "Another Parameter",
            "description": "Detailed description or empty string",
            "usage" : "Further Details or empty string",
            "value": 1,
            "min": 0,
            "max": 127,
            "type": "Parameter|System|Scene......",
          }
        ],
      },
      "another_device": {
        // Same structure as above for each device
      }
    },
    "another_brand_": {
      // Same structure as above for each brand
    }
  }

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
                    const manufacturer = deviceData[0].manufacturer.toLowerCase().replace(/\s+/g, '_');
                    const deviceName = deviceData[0].device.toLowerCase().replace(/\s+/g, '_');
                    
                    // Create manufacturer node if it doesn't exist
                    if (!database[manufacturer]) {
                        database[manufacturer] = {};
                    }
                    
                    // Create device node if it doesn't exist
                    if (!database[manufacturer][deviceName]) {
                        database[manufacturer][deviceName] = {
                            brand: deviceData[0].manufacturer,
                            device: deviceData[0].device,
                            midi_thru: "", 
                            midi_in: "",
                            midi_clock: "",
                            phantom_power: "",
                            midi_channel: {
                                instructions: ""
                            },
                            instructions: "",
                            cc: [],
                            nrpn: [],
                            pc: []
                        };
                    }
                    
                    // Process parameters
                    deviceData.forEach(param => {
                        // Process CC parameters
                        if (param.cc.msb !== null) {
                            database[manufacturer][deviceName].cc.push({
                                name: param.name,
                                description: param.description || "",
                                usage: param.usage || "",
                                curve: param.orientation || "0-based",
                                value: param.cc.msb,
                                min: param.cc.min,
                                max: param.cc.max,
                                type: param.section || "Parameter",
                            });
                        }
                        
                        // Process NRPN parameters
                        if (param.nrpn.msb !== null && param.nrpn.lsb !== null) {
                            database[manufacturer][deviceName].nrpn.push({
                                name: param.name,
                                description: param.description || "",
                                usage: param.usage || "",
                                curve: param.orientation || "0-based",
                                msb: param.nrpn.msb,
                                lsb: param.nrpn.lsb,
                                min: param.nrpn.min,
                                max: param.nrpn.max,
                                type: param.section || "Parameter",
                            });
                        }
                    });
                }
            } catch (error) {
                console.error(`❌ Error processing ${file}:`, error);
            }
        });
    });

    // Write the database in the new format
    const jsonFile = path.join(outputDir, `midi-database-v${VERSION}.json`);
    const gzipFile = jsonFile + '.gz';
    const versionFile = path.join(outputDir, 'midi-database-version.json');

    fs.writeFileSync(versionFile, JSON.stringify({ 
        version: VERSION, 
        lastUpdated: timestamp, 
        filename: path.basename(gzipFile) 
    }, null, 2));
    
    const minified = JSON.stringify(database);
    fs.writeFileSync(jsonFile, minified);
    fs.writeFileSync(gzipFile, zlib.gzipSync(minified));

    console.log(`\n✅ Database saved to ${outputDir}`);
    console.log(`- ${path.basename(versionFile)}`);
    console.log(`- ${path.basename(jsonFile)}`);
    console.log(`- ${path.basename(gzipFile)}`);
    
    // Count manufacturers and devices for summary
    const manufacturers = Object.keys(database);
    let deviceCount = 0;
    manufacturers.forEach(mfr => {
        deviceCount += Object.keys(database[mfr]).length;
    });

    console.log('\n✅ Conversion complete!');
    console.log(`📂 Manufacturers: ${manufacturers.length}`);
    console.log(`📂 Devices: ${deviceCount}`);
    console.log(`📌 Version: ${VERSION}`);
    console.log(`📅 Generated: ${timestamp}`);
}
convertDatabase();
