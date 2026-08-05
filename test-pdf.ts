import { DataSource, Between } from 'typeorm';

async function main() {
  const ds = new DataSource({
    type: 'postgres',
    host: 'postgres',
    port: 5432,
    username: 'postgres',
    password: 'postgres',
    database: 'nest_api',
    entities: [],
  });
  await ds.initialize();

  const startDate = new Date(2026, 6, 1);
  const endDate = new Date(2026, 7, 0);

  const transactions = await ds.query(
    `SELECT t.*, c.name as "categoryName" FROM transactions t LEFT JOIN categories c ON t."categoryId" = c.id WHERE t.date >= $1 AND t.date <= $2 ORDER BY t.date ASC`,
    [startDate, endDate]
  );
  console.log('Transactions found:', transactions.length);

  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument({ margin: 50 });

  const buffer: Buffer = await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err: Error) => reject(err));

    doc.fontSize(20).text('Relatorio Mensal', { align: 'center' });
    doc.fontSize(14).text('7/2026', { align: 'center' });
    doc.moveDown(2);
    doc.fontSize(16).text('Resumo');
    doc.fontSize(12);
    doc.text(`Transacoes: ${transactions.length}`);
    doc.end();
  });

  console.log('PDF generated, size:', buffer.length);
  await ds.destroy();
  process.exit(0);
}

main().catch((e) => { console.error('ERROR:', e); process.exit(1); });
