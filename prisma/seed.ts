import { db, SOURCE_CATALOG } from '@techpulse/db';
import { CATEGORIES, BD_CATEGORIES } from '@techpulse/shared';
export async function seed() {
  for (const [alias,name,shortName] of BD_CATEGORIES) await db.category.upsert({where:{slug:`bd-${alias}`},update:{name,shortName,scope:'BANGLADESH'},create:{slug:`bd-${alias}`,name,shortName,scope:'BANGLADESH'}});
  for (const [slug,name,shortName] of CATEGORIES) await db.category.upsert({where:{slug},update:{name,shortName},create:{slug,name,shortName}});
  for (const source of SOURCE_CATALOG) await db.newsSource.upsert({where:{slug:source.slug},update:{name:source.name,feedUrl:source.feedUrl},create:source});
}
seed().then(()=>db.$disconnect()).catch(async e=>{ console.error(e.message); await db.$disconnect(); process.exitCode=1; });
