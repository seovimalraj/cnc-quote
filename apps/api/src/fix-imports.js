#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Fix import paths after Phase 7 reorganization
const fixes = [
  // Core infrastructure moved to lib/
  { from: "../../core/supabase/supabase.module", to: "../../lib/supabase/supabase.module" },
  { from: "../../core/supabase/supabase.service", to: "../../lib/supabase/supabase.service" },
  { from: "../../core/cache/cache.module", to: "../../lib/cache/cache.module" },
  { from: "../../core/cache/cache.service", to: "../../lib/cache/cache.service" },
  { from: "../../../core/supabase/supabase.module", to: "../../../lib/supabase/supabase.module" },
  { from: "../../../core/supabase/supabase.service", to: "../../../lib/supabase/supabase.service" },
  
  // Auth moved to modules/auth/
  { from: "../../core/auth/auth/", to: "../../modules/auth/" },
  { from: "../../../core/auth/auth/", to: "../../../modules/auth/" },
  { from: "'../auth/", to: "'../modules/auth/" },
  
  // Legacy paths that reference old locations
  { from: "'../../audit/", to: "'../../modules/audit-legacy/" },
  { from: "'../audit/", to: "'../modules/audit-legacy/" },
  { from: "'../finishes/", to: "'../modules/finishes/" },
  { from: "../finishes/finishes", to: "../modules/finishes/finishes" },
  
  // Pricing paths
  { from: "'./legacy/pricing-v1", to: "'../../pricing" },
  { from: "'../legacy/pricing-v1", to: "'../../pricing" },
  { from: "../legacy/pricing-v1-core", to: "../pricing-core" },
  { from: "'../legacy/pricing-v1-core", to: "'../pricing-core" },
  
  // Audit legacy paths (quotes-legacy trying to reach audit-legacy at same level)
  { from: "'../audit-legacy/", to: "'../../modules/audit-legacy/" },
  { from: "'../analytics/", to: "'../../modules/analytics/" },
  
  // Lib paths from deeper folders
  { from: "'../../lib/supabase/supabase.service'", to: "'../../../lib/supabase/supabase.service'" },
  { from: "'../../lib/supabase/supabase.module'", to: "'../../../lib/supabase/supabase.module'" },
  { from: "'../../lib/cache/cache.service'", to: "'../../../lib/cache/cache.service'" },
  { from: "'../../lib/cache/cache.module'", to: "'../../../lib/cache/cache.module'" },
];

function fixImportsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;
    
    for (const fix of fixes) {
      if (content.includes(fix.from)) {
        const regex = new RegExp(fix.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        content = content.replace(regex, fix.to);
        updated = true;
      }
    }
    
    if (updated) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ Fixed: ${filePath}`);
      return 1;
    }
    return 0;
  } catch (error) {
    console.error(`✗ Error fixing ${filePath}:`, error.message);
    return 0;
  }
}

function walkDirectory(dir, callback) {
  try {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      
      try {
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          if (!['node_modules', 'dist', 'build', '.git'].includes(file)) {
            walkDirectory(filePath, callback);
          }
        } else if (stat.isFile() && (file.endsWith('.ts') || file.endsWith('.js')) && !file.endsWith('.d.ts')) {
          callback(filePath);
        }
      } catch (error) {
        // Skip broken symlinks
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error.message);
  }
}

console.log('🔧 Fixing import paths after Phase 7 reorganization...\n');

const srcDir = path.join(__dirname);
let filesFixed = 0;

walkDirectory(srcDir, (filePath) => {
  filesFixed += fixImportsInFile(filePath);
});

console.log(`\n✅ Fixed ${filesFixed} files!`);
