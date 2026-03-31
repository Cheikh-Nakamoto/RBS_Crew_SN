import { execSync } from 'child_process';

const SCRIPTS = [
  { name: 'Produits (Shop)',         file: 'extract-products.ts'  },
  { name: 'Artistes (RBS Crew)',     file: 'extract-artists.ts'   },
  { name: 'Projets',                 file: 'extract-projects.ts'  },
  { name: 'Festival Last Wall Tour', file: 'extract-festival.ts'  },
  { name: 'Revue de Presse',         file: 'extract-press.ts'     },
];

for (const script of SCRIPTS) {
  console.log(`\n${'─'.repeat(50)}\n▶ ${script.name}\n${'─'.repeat(50)}`);
  try {
    execSync(`npx tsx ${script.file}`, { stdio: 'inherit', cwd: __dirname });
  } catch {
    console.error(`❌ Échec dans ${script.file}`);
    process.exit(1);
  }
}

console.log('\n✅ Migration complète terminée.');
